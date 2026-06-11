require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const { exec, spawn } = require('child_process');
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Helper function to execute code locally
async function executeLocally(source_code, language, stdin) {
  const runId = Math.random().toString(36).substring(2, 10);
  const tempDir = path.join(__dirname, `temp_run_${runId}`);
  
  try {
    fs.mkdirSync(tempDir, { recursive: true });
    
    let filename = '';
    let runCmd = '';
    let runArgs = [];
    let compileCmd = '';
    
    if (language === 'python') {
      filename = 'solution.py';
      runCmd = 'python3';
      runArgs = [filename];
    } else if (language === 'javascript') {
      filename = 'solution.js';
      runCmd = 'node';
      runArgs = [filename];
    } else if (language === 'cpp') {
      filename = 'solution.cpp';
      compileCmd = `g++ -O3 solution.cpp -o solution.out`;
      runCmd = path.join(tempDir, 'solution.out');
      runArgs = [];
    } else if (language === 'c') {
      filename = 'solution.c';
      compileCmd = `gcc -O3 solution.c -o solution.out`;
      runCmd = path.join(tempDir, 'solution.out');
      runArgs = [];
    } else if (language === 'java') {
      filename = 'Solution.java';
      compileCmd = `javac Solution.java`;
      runCmd = 'java';
      runArgs = ['Solution'];
    } else {
      throw new Error(`Unsupported language: ${language}`);
    }
    
    fs.writeFileSync(path.join(tempDir, filename), source_code);
    
    // Compile if necessary
    if (compileCmd) {
      const compileResult = await new Promise((resolve) => {
        exec(compileCmd, { cwd: tempDir, timeout: 10000 }, (error, stdout, stderr) => {
          if (error) {
            resolve({ success: false, error: stderr || stdout || error.message });
          } else {
            resolve({ success: true });
          }
        });
      });
      
      if (!compileResult.success) {
        return {
          stdout: '',
          stderr: compileResult.error,
          compile_error: compileResult.error
        };
      }
    }
    
    // Run the code
    return await new Promise((resolve) => {
      const child = spawn(runCmd, runArgs, { cwd: tempDir });
      
      let stdout = '';
      let stderr = '';
      let killed = false;
      
      const timeout = setTimeout(() => {
        child.kill();
        killed = true;
        resolve({
          stdout: stdout,
          stderr: stderr + '\n[Time Limit Exceeded]',
          timeout: true
        });
      }, 5000); // 5s timeout
      
      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      child.on('close', (code) => {
        clearTimeout(timeout);
        if (!killed) {
          resolve({
            stdout,
            stderr,
            code
          });
        }
      });
      
      child.on('error', (err) => {
        clearTimeout(timeout);
        // If python3 is not found, fallback to python
        if (err.code === 'ENOENT' && language === 'python' && runCmd === 'python3') {
          runCmd = 'python';
          exec(`python ${filename}`, { cwd: tempDir, timeout: 5000 }, (fallbackErr, fallbackStdout, fallbackStderr) => {
            resolve({
              stdout: fallbackStdout || '',
              stderr: fallbackStderr || (fallbackErr ? fallbackErr.message : '')
            });
          });
        } else {
          resolve({
            stdout: '',
            stderr: err.message
          });
        }
      });
      
      if (stdin) {
        child.stdin.write(stdin);
      }
      child.stdin.end();
    });
    
  } catch (err) {
    return {
      stdout: '',
      stderr: err.message
    };
  } finally {
    // Clean up directory
    try {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    } catch (cleanupErr) {
      console.error('Failed to clean up temp directory:', cleanupErr);
    }
  }
}

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: "http://localhost:3000",
  credentials: true
}));
app.use(express.json());

// Ensure data directory exists
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const PROGRESS_FILE = path.join(DATA_DIR, 'progress.json');
if (!fs.existsSync(PROGRESS_FILE)) {
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify({}));
}

// Mock database
const demoUsers = [
  { id: '1', username: 'admin', password: 'admin' },
  { id: '2', username: 'user1', password: 'pass1' },
  { id: '3', username: 'user2', password: 'pass2' }
];

