const express = require('express');
const { problems } = require('../data/store');

const router = express.Router();

router.get('/', (req, res) => {
  const problemList = problems.map((problem) => ({
    id: problem.id,
    title: problem.title,
    difficulty: problem.difficulty,
  }));
  res.json(problemList);
});

router.get('/:id', (req, res) => {
  const problem = problems.find((item) => String(item.id) === req.params.id);
  if (!problem) {
    return res.status(404).json({ error: 'Problem not found' });
  }
  res.json(problem);
});

module.exports = router;
