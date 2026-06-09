const JUDGE0_API_URL = process.env.JUDGE0_API_URL || 'https://ce.judge0.com';

const JUDGE0_HEADERS = {
  'Content-Type': 'application/json',
  Accept: 'application/json',
};

const RESULT_FIELDS =
  'stdout,stderr,compile_output,status,time,memory,message,token';

const IN_PROGRESS_STATUSES = new Set([1, 2]);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function normalizeOutput(output) {
  return (output || '')
    .trim()
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\n')
    .trim();
}

async function pollSubmission(token) {
  let delay = 250;
  const maxAttempts = 40;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (attempt > 0) {
      await sleep(delay);
      delay = Math.min(Math.round(delay * 1.5), 1000);
    }

    const response = await fetch(
      `${JUDGE0_API_URL}/submissions/${token}?base64_encoded=false&fields=${RESULT_FIELDS}`,
      { headers: { Accept: 'application/json' } }
    );

    if (!response.ok) {
      continue;
    }

    const result = await response.json();
    if (!IN_PROGRESS_STATUSES.has(result.status?.id)) {
      return result;
    }
  }

  throw new Error('Timeout waiting for execution result');
}

async function executeCode(source_code, language_id, stdin = '') {
  const submission = {
    source_code,
    language_id: parseInt(language_id, 10),
    stdin,
  };

  const syncUrl = `${JUDGE0_API_URL}/submissions?base64_encoded=false&wait=true&fields=${RESULT_FIELDS}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const syncResponse = await fetch(syncUrl, {
      method: 'POST',
      headers: JUDGE0_HEADERS,
      body: JSON.stringify(submission),
      signal: controller.signal,
    });

    if (syncResponse.ok) {
      return syncResponse.json();
    }
  } catch (error) {
    if (error.name !== 'AbortError') {
      throw error;
    }
  } finally {
    clearTimeout(timeoutId);
  }

  const submitResponse = await fetch(
    `${JUDGE0_API_URL}/submissions?base64_encoded=false&wait=false`,
    {
      method: 'POST',
      headers: JUDGE0_HEADERS,
      body: JSON.stringify(submission),
    }
  );

  if (!submitResponse.ok) {
    const error = await submitResponse.text();
    throw new Error(`Failed to submit code: ${error}`);
  }

  const { token } = await submitResponse.json();
  return pollSubmission(token);
}

async function pollBatch(tokens) {
  let delay = 250;
  const maxAttempts = 40;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (attempt > 0) {
      await sleep(delay);
      delay = Math.min(Math.round(delay * 1.5), 1000);
    }

    const response = await fetch(
      `${JUDGE0_API_URL}/submissions/batch?tokens=${tokens.join(',')}&base64_encoded=false&fields=${RESULT_FIELDS}`,
      { headers: { Accept: 'application/json' } }
    );

    if (!response.ok) {
      continue;
    }

    const results = await response.json();
    const submissions = Array.isArray(results) ? results : results.submissions || [];

    if (
      submissions.length === tokens.length &&
      submissions.every((result) => !IN_PROGRESS_STATUSES.has(result.status?.id))
    ) {
      return submissions;
    }
  }

  throw new Error('Timeout waiting for batch execution results');
}

async function executeBatch(submissions) {
  if (submissions.length === 0) {
    return [];
  }

  if (submissions.length === 1) {
    const single = submissions[0];
    const result = await executeCode(
      single.source_code,
      single.language_id,
      single.stdin || ''
    );
    return [result];
  }

  const batchResponse = await fetch(
    `${JUDGE0_API_URL}/submissions/batch?base64_encoded=false`,
    {
      method: 'POST',
      headers: JUDGE0_HEADERS,
      body: JSON.stringify({
        submissions: submissions.map((item) => ({
          source_code: item.source_code,
          language_id: parseInt(item.language_id, 10),
          stdin: item.stdin || '',
        })),
      }),
    }
  );

  if (!batchResponse.ok) {
    const error = await batchResponse.text();
    throw new Error(`Failed to submit batch: ${error}`);
  }

  const created = await batchResponse.json();
  const tokens = created.map((entry) => entry.token).filter(Boolean);

  if (tokens.length !== submissions.length) {
    throw new Error('Judge0 batch submission returned incomplete tokens');
  }

  return pollBatch(tokens);
}

function formatExecutionResult(result) {
  return {
    status: {
      id: result.status?.id,
      description: result.status?.description,
    },
    stdout: result.stdout || '',
    stderr: result.stderr || '',
    compile_output: result.compile_output || '',
    message: result.message || '',
    time: result.time,
    memory: result.memory,
    token: result.token,
  };
}

function evaluateTestResult(result, testCase) {
  if (result.status?.id !== 3) {
    return {
      passed: false,
      error: result.status?.description || 'Execution failed',
      stderr: result.stderr || '',
      compile_output: result.compile_output || '',
      actualOutput: result.stdout || '',
    };
  }

  const actualOutput = normalizeOutput(result.stdout);
  const expectedOutput = normalizeOutput(testCase.expectedOutput);
  const passed = actualOutput === expectedOutput;

  return {
    passed,
    actualOutput,
    expectedOutput: testCase.expectedOutput,
    time: result.time,
    memory: result.memory,
  };
}

module.exports = {
  JUDGE0_API_URL,
  executeCode,
  executeBatch,
  formatExecutionResult,
  evaluateTestResult,
  normalizeOutput,
  pollSubmission,
};
