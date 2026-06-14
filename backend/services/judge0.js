const PISTON_URL = 'https://emkc.org/api/v2/piston/execute';

const LANGUAGE_MAP = {
  71: { language: 'python', version: '3.10.0' },
  50: { language: 'c', version: '10.2.0' },
  54: { language: 'c++', version: '10.2.0' },
  62: { language: 'java', version: '15.0.2' },
  63: { language: 'javascript', version: '18.15.0' },
  75: { language: 'c', version: '10.2.0' }
};

function normalizeOutput(output) {
  if (!output) return '';
  return output.toString().trim().replace(/\r\n/g, '\n').trim();
}

async function executeCode({ source_code, language_id, stdin = '' }) {
  const runtime = LANGUAGE_MAP[parseInt(language_id, 10)];
  if (!runtime) throw new Error(`Unsupported language_id: ${language_id}`);

  const response = await fetch(PISTON_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      language: runtime.language,
      version: runtime.version,
      files: [{ content: source_code }],
      stdin: stdin || ''
    })
  });

  if (!response.ok) {
    throw new Error(`Piston API error: ${response.status}`);
  }

  const data = await response.json();
  const run = data.run || {};
  const compile = data.compile || {};

  const hasCompileError = compile.code !== undefined && 
                          compile.code !== 0 && 
                          compile.stderr;
  const hasRuntimeError = run.code !== undefined && run.code !== 0;

  return {
    status: {
      id: hasCompileError ? 6 : hasRuntimeError ? 11 : 3,
      description: hasCompileError ? 'Compilation Error'
                 : hasRuntimeError ? 'Runtime Error'
                 : 'Accepted'
    },
    stdout: run.stdout || '',
    stderr: run.stderr || '',
    compile_output: compile.stderr || '',
    time: null,
    memory: null
  };
}

async function executeBatch(submissions) {
  const results = await Promise.all(
    submissions.map(s => executeCode(s).catch(err => ({
      status: { id: 13, description: 'Internal Error' },
      stdout: '',
      stderr: err.message,
      compile_output: '',
      time: null,
      memory: null
    })))
  );
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
