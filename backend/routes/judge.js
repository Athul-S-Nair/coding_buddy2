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
    const { source_code, language_id, stdin = '' } = req.body;

    if (!source_code) {
      return res.status(400).json({ error: 'source_code is required' });
    }

    if (!language_id) {
      return res.status(400).json({ error: 'language_id is required' });
    }

    const result = await executeCode(source_code, language_id, stdin);
    res.json(formatExecutionResult(result));
  } catch (error) {
    console.error('Run code error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    });
  }
});

router.get('/submissions/:token', async (req, res) => {
  try {
    const { pollSubmission, formatExecutionResult } = require('../services/judge0');
    const result = await pollSubmission(req.params.token);
    res.json(formatExecutionResult(result));
  } catch (error) {
    console.error('Get submission error:', error);
    res.status(500).json({ error: error.message });
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
      const evaluation = evaluateTestResult(result, testCase);

      return {
        testCase: index + 1,
        input: testCase.input,
        expectedOutput: testCase.expectedOutput,
        ...evaluation,
      };
    });

    const allPassed = results.every((result) => result.passed);

    res.json({
      problem_id,
      overallStatus: allPassed ? 'Accepted' : 'Wrong Answer',
      totalTestCases: problem.testCases.length,
      passedTestCases: results.filter((result) => result.passed).length,
      testResults: results,
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
