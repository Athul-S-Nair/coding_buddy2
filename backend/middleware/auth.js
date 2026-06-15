const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_coding_buddy_key';

function getTokenFromCookieHeader(cookieHeader) {
  if (!cookieHeader) return null;

  const cookies = cookieHeader.split(';').map((part) => part.trim());
  const tokenCookie = cookies.find((cookie) => cookie.startsWith('token='));
  if (!tokenCookie) return null;

  return decodeURIComponent(tokenCookie.substring('token='.length));
}

function getTokenFromRequest(req) {
  // Prefer the Authorization: Bearer header (works cross-origin where
  // third-party cookies are blocked), then fall back to the cookie.
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice('Bearer '.length).trim();
  }
  return getTokenFromCookieHeader(req.headers.cookie);
}

function getCurrentUser(req) {
  if (!JWT_SECRET) {
    return { error: 'JWT_SECRET is not configured', status: 500 };
  }

  const token = getTokenFromRequest(req);
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
  getTokenFromRequest,
  getCurrentUser,
};
