require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { JUDGE0_API_URL } = require('./services/judge0');

const problemsRouter = require('./routes/problems');
const authRouter = require('./routes/auth');
const progressRouter = require('./routes/progress');
const judgeRouter = require('./routes/judge');
const aiRouter = require('./routes/ai');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
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
