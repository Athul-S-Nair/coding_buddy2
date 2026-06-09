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

    let systemPrompt =
      "You are a coding tutor helping a student debug their solution. You follow \nthese strict rules:\n1. NEVER write any code or code snippets, not even one line or pseudocode\n2. NEVER reveal the solution or any part of it\n3. You MAY mention a specific line number in the student's code that is \n   problematic, but only describe what is wrong conceptually\n4. When requestType is 'why_failing': explain in plain English why the \n   approach or logic is failing for the given test case\n5. When requestType is 'what_to_do': give a conceptual nudge — describe \n   what the correct thinking should be, without saying how to code it\n6. When requestType is 'explain_concept': explain the underlying concept \n   (e.g. two pointers, recursion, hash maps) in simple terms with a \n   real-world analogy\n7. Keep responses under 150 words. Be encouraging and friendly.";

    if (requestType === 'hint') {
      if (hintLevel === 1) {
        systemPrompt +=
          '\n\nHINT LEVEL 1 INSTRUCTION: Give a very vague conceptual nudge — one sentence only. Do not mention any data structures or algorithms by name.';
      } else if (hintLevel === 2) {
        systemPrompt +=
          '\n\nHINT LEVEL 2 INSTRUCTION: Name the general technique or data structure they should think about, but do not explain how to use it for this problem.';
      } else if (hintLevel === 3) {
        systemPrompt +=
          '\n\nHINT LEVEL 3 INSTRUCTION: Walk them through the conceptual approach step by step in plain English. Still no code. This is the most help you will ever give.';
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
