const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const DATA_DIR = path.join(__dirname, '..', 'data');
const PROGRESS_FILE = path.join(DATA_DIR, 'progress.json');
const PROBLEMS_FILE = path.join(DATA_DIR, 'problems.json');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

if (!fs.existsSync(PROGRESS_FILE)) {
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify({}));
}

const demoUsers = [
  { id: '1', username: 'admin', password: 'admin' },
  { id: '2', username: 'user1', password: 'pass1' },
  { id: '3', username: 'user2', password: 'pass2' },
];

const users = demoUsers.map((user) => {
  const isBcryptHash =
    typeof user.password === 'string' && user.password.startsWith('$2');
  return {
    ...user,
    password: isBcryptHash ? user.password : bcrypt.hashSync(user.password, 10),
  };
});

// Load any users registered in previous sessions (persisted to users.json)
function readRegisteredUsers() {
  try {
    if (fs.existsSync(USERS_FILE)) {
      return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    }
  } catch (error) {
    console.error('Error reading users file:', error);
  }
  return [];
}

readRegisteredUsers().forEach((u) => {
  if (u && u.username && !users.find((existing) => existing.username === u.username)) {
    users.push(u);
  }
});

function persistRegisteredUsers() {
  const demoUsernames = new Set(demoUsers.map((u) => u.username));
  const registered = users.filter((u) => !demoUsernames.has(u.username));
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(registered, null, 2));
  } catch (error) {
    console.error('Error writing users file:', error);
  }
}

// Create a new user. Returns { user } on success or { error } on failure.
function addUser({ username, password }) {
  const trimmed = (username || '').trim();
  if (users.find((u) => u.username.toLowerCase() === trimmed.toLowerCase())) {
    return { error: 'Username already taken' };
  }
  const newUser = {
    id: `u_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    username: trimmed,
    password: bcrypt.hashSync(password, 10),
  };
  users.push(newUser);
  persistRegisteredUsers();
  return { user: { id: newUser.id, username: newUser.username } };
}

let problems = [];
try {
  if (fs.existsSync(PROBLEMS_FILE)) {
    problems = JSON.parse(fs.readFileSync(PROBLEMS_FILE, 'utf8'));
  } else {
    console.warn('problems.json not found in data directory.');
  }
} catch (error) {
  console.error('Error loading problems.json:', error);
}

function readProgress() {
  try {
    return JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'));
  } catch (error) {
    console.error('Error reading progress file:', error);
    return {};
  }
}

function writeProgress(progressData) {
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progressData, null, 2));
}

module.exports = {
  users,
  problems,
  readProgress,
  writeProgress,
  addUser,
};
