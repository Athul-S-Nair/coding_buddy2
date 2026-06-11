const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { problems } = require('../data/store');

const router = express.Router();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

router.post('/tutor', async (req, res) => {
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

    if (!problemId || !code || !requestType) {
      return res.status(400).json({
        reply: 'problemId, code, and requestType are required.',
      });
    }

    const problem = problems.find((item) => item.id === problemId);
    if (!problem) {
      return res.status(404).json({ reply: 'Problem not found.' });
    }

    let systemPrompt = `You are ${tutorName}, a friendly and patient coding tutor with a calm, 
encouraging personality. You have a slightly witty sense of humor 
but never at the student's expense — you're always on their side.

Your personality traits:
- You refer to yourself as ${tutorName}, never as 'AI' or 'assistant'
- You are genuinely excited when a student is close to the answer
- You use phrases like 'Good thinking!', 'You're on the right track', 
  'Interesting approach — let's think about this together'
- You never say 'Wrong' or 'Incorrect' — instead say things like 
  'Not quite — let's look at why' or 'Almost there!'
- When a student is clearly frustrated (multiple failed attempts), 
  you acknowledge it: 'I know this one's tricky — let's slow down 
  and break it apart'
- You end every response with one short encouraging line

Your strict rules (never break these no matter what):
1. NEVER write any code, pseudocode, or code snippets — not even one line
2. NEVER reveal the solution or any part of it
3. You MAY point to a specific line number that has the problem, 
   but only describe what is conceptually wrong there
4. Keep responses under 150 words — be concise and warm, not lecture-y
5. You are talking to a beginner student, so avoid heavy jargon. 
   If you must use a technical term, explain it in plain English 
   immediately after

When requestType is 'why_failing': explain in plain English why the 
logic or approach is failing for the given test case. Be specific 
about WHAT is going wrong, not just THAT something is wrong.

When requestType is 'what_to_do': give a conceptual nudge. Describe 
the direction of correct thinking without saying how to code it. 
You can ask the student a leading question to guide their thinking.

When requestType is 'explain_concept': explain the underlying concept 
in simple terms. Always use a real-world analogy first, then connect 
it back to the coding problem. Example format: 'Think of it like 
[analogy]. In this problem, that means [connection].'

Remember: you are ${tutorName}. Be warm, be brief, never give away the answer.`;

    if (requestType === 'hint') {
      if (hintLevel === 1) {
        systemPrompt +=
          `\n\nHINT LEVEL 1: Give a very vague conceptual nudge - one sentence only. Do not mention any data structures or algorithms by name.`;
      } else if (hintLevel === 2) {
        systemPrompt +=
          `\n\nHINT LEVEL 2: Name the general technique or data structure they should think about, but do not explain how to use it.`;
      } else if (hintLevel === 3) {
        systemPrompt +=
          `\n\nHINT LEVEL 3: Walk them through the conceptual approach step-by-step in plain English. Still no code.`;
      }
    }

    const promptContext = [
      `Request Type: ${requestType}`,
      `Problem Title: ${problem.title}`,
      `Problem Description: ${problem.description}`,
      failedTestCase ? `Failed Test Case Input: ${failedTestCase.input || ''}` : '',
      failedTestCase
        ? `Expected Output: ${failedTestCase.expected || failedTestCase.expectedOutput || ''}`
        : '',
      failedTestCase ? `Actual Output: ${failedTestCase.actual || ''}` : '',
      `Student Code:\n${code}`,
      userMessage ? `Student Message: ${userMessage}` : '',
    ]
      .filter(Boolean)
      .join('\n\n');

    const messages = [
      { role: 'user', parts: [{ text: `${systemPrompt}\n\n${promptContext}` }] },
      ...messageHistory.map((message) => ({
        role: message.role === 'assistant' || message.role === 'model' ? 'model' : 'user',
        parts: [{ text: typeof message.content === 'string' ? message.content : '' }],
      })),
    ];

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const result = await model.generateContent({ contents: messages });
    const reply = result.response.text();

    res.json({ reply });
  } catch (error) {
    console.error('Tutor endpoint error:', error);
    res.status(500).json({ reply: 'Failed to generate tutor response.' });
  }
});

router.post('/visualize', async (req, res) => {
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

router.post('/ai-help', async (req, res) => {
  try {
    const {
      code,
      problem_description,
      failed_test_cases,
      error_message,
      user_question,
    } = req.body;

    const huggingFaceApiKey = process.env.HUGGINGFACE_API_KEY || '';
    const huggingFaceModel = 'mistralai/Mistral-7B-Instruct-v0.2';

    if (!huggingFaceApiKey) {
      return res.status(500).json({
        error: 'Hugging Face API key not configured',
        message: 'Please set HUGGINGFACE_API_KEY environment variable',
      });
    }

    let context = '';

    if (problem_description) {
      context += `Problem Description:\n${problem_description}\n\n`;
    }

    if (code) {
      context += `User's Current Code:\n\`\`\`\n${code}\n\`\`\`\n\n`;
    }

    if (failed_test_cases && failed_test_cases.length > 0) {
      context += 'Failed Test Cases:\n';
      failed_test_cases.forEach((test, index) => {
        context += `Test ${index + 1}:\n`;
        context += `  Input: ${test.input || 'N/A'}\n`;
        context += `  Expected: ${test.expectedOutput || 'N/A'}\n`;
        context += `  Actual: ${test.actualOutput || 'N/A'}\n`;
        if (test.error) context += `  Error: ${test.error}\n`;
      });
      context += '\n';
    }

    if (error_message) {
      context += `Error Message:\n${error_message}\n\n`;
    }

    const userQuery =
      user_question ||
      "Please help me understand what's wrong with my code and provide hints to fix it.";

    const prompt = `<s>[INST] You are a helpful coding mentor. Your role is to:
1. Analyze the user's code and the problem they're trying to solve
2. Identify issues or bugs without giving away the complete solution
3. Provide helpful hints, explanations, and guidance
4. Be encouraging and supportive

${context}

User's Question: ${userQuery}

Provide a helpful response that guides the user toward solving the problem themselves. Do not give the complete solution - instead, give hints, point out specific issues, suggest debugging strategies, or explain concepts they might be missing. Keep your response concise (2-4 paragraphs). [/INST]`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    const response = await fetch(
      `https://api-inference.huggingface.co/models/${huggingFaceModel}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${huggingFaceApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: prompt,
          parameters: {
            max_new_tokens: 512,
            temperature: 0.7,
            top_p: 0.95,
            do_sample: true,
            return_full_text: false,
          },
        }),
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Hugging Face API error:', errorText);
      return res.status(500).json({
        error: 'Failed to get AI response',
        details: errorText,
      });
    }

    const result = await response.json();

    let aiResponse = '';
    if (Array.isArray(result) && result[0]?.generated_text) {
      aiResponse = result[0].generated_text.trim();
    } else if (result.generated_text) {
      aiResponse = result.generated_text.trim();
    } else {
      aiResponse =
        'I apologize, but I was unable to generate a helpful response. Please try rephrasing your question.';
    }

    res.json({ response: aiResponse });
  } catch (error) {
    console.error('AI Help error:', error);

    if (error.name === 'AbortError') {
      return res.status(504).json({
        error: 'Request timeout',
        message: 'The AI service took too long to respond. Please try again.',
      });
    }

    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    });
  }
});

module.exports = router;
