const { execFile, spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const TIMEOUT_MS = 10000;

// language_id -> { ext, compile, run }
const LANGUAGES = {
  71: { ext: '.py',   compile: null,                         run: ['python3'] },
  63: { ext: '.js',   compile: null,                         run: ['node'] },
  50: { ext: '.c',    compile: (f, out) => ['gcc', [f, '-o', out]], run: null },
  75: { ext: '.c',    compile: (f, out) => ['gcc', [f, '-o', out]], run: null },
  54: { ext: '.cpp',  compile: (f, out) => ['g++', [f, '-o', out]], run: null },
  62: { ext: '.java', compile: (f, dir) => ['javac', ['-d', dir, f]], run: null },
};

function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'exec-'));
}

function cleanup(dir) {
  try { fs.rmSync(dir, { recursive: true, force: true }); } catch (_) {}
}

function runProcess(cmd, args, { stdin = '', cwd } = {}) {
  return new Promise((resolve) => {
    const proc = spawn(cmd, args, { cwd, stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', d => { stdout += d; });
    proc.stderr.on('data', d => { stderr += d; });

    const timer = setTimeout(() => {
      proc.kill('SIGKILL');
      resolve({ timedOut: true, stdout, stderr, code: null });
    }, TIMEOUT_MS);

    proc.on('close', (code) => {
      clearTimeout(timer);
      resolve({ timedOut: false, stdout, stderr, code });
    });

    if (stdin) proc.stdin.write(stdin);
    proc.stdin.end();
  });
}

function compileProcess(cmd, args, cwd) {
  return new Promise((resolve) => {
    execFile(cmd, args, { cwd, timeout: TIMEOUT_MS }, (err, stdout, stderr) => {
      resolve({ err, stdout: stdout || '', stderr: stderr || '' });
    });
  });
}

async function executeCode({ source_code, language_id, stdin = '' }) {
  const lang = LANGUAGES[parseInt(language_id, 10)];
  if (!lang) {
    return {
      status: { id: 6, description: 'Compile Error' },
      stdout: '',
      stderr: `Unsupported language_id: ${language_id}`,
      compile_output: '',
    };
  }

  const dir = makeTempDir();
  try {
    let srcFile;
    let className = null;

    if (parseInt(language_id, 10) === 62) {
      // Java: filename must match public class name
      const match = source_code.match(/public\s+class\s+(\w+)/);
      className = match ? match[1] : 'Main';
      srcFile = path.join(dir, `${className}.java`);
    } else {
      srcFile = path.join(dir, `code${lang.ext}`);
    }

    fs.writeFileSync(srcFile, source_code);

    // Compile step
    if (lang.compile) {
      const outBin = path.join(dir, 'output');
      const [cmd, args] = lang.compile(srcFile, parseInt(language_id, 10) === 62 ? dir : outBin);
      const { err, stderr } = await compileProcess(cmd, args, dir);
      if (err) {
        return {
          status: { id: 6, description: 'Compile Error' },
          stdout: '',
          stderr: '',
          compile_output: stderr || err.message,
        };
      }

      // Run compiled binary
      let runCmd, runArgs;
      if (parseInt(language_id, 10) === 62) {
        runCmd = 'java';
        runArgs = ['-cp', dir, className];
      } else {
        runCmd = outBin;
        runArgs = [];
      }

      const res = await runProcess(runCmd, runArgs, { stdin, cwd: dir });
      if (res.timedOut) {
        return { status: { id: 5, description: 'Time Limit Exceeded' }, stdout: res.stdout, stderr: res.stderr, compile_output: '' };
      }
      if (res.code !== 0) {
        return { status: { id: 11, description: 'Runtime Error' }, stdout: res.stdout, stderr: res.stderr, compile_output: '' };
      }
      return { status: { id: 3, description: 'Accepted' }, stdout: res.stdout, stderr: res.stderr, compile_output: '' };
    }

    // Interpreted
    const [interp, ...interpArgs] = lang.run;
    const res = await runProcess(interp, [...interpArgs, srcFile], { stdin, cwd: dir });
    if (res.timedOut) {
      return { status: { id: 5, description: 'Time Limit Exceeded' }, stdout: res.stdout, stderr: res.stderr, compile_output: '' };
    }
    if (res.code !== 0) {
      return { status: { id: 11, description: 'Runtime Error' }, stdout: res.stdout, stderr: res.stderr, compile_output: '' };
    }
    return { status: { id: 3, description: 'Accepted' }, stdout: res.stdout, stderr: res.stderr, compile_output: '' };

  } finally {
    cleanup(dir);
  }
}

async function executeBatch(submissions) {
  return Promise.all(submissions.map(s => executeCode(s)));
}

function normalizeOutput(output) {
  if (!output) return '';
  return output.toString().trim().replace(/\r\n/g, '\n').trim();
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
