require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { JUDGE0_API_URL } = require('./services/judge0');

const problemsRouter = require('./routes/problems');
const authRouter = require('./routes/auth');
const progressRouter = require('./routes/progress');
const judgeRouter = require('./routes/judge');
const aiRouter = require('./routes/ai');

// Populate missing concepts dynamically
const { problems } = require('./data/store');
problems.forEach(p => {
  if (!p.concept) {
    const conceptMap = {
      "1": "Arrays",
      "2": "Arrays",
      "3": "Arrays",
      "4": "Hash Maps",
      "5": "Strings",
      "6": "Two Pointers",
      "7": "Arrays",
      "8": "Recursion",
      "9": "Binary Search",
      "10": "Stacks & Queues",
      "11": "Arrays",
      "12": "Dynamic Programming",
      "13": "Sliding Window",
      "14": "Linked Lists",
      "15": "Two Pointers",
      "16": "Sliding Window",
      "17": "Arrays",
      "18": "Hash Maps",
      "19": "Recursion"
    };
    p.concept = conceptMap[p.id] || "Arrays";
  }
});


const app = express();
const PORT = process.env.PORT || 5000;

const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:3000',
  'http://localhost:3000'
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      
      if (origin.startsWith('http://localhost:')) {
        return callback(null, true);
      }
      
      const isAllowed = allowedOrigins.includes(origin) || origin.endsWith('.vercel.app');
      if (isAllowed) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  })
);
app.use(express.json());

app.use('/api/problems', problemsRouter);
app.use('/api', authRouter);
app.use('/api/progress', progressRouter);
app.use('/api', aiRouter);
app.use('/', judgeRouter);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Judge0 API URL: ${JUDGE0_API_URL}`);
});