const users = demoUsers.map((user) => {
  const isBcryptHash = typeof user.password === 'string' && user.password.startsWith('$2');
  return {
    ...user,
    password: isBcryptHash ? user.password : bcrypt.hashSync(user.password, 10)
  };
});

const PROBLEMS_FILE = path.join(DATA_DIR, 'problems.json');
let problems = [];
try {
  if (fs.existsSync(PROBLEMS_FILE)) {
    const problemsContent = fs.readFileSync(PROBLEMS_FILE, 'utf8');
    problems = JSON.parse(problemsContent);
  } else {
    console.warn('problems.json not found in data directory.');
  }
} catch (error) {
  console.error('Error loading problems.json:', error);
}

const JWT_SECRET = process.env.JWT_SECRET || 'coding-buddy-default-secret-key-xyz123';

const getTokenFromCookieHeader = (cookieHeader) => {
  if (!cookieHeader) return null;

  const cookies = cookieHeader.split(';').map((part) => part.trim());
  const tokenCookie = cookies.find((cookie) => cookie.startsWith('token='));
  if (!tokenCookie) return null;

  return decodeURIComponent(tokenCookie.substring('token='.length));
};

// Routes
app.get('/api/problems', (req, res) => {
  const problemList = problems.map(p => ({
    id: p.id,
    title: p.title,
    difficulty: p.difficulty
  }));
  res.json(problemList);
});

app.get('/api/problems/:id', (req, res) => {
  const problem = problems.find(p => p.id === req.params.id);
  if (!problem) {
    return res.status(404).json({ error: 'Problem not found' });
  }
  res.json(problem);
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const user = users.find(u => u.username === username);

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
    path: '/'
  });

  const safeUser = { id: user.id, username: user.username };
  res.json(safeUser);
});

app.post('/api/logout', (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    sameSite: 'strict',
    path: '/'
  });
  res.json({ message: 'Logged out successfully' });
});

app.get('/api/me', (req, res) => {
  const token = getTokenFromCookieHeader(req.headers.cookie);

  if (!JWT_SECRET) {
    return res.status(500).json({ error: 'JWT_SECRET is not configured' });
  }

  if (!token) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return res.json({ id: decoded.userId, username: decoded.username });
  } catch (error) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
});

// --- Progress Tracking Endpoints ---

app.post('/api/progress/solve', (req, res) => {
  const { userId, problemId, language, timeTaken } = req.body;

  if (!userId || !problemId || !language) {
    return res.status(400).json({ error: 'userId, problemId, and language are required' });
  }

  let progressData = {};
  try {
    const fileContent = fs.readFileSync(PROGRESS_FILE, 'utf8');
    progressData = JSON.parse(fileContent);
  } catch (error) {
    console.error('Error reading progress file:', error);
  }

  if (!progressData[userId]) {
    progressData[userId] = {
      solves: []
    };
  }

  const userProgress = progressData[userId];

  // Check if already solved
  const alreadySolved = userProgress.solves.some(solve => solve.problemId === problemId);

  if (!alreadySolved) {
    userProgress.solves.push({
      problemId,
      language,
      timeTaken: timeTaken || 0,
      timestamp: new Date().toISOString()
    });

    try {
      fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progressData, null, 2));
    } catch (error) {
      console.error('Error writing progress file:', error);
      return res.status(500).json({ error: 'Failed to save progress' });
    }
  }

  res.json({ success: true, message: 'Progress updated', alreadySolved });
});

