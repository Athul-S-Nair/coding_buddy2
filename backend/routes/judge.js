const express = require('express');
const { problems } = require('../data/store');
const {
  executeCode,
  executeBatch,
  formatExecutionResult,
  evaluateTestResult,
} = require('../services/judge0');

const router = express.Router();

router.post('/run-code', async (req, res) => {
  try {
    const { source_code, language_id, problemId, stdin } = req.body;

    if (!source_code) {
      return res.status(400).json({ error: 'source_code is required' });
    }
    if (!language_id) {
      return res.status(400).json({ error: 'language_id is required' });
    }

    // Custom input mode
    if (stdin !== undefined && stdin !== '') {
      const result = await executeCode({ source_code, language_id, stdin });
      return res.json({
        custom: true,
        stdout: result.stdout,
        stderr: result.stderr,
        compile_output: result.compile_output,
        error: result.status?.id !== 3
          ? result.status?.description : null
      });
    }

    // Test case mode — run first 2 test cases
    const problem = problems.find(
      item => String(item.id) === String(problemId)
    );
    if (!problem) {
      return res.status(404).json({ error: 'Problem not found' });
    }

    const sampleCases = (problem.testCases || []).slice(0, 2);
    if (sampleCases.length === 0) {
      return res.status(400).json({ error: 'No test cases for this problem' });
    }

    const execResults = await Promise.all(
      sampleCases.map(tc =>
        executeCode({ source_code, language_id,
                      stdin: tc.input || '' })
      )
    );

    const results = execResults.map((result, i) => {
      const tc = sampleCases[i];
      const evaluation = evaluateTestResult(result, tc);
      return {
        input: tc.input,
        expected: tc.expectedOutput || tc.expected,
        actual: result.stdout,
        passed: evaluation.passed,
        error: evaluation.error || null,
        stderr: result.stderr,
        compile_output: result.compile_output
      };
    });

    return res.json({
      custom: false,
      results
    });

  } catch (error) {
    console.error('Run code error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

router.post('/submit', async (req, res) => {
  try {
    const { problem_id, source_code, language_id } = req.body;

    if (!problem_id || !source_code || !language_id) {
      return res.status(400).json({
        error: 'problem_id, source_code, and language_id are required',
      });
    }

    const problem = problems.find((item) => item.id === problem_id);
    if (!problem) {
      return res.status(404).json({ error: 'Problem not found' });
    }

    if (!problem.testCases || problem.testCases.length === 0) {
      return res.status(400).json({ error: 'No test cases available for this problem' });
    }

    const submissions = problem.testCases.map((testCase) => ({
      source_code,
      language_id,
      stdin: testCase.input,
    }));

    const batchResults = await executeBatch(submissions);

    const results = batchResults.map((result, index) => {
      const testCase = problem.testCases[index];
      const formatted = formatExecutionResult(result, testCase.expectedOutput);

      return {
        testCase: index + 1,
        input: testCase.input,
        expectedOutput: testCase.expectedOutput,
        actualOutput: formatted.stdout,
        passed: formatted.passed,
        stderr: formatted.stderr,
        compile_output: result.compile_output || '',
        error: formatted.passed ? null : (formatted.status?.description || 'Wrong Answer'),
      };
    });

    const allPassed = results.every((result) => result.passed);
    const passedCount = results.filter((result) => result.passed).length;
    const totalCount = results.length;
    const headerLabel = `Submission Results (${passedCount}/${totalCount} test cases passed)`;

    res.json({
      problem_id,
      overallStatus: allPassed ? 'Accepted' : 'Wrong Answer',
      totalTestCases: problem.testCases.length,
      passedTestCases: passedCount,
      testResults: results,
      headerLabel,
      resultsPanelHeader: headerLabel,
      results_panel_header: headerLabel,
      header: headerLabel
    });
  } catch (error) {
    console.error('Submit error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    });
  }
});

module.exports = router;

