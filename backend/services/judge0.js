const PISTON_URL = process.env.PISTON_URL || 'https://emkc.org/api/v2/piston/execute';

const LANGUAGE_MAP = {
  71: { language: 'python', version: '3.10.0' },
  50: { language: 'c', version: '10.2.0' },
  54: { language: 'c++', version: '10.2.0' },
  62: { language: 'java', version: '15.0.2' },
  63: { language: 'javascript', version: '18.15.0' },
  75: { language: 'c', version: '10.2.0' }
};

async function executeCode(arg, language_id, stdin = '') {
  let source_code;
  if (typeof arg === 'object' && arg !== null && !Array.isArray(arg)) {
    source_code = arg.source_code;
    language_id = arg.language_id;
    stdin = arg.stdin || '';
  } else {
    source_code = arg;
  }

  const runtime = LANGUAGE_MAP[language_id];
  if (!runtime) throw new Error(`Unsupported language_id: ${language_id}`);

  const headers = { 'Content-Type': 'application/json' };
  if (process.env.PISTON_API_KEY) {
    headers['Authorization'] = process.env.PISTON_API_KEY.startsWith('Bearer ')
      ? process.env.PISTON_API_KEY
      : `Bearer ${process.env.PISTON_API_KEY}`;
  }

  const response = await fetch(PISTON_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      language: runtime.language,
      version: runtime.version,
      files: [{ content: source_code }],
      stdin
    })
  });

  const data = await response.json();
  const run = data.run || {};
  const compile = data.compile || {};

  const hasCompileError = compile.code !== 0 && compile.stderr;
  const hasRuntimeError = run.code !== 0;

  return {
    status: {
      id: hasCompileError ? 6 : hasRuntimeError ? 11 : 3,
      description: hasCompileError ? 'Compilation Error' 
                 : hasRuntimeError ? 'Runtime Error' 
                 : 'Accepted'
    },
    stdout: run.stdout || '',
    stderr: run.stderr || '',
    compile_output: compile.stderr || ''
  };
}

async function executeBatch(submissions) {
  const results = await Promise.all(
    submissions.map(s => executeCode(s))
  );
  return results;
}

function normalizeOutput(output) {
  if (!output) return '';
  return output.toString().trim().replace(/\r\n/g, '\n');
}

function evaluateTestResult(stdout, expectedOutput) {
  return normalizeOutput(stdout) === normalizeOutput(expectedOutput);
}

function formatExecutionResult(result, expectedOutput) {
  const passed = evaluateTestResult(result.stdout, expectedOutput);
  return {
    passed,
    stdout: result.stdout,
    stderr: result.stderr || result.compile_output,
    status: result.status
  };
}

module.exports = { 
  executeCode, executeBatch, 
  formatExecutionResult, evaluateTestResult, normalizeOutput 
};
