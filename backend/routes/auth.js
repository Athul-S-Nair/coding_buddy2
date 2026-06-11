const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { users } = require('../data/store');
const { JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  const user = users.find((item) => item.username === username);

  if (!JWT_SECRET) {
    return res.status(500).json({ error: 'JWT_SECRET is not configured' });
  }

  if (!user || !bcrypt.compareSync(password || '', user.password)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign(
    { userId: user.id, username: user.username },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.cookie('token', token, {
    httpOnly: true,
    sameSite: 'strict',
  });

  res.json({ id: user.id, username: user.username });
});

router.post('/logout', (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    sameSite: 'strict',
  });
  res.json({ message: 'Logged out successfully' });
});

router.get('/me', (req, res) => {
  const { getCurrentUser } = require('../middleware/auth');
  const result = getCurrentUser(req);

  if (result.error) {
    return res.status(result.status).json({ error: result.error });
  }

  res.json(result.user);
});

module.exports = router;