app.get('/api/progress/:userId', (req, res) => {
  const { userId } = req.params;

  let progressData = {};
  try {
    if (fs.existsSync(PROGRESS_FILE)) {
      const fileContent = fs.readFileSync(PROGRESS_FILE, 'utf8');
      progressData = JSON.parse(fileContent);
    }
  } catch (error) {
    console.error('Error reading progress file:', error);
    return res.status(500).json({ error: 'Failed to read progress' });
  }

  const userProgress = progressData[userId] || { solves: [] };
  
  const solvedProblems = userProgress.solves.map(s => s.problemId);
  const totalSolved = solvedProblems.length;

  // Calculate streak: consecutive days with at least one solve up to today or yesterday
  let streak = 0;
  if (userProgress.solves.length > 0) {
    // Sort solves by date descending
    const sortedSolves = [...userProgress.solves].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    const uniqueDates = Array.from(new Set(sortedSolves.map(s => new Date(s.timestamp).toISOString().split('T')[0])));
    
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
              streak++;
              currentCheckDate.setDate(currentCheckDate.getDate() - 1);
           } else if (new Date(dateStr) < currentCheckDate) {
              break; // Date gap found
           }
        }
    }
  }

  res.json({
    solvedProblems,
    totalSolved,
    streak
  });
});

const PISTON_API_URL = 'https://emkc.org/api/v2/piston/execute';
const PISTON_LANGUAGES = {
  python: { language: 'python', version: '3.10.0' },
  javascript: { language: 'javascript', version: '18.15.0' },
  java: { language: 'java', version: '15.0.2' },
  cpp: { language: 'cpp', version: '10.2.0' },
  c: { language: 'c', version: '10.2.0' }
};

app.post('/api/run-code', async (req, res) => {
  try {
    const { code, language, problemId, stdin } = req.body;

    if (!code || !language) {
      return res.status(400).json({
        error: 'code and language are required'
      });
    }

    const runtime = PISTON_LANGUAGES[language];
    const languageName = runtime ? runtime.language : language;

    if (stdin !== undefined) {
      // Run with custom stdin
      const executionResult = await executeLocally(code, languageName, stdin);
      const compileError = executionResult.compile_error || '';
      const runtimeError = executionResult.stderr || '';
      const actualOutput = (executionResult.stdout || '').trim();
      const hasError = compileError || runtimeError || executionResult.timeout;

      let errorMsg = null;
      if (executionResult.timeout) {
        errorMsg = 'Time Limit Exceeded';
      } else if (hasError) {
        errorMsg = compileError || runtimeError || 'Execution failed';
      }

      return res.json({
        custom: true,
        passed: !hasError,
        stdout: actualOutput,
        stderr: runtimeError,
        compile_output: compileError,
        error: errorMsg
      });
    } else {
      // Run with sample test cases (first test case or examples)
      const problem = problems.find(p => p.id === problemId);
      if (!problem) {
        return res.status(404).json({ error: 'Problem not found' });
      }

      const testCases = problem.testCases || [];
      if (testCases.length === 0) {
        return res.status(400).json({ error: 'No test cases available for this problem' });
      }

      // Run only the first test case (sample)
      const testCase = testCases[0];
      const result = await executeLocally(code, languageName, testCase.input || '');
      const compileError = result.compile_error || '';
      const runtimeError = result.stderr || '';
      const actualOutput = (result.stdout || '').trim();
      const expectedOutput = (testCase.expectedOutput || '').trim();
      const hasError = compileError || runtimeError || result.timeout;
      const testPassed = !hasError && actualOutput === expectedOutput;

      let errorMsg = null;
      if (result.timeout) {
        errorMsg = 'Time Limit Exceeded';
      } else if (hasError) {
        errorMsg = compileError || runtimeError || 'Execution failed';
      }

      return res.json({
        custom: false,
        passed: testPassed,
        results: [{
          input: testCase.input || '',
          expected: testCase.expectedOutput || '',
          actual: actualOutput,
          passed: testPassed,
          error: errorMsg
        }]
      });
    }
  } catch (error) {
    console.error('Run code error:', error);
    return res.status(500).json({
      error: error.message || 'Internal server error'
    });
  }
});

