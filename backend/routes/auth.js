const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { users, addUser } = require('../data/store');
const { JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

// Detect a deployed (cross-site) environment without relying on NODE_ENV
// being set manually. Render sets RENDER=true automatically; an https
// FRONTEND_URL also means the frontend is on a different secure origin.
// In that case the auth cookie MUST be SameSite=None; Secure or the browser
// will refuse to send it back from vercel.app to the API origin.
const isProduction =
  process.env.NODE_ENV === 'production' ||
  !!process.env.RENDER ||
  (process.env.FRONTEND_URL || '').startsWith('https://');

const cookieOptions = {
  httpOnly: true,
  sameSite: isProduction ? 'none' : 'lax',
  secure: isProduction,
  path: '/',
};

function issueToken(res, user) {
  const token = jwt.sign(
    { userId: user.id, username: user.username },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.cookie('token', token, cookieOptions);
}

router.post('/register', (req, res) => {
  const { username, password } = req.body;

  if (!JWT_SECRET) {
    return res.status(500).json({ error: 'JWT_SECRET is not configured' });
  }

  const trimmed = (username || '').trim();
  if (trimmed.length < 3 || (password || '').length < 3) {
    return res.status(400).json({
      error: 'Username and password must each be at least 3 characters',
    });
  }

  const result = addUser({ username: trimmed, password });
  if (result.error) {
    return res.status(409).json({ error: result.error });
  }

  issueToken(res, result.user);
  res.status(201).json(result.user);
});

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  const user = users.find((item) => item.username === username);

  if (!JWT_SECRET) {
    return res.status(500).json({ error: 'JWT_SECRET is not configured' });
  }

  if (!user || !bcrypt.compareSync(password || '', user.password)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  issueToken(res, user);

  res.json({ id: user.id, username: user.username });
});

router.post('/logout', (req, res) => {
  res.clearCookie('token', cookieOptions);
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
