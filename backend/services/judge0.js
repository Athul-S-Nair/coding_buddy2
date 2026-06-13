const JUDGE0_URL = 'https://judge0-ce.p.rapidapi.com/submissions?base64_encoded=false&wait=true';

const SUPPORTED_LANGUAGES = new Set([50, 54, 62, 63, 71, 75]);

function normalizeOutput(output) {
  return (output || '').trim().split('\n')
    .map(line => line.trimEnd()).join('\n').trim();
}

async function executeCode({ source_code, language_id, stdin = '' }) {
  const apiKey = process.env.RAPIDAPI_KEY;
  if (!apiKey) throw new Error('RAPIDAPI_KEY environment variable is not set');

  const langId = parseInt(language_id, 10);
  if (!SUPPORTED_LANGUAGES.has(langId)) {
    throw new Error(`Unsupported language_id: ${language_id}`);
  }

  const response = await fetch(JUDGE0_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-RapidAPI-Key': apiKey,
      'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com'
    },
    body: JSON.stringify({ source_code, language_id: langId, stdin: stdin || '' })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Judge0 error ${response.status}: ${text}`);
  }

  const data = await response.json();

  return {
    status: data.status || { id: 11, description: 'Runtime Error' },
    stdout: data.stdout || '',
    stderr: data.stderr || '',
    compile_output: data.compile_output || ''
  };
}

async function executeBatch(submissions) {
  return Promise.all(submissions.map(s => executeCode(s)));
}

function formatExecutionResult(result) {
  return {
    status: result.status,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
    compile_output: result.compile_output || ''
  };
}

function evaluateTestResult(result, testCase) {
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
  const expectedOutput = normalizeOutput(
    testCase.expectedOutput || testCase.expected || ''
  );
  return {
    passed: actualOutput === expectedOutput,
    actualOutput,
    expectedOutput: testCase.expectedOutput || testCase.expected || ''
  };
}

module.exports = {
  executeCode, executeBatch,
  formatExecutionResult, evaluateTestResult, normalizeOutput
};