app.post('/api/tutor', async (req, res) => {
  try {
    const {
      problemId,
      code,
      requestType,
      messageHistory = [],
      failedTestCase = null,
      userMessage = '',
      hintLevel,
      tutorName = 'Sage'
    } = req.body;

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ reply: 'GEMINI_API_KEY is not configured.' });
    }

    const problem = problems.find(p => p.id === problemId);
    const problemTitle = problem ? problem.title : 'General Coding';
    const problemDescription = problem ? problem.description : '';

    let systemPrompt = `You are ${tutorName}, a friendly and patient coding tutor with a calm, encouraging personality. You have a slightly witty sense of humor but never at the student's expense — you're always on their side.

Your personality traits:
- You refer to yourself as ${tutorName}, never as 'AI' or 'assistant'
- You are genuinely excited when a student is close to the answer
- You use phrases like 'Good thinking!', 'You're on the right track', 'Interesting approach — let's think about this together'
- You never say 'Wrong' or 'Incorrect' — instead say things like 'Not quite — let's look at why' or 'Almost there!'
- When a student is clearly frustrated (multiple failed attempts), you acknowledge it: 'I know this one's tricky — let's slow down and break it apart'
- You end every response with one short encouraging line

Your strict rules (never break these no matter what):
1. NEVER write any code, pseudocode, or code snippets — not even one line
2. NEVER reveal the solution or any part of it
3. You MAY point to a specific line number that has the problem, but only describe what is conceptually wrong there
4. Keep responses under 150 words — be concise and warm, not lecture-y
5. You are talking to a beginner student, so avoid heavy jargon. If you must use a technical term, explain it in plain English immediately after

When requestType is 'why_failing': explain in plain English why the logic or approach is failing for the given test case. Be specific about WHAT is going wrong, not just THAT something is wrong.

When requestType is 'what_to_do': give a conceptual nudge. Describe the direction of correct thinking without saying how to code it. You can ask the student a leading question to guide their thinking.

When requestType is 'explain_concept': explain the underlying concept in simple terms. Always use a real-world analogy first, then connect it back to the coding problem. Example format: 'Think of it like [analogy]. In this problem, that means [connection].'

Remember: you are ${tutorName}. Be warm, be brief, never give away the answer.`;

    if (requestType === 'hint') {
      if (hintLevel === 1) {
        systemPrompt += "\n\nHINT LEVEL 1: Give a very vague conceptual nudge - one sentence only. Do not mention any data structures or algorithms by name.";
      } else if (hintLevel === 2) {
        systemPrompt += "\n\nHINT LEVEL 2: Name the general technique or data structure they should think about, but do not explain how to use it.";
      } else if (hintLevel === 3) {
        systemPrompt += "\n\nHINT LEVEL 3: Walk them through the conceptual approach step-by-step in plain English. Still no code.";
      }
    }

    const promptContext = [
      `Request Type: ${requestType}`,
      `Problem Title: ${problemTitle}`,
      `Problem Description: ${problemDescription}`,
      failedTestCase ? `Failed Test Case Input: ${failedTestCase.input || ''}` : '',
      failedTestCase ? `Expected Output: ${failedTestCase.expected || failedTestCase.expectedOutput || ''}` : '',
      failedTestCase ? `Actual Output: ${failedTestCase.actual || ''}` : '',
      `Student Code:\n${code}`,
      userMessage ? `Student Message: ${userMessage}` : ''
    ].filter(Boolean).join('\n\n');

    const messages = [
      { role: 'user', parts: [{ text: `${systemPrompt}\n\n${promptContext}` }] },
      ...messageHistory.map((message) => ({
        role: message.role === 'assistant' || message.role === 'model' ? 'model' : 'user',
        parts: [{ text: typeof message.content === 'string' ? message.content : '' }]
      }))
    ];

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent({ contents: messages });
    const reply = result.response.text();

    return res.json({ reply });
  } catch (error) {
    console.error('Tutor endpoint error:', error);
    return res.status(500).json({ reply: 'Failed to generate tutor response.' });
  }
});

