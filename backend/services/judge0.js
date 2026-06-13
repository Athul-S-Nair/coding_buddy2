const WANDBOX_URL = 'https://wandbox.org/api/compile.json';

const LANGUAGE_MAP = {
  71: { compiler: 'cpython-3.12.7' },
  50: { compiler: 'gcc-13.2.0-c' },
  54: { compiler: 'gcc-13.2.0' },
  62: { compiler: 'openjdk-jdk-21+35' },
  63: { compiler: 'nodejs-18.20.4' },
  75: { compiler: 'gcc-13.2.0-c' }
};

function normalizeOutput(output) {
  return (output || '').trim().split('\n')
    .map(line => line.trimEnd()).join('\n').trim();
}

async function executeCode({ source_code, language_id, stdin = '' }) {
  const runtime = LANGUAGE_MAP[parseInt(language_id, 10)];
  if (!runtime) throw new Error(`Unsupported language_id: ${language_id}`);

  const body = {
    compiler: runtime.compiler,
    code: source_code,
    stdin: stdin || ''
  };

  const response = await fetch(WANDBOX_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (!response.ok) throw new Error(`Wandbox error: ${response.status}`);

  const data = await response.json();

  const compileError = (data.compiler_error || '').trim();
  const stdout = data.program_output || '';
  const stderr = data.program_error || '';
  const exitCode = parseInt(data.status, 10);

  const hasCompileError = compileError.length > 0;
  const hasRuntimeError = !hasCompileError && exitCode !== 0;

  return {
    status: {
      id: hasCompileError ? 6 : hasRuntimeError ? 11 : 3,
      description: hasCompileError ? 'Compilation Error'
                 : hasRuntimeError ? 'Runtime Error'
                 : 'Accepted'
    },
    stdout,
    stderr,
    compile_output: compileError
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
