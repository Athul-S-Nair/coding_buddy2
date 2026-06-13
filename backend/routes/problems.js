const express = require('express');
const { problems, writeProblems } = require('../data/store');

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

router.post('/', (req, res) => {
  const { title, difficulty, description, examples, constraints, testCases } = req.body;

  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'title is required' });
  }
  if (!['Easy', 'Medium', 'Hard'].includes(difficulty)) {
    return res.status(400).json({ error: 'difficulty must be Easy, Medium, or Hard' });
  }
  if (!description || !description.trim()) {
    return res.status(400).json({ error: 'description is required' });
  }
  if (!testCases || testCases.length === 0) {
    return res.status(400).json({ error: 'at least one testCase is required' });
  }

  const maxId = problems.reduce((max, p) => Math.max(max, parseInt(p.id) || 0), 0);
  const newId = String(maxId + 1);

  const newProblem = {
    id: newId,
    title: title.trim(),
    difficulty,
    description: description.trim(),
    examples: examples || [],
    constraints: constraints || [],
    testCases,
    concept: 'Arrays',
  };

  try {
    writeProblems(newProblem);
  } catch (err) {
    console.error('Error writing problems file:', err);
    return res.status(500).json({ error: 'Failed to save problem' });
  }

  res.status(201).json(newProblem);
});

module.exports = router;