// Create custom problem
app.post('/api/problems', (req, res) => {
  try {
    const { title, difficulty, description, examples, constraints, testCases } = req.body;

    if (!title || !difficulty || !description) {
      return res.status(400).json({ error: 'title, difficulty, and description are required' });
    }

    // Generate new unique ID
    const newId = (problems.length > 0 ? Math.max(...problems.map(p => parseInt(p.id) || 0)) + 1 : 1).toString();

    const newProblem = {
      id: newId,
      title,
      difficulty,
      description,
      examples: examples || [],
      constraints: constraints || [],
      testCases: testCases || []
    };

    problems.push(newProblem);

    fs.writeFileSync(PROBLEMS_FILE, JSON.stringify(problems, null, 2));
    res.status(201).json(newProblem);
  } catch (error) {
    console.error('Failed to create problem:', error);
    res.status(500).json({ error: 'Failed to save new problem' });
  }
});

// Judge0 API Configuration
const JUDGE0_API_URL = 'https://ce.judge0.com';

// Language IDs for Judge0
const LANGUAGE_IDS = {
  'c': 50,
  'cpp': 54,
  'python': 71,
  'python3': 71,
  'javascript': 63,
  'java': 62
};

// Submit code to Judge0 and get result
app.post('/run-code', async (req, res) => {
  try {
    const { source_code, language_id, stdin = '' } = req.body;

    if (!source_code) {
      return res.status(400).json({ error: 'source_code is required' });
    }

    if (!language_id) {
      return res.status(400).json({ error: 'language_id is required' });
    }

    // Step 1: Submit code to Judge0
    const submissionData = {
      source_code: source_code,
      language_id: parseInt(language_id),
      stdin: stdin
    };

    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };

    console.log('Submitting code to Judge0...');

    const submitResponse = await fetch(`${JUDGE0_API_URL}/submissions?base64_encoded=false&wait=false`, {
      method: 'POST',
      headers,
      body: JSON.stringify(submissionData)
    });

    if (!submitResponse.ok) {
      const error = await submitResponse.text();
      console.error('Judge0 submission error:', error);
      return res.status(500).json({ error: 'Failed to submit code', details: error });
    }

    const { token } = await submitResponse.json();
    console.log('Submission token:', token);

    // Step 2: Poll for result
    let result = null;
    let attempts = 0;
    const maxAttempts = 30; // 30 seconds timeout

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second

      const resultResponse = await fetch(`${JUDGE0_API_URL}/submissions/${token}?base64_encoded=false`, {
        headers
      });

      if (!resultResponse.ok) {
        console.error('Error fetching result, attempt:', attempts + 1);
        attempts++;
        continue;
      }

      result = await resultResponse.json();
      console.log('Status:', result.status?.description, 'Attempt:', attempts + 1);

      // Check if processing is complete
      if (result.status?.id !== 1 && result.status?.id !== 2) { // Not "In Queue" or "Processing"
        break;
      }

      attempts++;
    }

    if (!result) {
      return res.status(504).json({ error: 'Timeout waiting for execution result' });
    }

    const response = {
      status: {
        id: result.status?.id,
        description: result.status?.description
      },
      stdout: result.stdout || '',
      stderr: result.stderr || '',
      compile_output: result.compile_output || '',
      message: result.message || '',
      time: result.time,
      memory: result.memory,
      token: token
    };

    console.log('Execution completed:', result.status?.description);
    res.json(response);

  } catch (error) {
    console.error('Run code error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

// Get submission result by token (for checking status later)
app.get('/submissions/:token', async (req, res) => {
  try {
    const { token } = req.params;

    const headers = {
      'Accept': 'application/json'
    };

    const response = await fetch(`${JUDGE0_API_URL}/submissions/${token}?base64_encoded=false`, {
      headers
    });

    if (!response.ok) {
      return res.status(500).json({ error: 'Failed to fetch submission' });
    }

    const result = await response.json();

    res.json({
      status: result.status,
      stdout: result.stdout || '',
      stderr: result.stderr || '',
      compile_output: result.compile_output || '',
      time: result.time,
      memory: result.memory
    });

  } catch (error) {
    console.error('Get submission error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Submit solution - run all test cases
app.post('/submit', async (req, res) => {
  try {
    const { problem_id, source_code, language_id } = req.body;

    if (!problem_id || !source_code || !language_id) {
      return res.status(400).json({ error: 'problem_id, source_code, and language_id are required' });
    }

    const problem = problems.find(p => p.id === problem_id);
    if (!problem) {
      return res.status(404).json({ error: 'Problem not found' });
    }

    if (!problem.testCases || problem.testCases.length === 0) {
      return res.status(400).json({ error: 'No test cases available for this problem' });
    }

    // Map Judge0 language ID to Piston runtime
    const ID_TO_PISTON = {
      50: { language: 'c', version: '10.2.0' },
      54: { language: 'cpp', version: '10.2.0' },
      71: { language: 'python', version: '3.10.0' },
      63: { language: 'javascript', version: '18.15.0' },
      62: { language: 'java', version: '15.0.2' }
    };

    const runtime = ID_TO_PISTON[parseInt(language_id)];
    if (!runtime) {
      return res.status(400).json({ error: 'Unsupported language for fast execution' });
    }

    // Run all test cases concurrently locally
    const testPromises = problem.testCases.map(async (testCase, i) => {
      console.log(`Running test case ${i + 1}/${problem.testCases.length} for problem ${problem_id} locally`);

      const executionResult = await executeLocally(source_code, runtime.language, testCase.input || '');
      
      const compileError = executionResult.compile_error || '';
      const runtimeError = executionResult.stderr || '';
      const actualOutput = (executionResult.stdout || '').trim();
      const expectedOutput = (testCase.expectedOutput || '').trim();
      
      const hasError = compileError || runtimeError || executionResult.timeout;
      const passed = !hasError && actualOutput === expectedOutput;

      return {
        testCase: i + 1,
        passed,
        error: executionResult.timeout ? 'Time Limit Exceeded' : (hasError ? 'Execution failed' : null),
        stderr: runtimeError,
        compile_output: compileError,
        input: testCase.input,
        expectedOutput: testCase.expectedOutput,
        actualOutput,
        time: 0.05, // local execution is extremely fast
        memory: 1024 // dummy value
      };
    });

    const results = await Promise.all(testPromises);
    const passedTestCases = results.filter(r => r.passed).length;
    const allPassed = passedTestCases === problem.testCases.length;

    const response = {
      problem_id,
      overallStatus: allPassed ? 'Accepted' : 'Wrong Answer',
      totalTestCases: problem.testCases.length,
      passedTestCases,
      testResults: results
    };

    console.log(`Submission completed: ${response.overallStatus} (${passedTestCases}/${problem.testCases.length})`);
    res.json(response);

  } catch (error) {
    console.error('Submit error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

// Gemini AI Help Endpoint
app.post('/ai-help', async (req, res) => {
  try {
    const { code, problem_description, failed_test_cases, error_message, user_question } = req.body;

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ 
        error: 'Gemini API key not configured',
        message: 'Please set GEMINI_API_KEY environment variable'
      });
    }

    // Build context from available data
    let context = '';
    
    if (problem_description) {
      context += `Problem Description:\n${problem_description}\n\n`;
    }
    
    if (code) {
      context += `User's Current Code:\n\`\`\`\n${code}\n\`\`\`\n\n`;
    }
    
    if (failed_test_cases && failed_test_cases.length > 0) {
      context += `Failed Test Cases:\n`;
      failed_test_cases.forEach((test, idx) => {
        context += `Test ${idx + 1}:\n`;
        context += `  Input: ${test.input || 'N/A'}\n`;
        context += `  Expected: ${test.expectedOutput || 'N/A'}\n`;
        context += `  Actual: ${test.actualOutput || 'N/A'}\n`;
        if (test.error) context += `  Error: ${test.error}\n`;
      });
      context += `\n`;
    }
    
    if (error_message) {
      context += `Error Message:\n${error_message}\n\n`;
    }

    const userQuery = user_question || 'Please help me understand what\'s wrong with my code and provide hints to fix it.';
    
    const prompt = `You are a helpful coding mentor. Your role is to:
1. Analyze the user's code and the problem they're trying to solve
2. Identify issues or bugs without giving away the complete solution
3. Provide helpful hints, explanations, and guidance
4. Be encouraging and supportive

Context:
${context}

User's Question: ${userQuery}

Provide a helpful response that guides the user toward solving the problem themselves. Do not give the complete solution - instead, give hints, point out specific issues, suggest debugging strategies, or explain concepts they might be missing. Keep your response concise (2-4 paragraphs).`;

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent({ contents: [{ role: 'user', parts: [{ text: prompt }] }] });
    const aiResponse = result.response.text();

    res.json({ response: aiResponse });

  } catch (error) {
    console.error('AI Help error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message
    });
  }
});

// Visualize algorithm execution flow
app.post('/api/visualize', async (req, res) => {
  try {
    const { problemTitle, problemDescription, userCode, failedTestCase, concept } = req.body;

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: 'GEMINI_API_KEY is not configured.' });
    }

    const failedTestCaseString = failedTestCase 
      ? `Input: ${failedTestCase.input || ''}\nExpected: ${failedTestCase.expected || failedTestCase.expectedOutput || ''}\nActual: ${failedTestCase.actual || ''}`
      : 'No failed test case provided.';

    const prompt = `You are a visualization engine. Given a coding problem and a specific algorithm concept, generate a step-by-step JSON trace showing how the correct algorithm would process the given test input.

Return ONLY a raw JSON object. No markdown, no code fences, no explanation.
The JSON must follow this exact structure depending on the concept type:

For array/two-pointer/sliding-window problems:
{
  "type": "array",
  "array": [the actual input values as an array of numbers or strings],
  "pointers": ["left", "right"],  (only include pointers that are used)
  "steps": [
    {
      "pointerPositions": { "left": 0, "right": 3 },
      "highlightIndices": [0, 3],
      "activeIndices": [],
      "note": "one short sentence describing this step"
    }
  ],
  "result": "what the correct answer is"
}

For binary search problems:
{
  "type": "binary_search",
  "array": [sorted array values],
  "steps": [
    {
      "low": 0,
      "high": 7,
      "mid": 3,
      "note": "one short sentence"
    }
  ],
  "result": "the answer"
}

For hash map problems:
{
  "type": "hashmap",
  "steps": [
    {
      "processing": "current element being processed",
      "mapState": { "key": "value pairs in the map at this moment" },
      "note": "one short sentence"
    }
  ],
  "result": "the answer"
}

For tree/recursion problems:
{
  "type": "tree",
  "nodes": [
    { "id": 1, "value": "val", "children": [2, 3], "depth": 0 }
  ],
  "steps": [
    {
      "visitedNodes": [1],
      "currentNode": 1,
      "note": "one short sentence"
    }
  ],
  "result": "the answer"
}

Keep the steps array to a maximum of 8 steps. Use the ACTUAL values from the test input, not generic placeholders. The note for each step should describe what is happening conceptually, not just the indices.

Problem Title: ${problemTitle || 'General Problem'}
Problem Description: ${problemDescription || ''}
User's Code:
${userCode || ''}
Failed Test Case:
${failedTestCaseString}
Target Algorithm Concept: ${concept || 'array'}`;

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent({ contents: [{ role: 'user', parts: [{ text: prompt }] }] });
    let text = result.response.text().trim();

    // Clean up potential markdown code blocks
    if (text.startsWith("```json")) {
      text = text.substring(7);
    } else if (text.startsWith("```")) {
      text = text.substring(3);
    }
    if (text.endsWith("```")) {
      text = text.substring(0, text.length - 3);
    }
    text = text.trim();

    try {
      const parsed = JSON.parse(text);
      return res.json(parsed);
    } catch (parseErr) {
      console.error('Failed to parse Gemini visualization response:', text);
      return res.json({ error: "Could not generate visualization for this problem type" });
    }

  } catch (error) {
    console.error('Visualize endpoint error:', error);
    return res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
