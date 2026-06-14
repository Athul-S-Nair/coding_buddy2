const axios = require('axios');

const JUDGE0_URL = process.env.JUDGE0_API_URL || 'http://localhost:2358';
const JUDGE0_API_KEY = process.env.JUDGE0_API_KEY || '';

function getHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  if (JUDGE0_API_KEY) {
    headers['X-Auth-Token'] = JUDGE0_API_KEY;
  }
  return headers;
}

function normalizeOutput(output) {
  if (!output) return '';
  return output.toString().trim().replace(/\r\n/g, '\n').trim();
}

async function executeCode({ source_code, language_id, stdin = '' }) {
  // Step 1: Submit to Judge0 and get a token
  const submitResponse = await axios.post(
    `${JUDGE0_URL}/submissions?base64_encoded=false&wait=false`,
    {
      source_code,
      language_id: parseInt(language_id, 10),
      stdin: stdin || '',
    },
    { headers: getHeaders() }
  );

  const token = submitResponse.data.token;
  if (!token) {
    throw new Error('No token returned from Judge0');
  }

  // Step 2: Poll until done (status id 1=queued, 2=processing)
  let attempts = 0;
  const maxAttempts = 20;
  
  while (attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const resultResponse = await axios.get(
      `${JUDGE0_URL}/submissions/${token}?base64_encoded=false`,
      { headers: getHeaders() }
    );

    const data = resultResponse.data;
    
    // Status 1 = In Queue, 2 = Processing — keep waiting
    if (data.status?.id === 1 || data.status?.id === 2) {
      attempts++;
      continue;
    }

    // Any other status means done
    return {
      status: {
        id: data.status?.id,
        description: data.status?.description
      },
      stdout: data.stdout || '',
      stderr: data.stderr || '',
      compile_output: data.compile_output || '',
      time: data.time,
      memory: data.memory
    };
  }

  throw new Error('Judge0 execution timed out after 10 seconds');
}

async function executeBatch(submissions) {
  // Step 1: Submit all at once using Judge0 batch endpoint
  const batchPayload = {
    submissions: submissions.map(s => ({
      source_code: s.source_code,
      language_id: parseInt(s.language_id, 10),
      stdin: s.stdin || ''
    }))
  };

  const submitResponse = await axios.post(
    `${JUDGE0_URL}/submissions/batch?base64_encoded=false`,
    batchPayload,
    { headers: getHeaders() }
  );

  const tokens = submitResponse.data.map(t => t.token);

  // Step 2: Poll until ALL are done
  let attempts = 0;
  const maxAttempts = 20;

  while (attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 500));

    const tokenString = tokens.join(',');
    const resultsResponse = await axios.get(
      `${JUDGE0_URL}/submissions/batch?tokens=${tokenString}&base64_encoded=false`,
      { headers: getHeaders() }
    );

    const results = resultsResponse.data.submissions;
    const allDone = results.every(r => r.status?.id !== 1 && r.status?.id !== 2);

    if (allDone) {
      return results.map(data => ({
        status: {
          id: data.status?.id,
          description: data.status?.description
        },
        stdout: data.stdout || '',
        stderr: data.stderr || '',
        compile_output: data.compile_output || '',
        time: data.time,
        memory: data.memory
      }));
    }

    attempts++;
  }

  throw new Error('Judge0 batch execution timed out');
}

function evaluateTestResult(result, testCase) {
  const expectedOutput = testCase.expectedOutput || testCase.expected || '';
  
  if (result.status?.id !== 3) {
    return {
      passed: false,
      error: result.status?.description || 'Execution failed',
      stderr: result.stderr || '',
      compile_output: result.compile_output || '',
      actualOutput: result.stdout || ''
    };
  }

  const actualOutput = normalizeOutput(result.stdout);
  const expected = normalizeOutput(expectedOutput);

  return {
    passed: actualOutput === expected,
    actualOutput,
    expectedOutput: expectedOutput,
    error: null
  };
}

function formatExecutionResult(result, expectedOutput) {
  if (!expectedOutput) {
    return {
      passed: result.status?.id === 3,
      stdout: result.stdout || '',
      stderr: result.stderr || result.compile_output || '',
      status: result.status
    };
  }
  const evaluation = evaluateTestResult(result, { expectedOutput });
  return {
    passed: evaluation.passed,
    stdout: result.stdout || '',
    stderr: result.stderr || result.compile_output || '',
    status: result.status
  };
}

module.exports = {
  executeCode,
  executeBatch,
  formatExecutionResult,
  evaluateTestResult,
  normalizeOutput
};
