const JUDGE0_URL = process.env.JUDGE0_API_URL || 'https://ce.judge0.com';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function normalizeOutput(output) {
  if (!output) return '';
  return output.toString().trim().replace(/\r\n/g, '\n').trim();
}

function encodeBase64(str) {
  return Buffer.from(str || '').toString('base64');
}

function decodeBase64(str) {
  if (!str) return '';
  return Buffer.from(str, 'base64').toString('utf-8');
}

async function executeCode({ source_code, language_id, stdin = '' }) {
  const url = `${JUDGE0_URL}/submissions?base64_encoded=true&wait=true`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      source_code: encodeBase64(source_code),
      language_id: parseInt(language_id, 10),
      stdin: encodeBase64(stdin)
    })
  });

  if (!response.ok) {
    throw new Error(`Judge0 API error: ${response.status}`);
  }

  const data = await response.json();

  return {
    status: data.status || { id: 13, description: 'Internal Error' },
    stdout: decodeBase64(data.stdout),
    stderr: decodeBase64(data.stderr),
    compile_output: decodeBase64(data.compile_output),
    time: data.time !== undefined ? data.time : null,
    memory: data.memory !== undefined ? data.memory : null
  };
}

async function executeBatch(submissions) {
  const results = [];
  for (let i = 0; i < submissions.length; i++) {
    if (i > 0) {
      await sleep(600);
    }
    try {
      const res = await executeCode(submissions[i]);
      results.push(res);
    } catch (err) {
      results.push({
        status: { id: 13, description: 'Internal Error' },
        stdout: '',
        stderr: err.message,
        compile_output: '',
        time: null,
        memory: null
      });
    }
  }
  return results;
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
    expectedOutput,
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
