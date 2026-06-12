const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_coding_buddy_key';

function getTokenFromCookieHeader(cookieHeader) {
  if (!cookieHeader) return null;

  const cookies = cookieHeader.split(';').map((part) => part.trim());
  const tokenCookie = cookies.find((cookie) => cookie.startsWith('token='));
  if (!tokenCookie) return null;

  return decodeURIComponent(tokenCookie.substring('token='.length));
}

function getCurrentUser(req) {
  if (!JWT_SECRET) {
    return { error: 'JWT_SECRET is not configured', status: 500 };
  }

  const token = getTokenFromCookieHeader(req.headers.cookie);
  if (!token) {
    return { error: 'Not authenticated', status: 401 };
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return {
      user: { id: decoded.userId, username: decoded.username },
    };
  } catch (error) {
    return { error: 'Not authenticated', status: 401 };
  }
}

module.exports = {
  JWT_SECRET,
  getTokenFromCookieHeader,
  getCurrentUser,
};
