const express = require('express');
const { readProgress, writeProgress } = require('../data/store');

const router = express.Router();

router.post('/solve', (req, res) => {
  const { userId, problemId, language, timeTaken } = req.body;

  if (!userId || !problemId || !language) {
    return res.status(400).json({
      error: 'userId, problemId, and language are required',
    });
  }

  const progressData = readProgress();

  if (!progressData[userId]) {
    progressData[userId] = { solves: [] };
  }

  const userProgress = progressData[userId];
  const alreadySolved = userProgress.solves.some(
    (solve) => solve.problemId === problemId
  );

  if (!alreadySolved) {
    userProgress.solves.push({
      problemId,
      language,
      timeTaken: timeTaken || 0,
      timestamp: new Date().toISOString(),
    });

    try {
      writeProgress(progressData);
    } catch (error) {
      console.error('Error writing progress file:', error);
      return res.status(500).json({ error: 'Failed to save progress' });
    }
  }

  res.json({ success: true, message: 'Progress updated', alreadySolved });
});

router.get('/:userId', (req, res) => {
  const { userId } = req.params;
  const progressData = readProgress();
  const userProgress = progressData[userId] || { solves: [] };

  const solvedProblems = userProgress.solves.map((solve) => solve.problemId);
  const totalSolved = solvedProblems.length;

  let streak = 0;
  if (userProgress.solves.length > 0) {
    const sortedSolves = [...userProgress.solves].sort(
      (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
    );

    const uniqueDates = Array.from(
      new Set(
        sortedSolves.map(
          (solve) => new Date(solve.timestamp).toISOString().split('T')[0]
        )
      )
    );

    const todayStr = new Date().toISOString().split('T')[0];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    let currentDateStr = todayStr;

    if (uniqueDates.includes(todayStr) || uniqueDates.includes(yesterdayStr)) {
      if (!uniqueDates.includes(todayStr)) {
        currentDateStr = yesterdayStr;
      }

      let currentCheckDate = new Date(currentDateStr);

      for (const dateStr of uniqueDates) {
        if (dateStr === currentCheckDate.toISOString().split('T')[0]) {
          streak += 1;
          currentCheckDate.setDate(currentCheckDate.getDate() - 1);
        } else if (new Date(dateStr) < currentCheckDate) {
          break;
        }
      }
    }
  }

  res.json({
    solvedProblems,
    totalSolved,
    streak,
  });
});

module.exports = router;
