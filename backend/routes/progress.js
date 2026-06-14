const express = require('express');
const { readProgress, writeProgress, problems } = require('../data/store');

const router = express.Router();

router.post('/solve', (req, res) => {
  const { userId, problemId, language, timeTaken, askedTutor } = req.body;

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
      askedTutor: !!askedTutor,
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

  const cleanSolvesCount = userProgress.solves.filter((solve) => !solve.askedTutor).length;

  const solveHistory = userProgress.solves.map((solve) => {
    const prob = problems.find((p) => p.id === solve.problemId);
    return {
      problemId: solve.problemId,
      title: prob ? prob.title : 'Unknown Problem',
      difficulty: prob ? prob.difficulty : 'Easy',
      concept: prob ? prob.concept : 'Arrays',
      solvedAt: solve.timestamp,
      askedTutor: !!solve.askedTutor,
      language: solve.language || 'python',
      timeTaken: solve.timeTaken || 0,
    };
  });

  const conceptMastery = {};
  const conceptsList = [
    "Arrays", "Two Pointers", "Hash Maps", "Sliding Window", "Linked Lists",
    "Strings", "Dynamic Programming", "Trees", "Graphs", "Recursion",
    "Binary Search", "Stacks & Queues"
  ];
  conceptsList.forEach(c => conceptMastery[c] = 0);

  userProgress.solves.forEach((solve) => {
    const prob = problems.find((p) => p.id === solve.problemId);
    if (prob && prob.concept) {
      conceptMastery[prob.concept] = (conceptMastery[prob.concept] || 0) + 1;
    }
  });

  // Auto-award basic achievements and update XP
  if (!userProgress.achievements) {
    userProgress.achievements = [];
  }
  if (userProgress.xp === undefined) {
    userProgress.xp = 0;
  }

  let updated = false;
  if (totalSolved >= 5 && !userProgress.achievements.includes('Code Warrior')) {
    userProgress.achievements.push('Code Warrior');
    userProgress.xp += 50;
    updated = true;
  }
  if (streak >= 3 && !userProgress.achievements.includes('Streak Master')) {
    userProgress.achievements.push('Streak Master');
    userProgress.xp += 50;
    updated = true;
  }
  if (cleanSolvesCount >= 3 && !userProgress.achievements.includes('Clean Slate')) {
    userProgress.achievements.push('Clean Slate');
    userProgress.xp += 50;
    updated = true;
  }

  if (updated) {
    try {
      writeProgress(progressData);
    } catch (error) {
      console.error('Error writing auto-awarded achievements:', error);
    }
  }

  res.json({
    solvedProblems,
    totalSolved,
    streak,
    cleanSolvesCount,
    solveHistory,
    conceptMastery,
    xp: userProgress.xp || 0,
    achievements: userProgress.achievements || [],
  });
});

router.post('/achievement', (req, res) => {
  const { userId, achievement, xpBonus } = req.body;

  if (!userId || !achievement) {
    return res.status(400).json({
      error: 'userId and achievement are required',
    });
  }

  const progressData = readProgress();

  if (!progressData[userId]) {
    progressData[userId] = { solves: [], achievements: [], xp: 0 };
  }

  const userProgress = progressData[userId];
  if (!userProgress.achievements) {
    userProgress.achievements = [];
  }
  if (userProgress.xp === undefined) {
    userProgress.xp = 0;
  }

  const alreadyUnlocked = userProgress.achievements.includes(achievement);

  if (!alreadyUnlocked) {
    userProgress.achievements.push(achievement);
    userProgress.xp += (xpBonus || 0);

    try {
      writeProgress(progressData);
    } catch (error) {
      console.error('Error writing progress file:', error);
      return res.status(500).json({ error: 'Failed to save progress' });
    }
  }

  res.json({
    success: true,
    message: 'Achievement updated',
    alreadyUnlocked,
    xp: userProgress.xp,
    achievements: userProgress.achievements,
  });
});

module.exports = router;
