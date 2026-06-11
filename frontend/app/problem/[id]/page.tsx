'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import Editor from '@monaco-editor/react'
import { Settings } from 'lucide-react'
import AlgorithmVisualizer from '../../components/AlgorithmVisualizer'

interface Example {
  input: string
  output: string
  explanation?: string
}

interface Problem {
  id: string
  title: string
  difficulty: string
  description: string
  examples: Example[]
  constraints: string[]
}

interface TestResultItem {
  input: string
  expected: string
  actual: string
  passed: boolean
  error?: string | null
}

type TutorRequestType = 'why_failing' | 'explain_concept' | 'hint' | 'chat'
type Language = 'python' | 'c' | 'cpp' | 'java' | 'javascript'
type ConsoleTab = 'results' | 'custom-input'

const API_URL = 'http://localhost:5000'

const defaultCode: Record<Language, string> = {
  python: `# Read input from stdin
import sys

def main():
    # Read all input from standard input
    input_data = sys.stdin.read().split()
    if not input_data:
        return
        
    # Write your solution here
    
if __name__ == '__main__':
    main()`,
  c: `#include <stdio.h>
#include <stdlib.h>

int main() {
    // Write your solution here
    
    return 0;
}`,
  cpp: `#include <iostream>
#include <vector>
#include <string>

using namespace std;

int main() {
    // Fast I/O
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);
    
    // Write your solution here
    
    return 0;
}`,
  java: `import java.util.Scanner;

public class Solution {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        
        // Write your solution here
        
        sc.close();
    }
}`,
  javascript: `const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

let input = [];
rl.on('line', (line) => {
    input.push(...line.trim().split(/\\s+/));
});

rl.on('close', () => {
    // Write your solution here
    // The 'input' array contains all space-separated tokens from stdin
    
});`
}

export default function ProblemPage() {
  const params = useParams()
  const [problem, setProblem] = useState<Problem | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [language, setLanguage] = useState<Language>('python')
  const [code, setCode] = useState(defaultCode.python)
  
  // Console Tab States
  const [consoleTab, setConsoleTab] = useState<ConsoleTab>('results')
  const [customInput, setCustomInput] = useState('')
  const [consoleOutput, setConsoleOutput] = useState<string>('')
  
  // Running/Submitting Execution States
  const [isRunningCode, setIsRunningCode] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [runResults, setRunResults] = useState<TestResultItem[]>([])
  const [runError, setRunError] = useState<string | null>(null)
  const [runSummary, setRunSummary] = useState<{ passed: number; total: number } | null>(null)

  // AI Mentor States
  const [showAiMentor, setShowAiMentor] = useState(false)
  const [aiInput, setAiInput] = useState('')
  const [aiMessages, setAiMessages] = useState<{role: 'user' | 'ai', content: string}[]>([])
  const [aiLoading, setAiLoading] = useState(false)
  const [unlockedHintLevel, setUnlockedHintLevel] = useState(1)
  const [visualData, setVisualData] = useState<any | null>(null)
  const [isVisualizing, setIsVisualizing] = useState(false)
  const [tutorName, setTutorName] = useState('Sage')

  useEffect(() => {
    const savedName = localStorage.getItem('tutorName')
    if (savedName) {
      setTutorName(savedName)
    }
  }, [])
  
  const chatBottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [aiMessages, aiLoading])

  useEffect(() => {
    fetch(`${API_URL}/api/problems/${params.id}`)
      .then(res => {
        if (!res.ok) throw new Error('Problem not found')
        return res.json()
      })
      .then(data => {
        setProblem(data)
        setLoading(false)
      })
      .catch(err => {
        setError(err.message)
        setLoading(false)
      })
  }, [params.id])

  useEffect(() => {
    setCode(defaultCode[language])
  }, [language])

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy': return 'text-emerald-400'
      case 'Medium': return 'text-amber-400'
      case 'Hard': return 'text-rose-400'
      default: return 'text-gray-400'
    }
  }

  const getDifficultyBg = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy': return 'bg-emerald-400/10'
      case 'Medium': return 'bg-amber-400/10'
      case 'Hard': return 'bg-rose-400/10'
      default: return 'bg-gray-400/10'
    }
  }

  // Language ID mapping for Judge0
  const languageIds: Record<Language, number> = {
    'python': 71,
    'c': 50,
    'cpp': 54,
    'java': 62,
    'javascript': 63
  }

  const handleTutorRequest = async (requestType: TutorRequestType, hintLevel?: number, customText?: string) => {
    const requestLabels: Record<string, string> = {
      why_failing: 'Why is my code failing?',
      explain_concept: 'Can you explain the concept?',
      what_to_do: 'What should I do next?',
      hint: 'What should I do next?',
      chat: customText || ''
    }

    const userMessageText = requestLabels[requestType]
    if (!userMessageText) return

    setAiMessages(prev => [...prev, { role: 'user', content: userMessageText }])
    if (requestType === 'chat') {
      setAiInput('')
    }
    setAiLoading(true)
    setShowAiMentor(true)

    try {
      const failedTestCase = runResults.find(test => !test.passed) || null
      const historyPayload = [
        ...aiMessages.map(msg => ({
          role: msg.role === 'ai' ? 'assistant' : 'user',
          content: msg.content
        })),
        { role: 'user', content: userMessageText }
      ]

      const response = await fetch(`${API_URL}/api/tutor`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          problemId: problem?.id,
          code,
          requestType,
          messageHistory: historyPayload,
          failedTestCase,
          userMessage: userMessageText,
          hintLevel,
          tutorName
        })
      })

      if (!response.ok) {
        throw new Error('Failed to get AI response')
      }

      const result = await response.json()
      setAiMessages(prev => [...prev, { role: 'ai', content: result.reply }])

      // Detect concept and fetch visualization only if requestType is 'explain_concept'
      if (requestType === 'explain_concept') {
        try {
          const replyText = (result.reply || '').toLowerCase()
          let concept = 'array'

          if (replyText.includes('two pointer') || replyText.includes('two-pointer')) {
            concept = 'two pointers'
          } else if (replyText.includes('sliding window') || replyText.includes('sliding-window')) {
            concept = 'sliding window'
          } else if (replyText.includes('binary search')) {
            concept = 'binary search'
          } else if (replyText.includes('hash map') || replyText.includes('hashmap')) {
            concept = 'hashmap'
          } else if (replyText.includes('recursion') || replyText.includes('tree')) {
            concept = 'tree'
          } else if (replyText.includes('stack')) {
            concept = 'stack'
          } else if (replyText.includes('queue')) {
            concept = 'queue'
          }

          const failedTestCase = runResults.find(test => !test.passed) || null

          if (failedTestCase) {
            setIsVisualizing(true)
            setVisualData(null) // clear previous visualizer representation
            const vizResponse = await fetch(`${API_URL}/api/visualize`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                problemTitle: problem?.title,
                problemDescription: problem?.description,
                userCode: code,
                failedTestCase: {
                  input: failedTestCase.input,
                  expected: failedTestCase.expected,
                  actual: failedTestCase.actual
                },
                concept
              })
            })

            if (vizResponse.ok) {
              const vizData = await vizResponse.json()
              if (vizData && !vizData.error) {
                setVisualData(vizData)
              } else {
                setVisualData(null)
              }
            } else {
              setVisualData(null)
            }
          } else {
            setVisualData(null)
          }
        } catch (vizErr) {
          console.error('Visualization error:', vizErr)
          setVisualData(null)
        } finally {
          setIsVisualizing(false)
        }
      } else {
        setVisualData(null)
      }
    } catch (err: any) {
      setAiMessages(prev => [...prev, { 
        role: 'ai', 
        content: `Sorry, I ran into an error. Please try again.`
      }])
    } finally {
      setAiLoading(false)
    }
  }

  const handleRunCode = async () => {
    if (!problem) return

    setIsRunningCode(true)
    setConsoleTab('results')
    setConsoleOutput('Executing... Please wait...\n')
    setRunResults([])
    setRunSummary(null)
    setRunError(null)

    const isCustom = customInput.trim().length > 0

    try {
      const response = await fetch(`${API_URL}/api/run-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          code,
          language,
          problemId: problem.id,
          stdin: isCustom ? customInput : undefined
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to execute code')
      }

      const result = await response.json()
      
      if (result.custom) {
        // Custom stdin execution
        let outputText = ''
        if (result.error) {
          outputText += `Status: ❌ Execution failed\nError: ${result.error}\n`
          if (result.compile_output) outputText += `Compile Log:\n${result.compile_output}\n`
          if (result.stderr) outputText += `Stderr:\n${result.stderr}\n`
          setRunError(result.error)
        } else {
          outputText += `Status: ✅ Completed successfully\n\nOutput:\n${result.stdout || '(empty)'}\n`
          if (result.stderr) outputText += `\nStderr:\n${result.stderr}\n`
        }
        setConsoleOutput(outputText)
      } else {
        // Sample test case execution
        const testRes = result.results || []
        setRunResults(testRes)
        const passedCount = testRes.filter((r: any) => r.passed).length
        setRunSummary({ passed: passedCount, total: testRes.length })

        let outputText = `Status: ${passedCount === testRes.length ? '✅ Passed' : '❌ Failed'}\n`
        outputText += `Passed ${passedCount} / ${testRes.length} sample cases\n\n`
        
        testRes.forEach((r: any, idx: number) => {
          outputText += `Sample Case ${idx + 1}: ${r.passed ? 'PASSED' : 'FAILED'}\n`
          if (r.error) outputText += `  Error: ${r.error}\n`
          outputText += `  Input: ${r.input || '(empty)'}\n`
          outputText += `  Expected: ${r.expected}\n`
          outputText += `  Actual: ${r.actual || '(empty)'}\n\n`
        })

        setConsoleOutput(outputText.trim())
        if (passedCount < testRes.length) {
          const firstErr = testRes.find((r: any) => !r.passed)
          setRunError(firstErr?.error || 'Wrong Answer')
        }
      }
    } catch (err: any) {
      setConsoleOutput(`Error: ${err.message}`)
      setRunError(err.message)
    } finally {
      setIsRunningCode(false)
    }
  }

  const handleSubmit = async () => {
    if (!problem) return

    setIsSubmitting(true)
    setConsoleTab('results')
    setConsoleOutput('Submitting... Running all test cases...\n\n')
    setRunResults([])
    setRunSummary(null)
    setRunError(null)

    try {
      const response = await fetch(`${API_URL}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          problem_id: problem.id,
          source_code: code,
          language_id: languageIds[language]
        })
      })

      if (!response.ok) {
        throw new Error('Failed to submit solution')
      }

      const result = await response.json()
      const isAccepted = result.overallStatus === 'Accepted'

      // Save user progress if accepted
      if (isAccepted) {
        try {
          const userRes = await fetch(`${API_URL}/api/me`, { credentials: 'include' })
          if (userRes.ok) {
            const userData = await userRes.json()
            await fetch(`${API_URL}/api/progress/solve`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId: userData.id,
                problemId: problem.id,
                language: language,
                timeTaken: result.testResults.reduce((acc: number, t: any) => acc + (parseFloat(t.time) || 0), 0)
              })
            })
          }
        } catch (e) {
          console.error('Failed to save progress', e)
        }
      }

      // Format submission text output
      let outputText = `${isAccepted ? '✅' : '❌'} ${result.overallStatus}\n`
      outputText += `Test Cases: ${result.passedTestCases} / ${result.totalTestCases} passed\n\n`
      outputText += '─'.repeat(40) + '\n\n'

      const mappedResults: TestResultItem[] = (result.testResults || []).map((r: any) => ({
        input: r.input,
        expected: r.expectedOutput,
        actual: r.actualOutput,
        passed: r.passed,
        error: r.error
      }))
      setRunResults(mappedResults)
      setRunSummary({ passed: result.passedTestCases, total: result.totalTestCases })

      result.testResults.forEach((test: any) => {
        outputText += `Test Case ${test.testCase}: ${test.passed ? '✅ PASSED' : '❌ FAILED'}\n`
        if (!test.passed) {
          if (test.error) outputText += `  Error: ${test.error}\n`
          if (test.stderr) outputText += `  stderr: ${test.stderr}\n`
          if (test.compile_output) outputText += `  Compile Log: ${test.compile_output}\n`
          outputText += `  Input: ${test.input || '(empty)'}\n`
          outputText += `  Expected: ${test.expectedOutput}\n`
          outputText += `  Actual: ${test.actualOutput || '(empty)'}\n`
        }
        outputText += '\n'
      })

      setConsoleOutput(outputText.trim())
      if (!isAccepted) {
        const firstErr = result.testResults.find((r: any) => !r.passed)
        setRunError(firstErr?.error || 'Wrong Answer')
      }
    } catch (err: any) {
      setConsoleOutput(`Submission Error: ${err.message}`)
      setRunError(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleResetCode = () => {
    if (window.confirm('Are you sure you want to reset your code to the default template?')) {
      setCode(defaultCode[language])
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#080b11] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <svg className="animate-spin h-8 w-8 text-[#8b5cf6]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-[#8b949e] text-sm font-semibold">Loading Problem Workspace...</p>
        </div>
      </main>
    )
  }

  if (error || !problem) {
    return (
      <main className="min-h-screen bg-[#080b11] flex items-center justify-center p-4">
        <div className="text-center bg-[#151b26] border border-white/5 p-8 rounded-2xl max-w-md">
          <p className="text-rose-400 font-medium mb-4">{error || 'Problem not found'}</p>
          <Link href="/" className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm text-[#8b5cf6] font-semibold transition-all">
            ← Back to coding arena
          </Link>
        </div>
      </main>
    )
  }

  return (
    <div className="h-screen bg-[#080b11] flex flex-col overflow-hidden">
      {/* Top Header */}
      <header className="glass-panel px-6 py-3 flex-shrink-0 flex items-center justify-between shadow-md border-b border-white/5">
        <div className="flex items-center gap-3">
          <Link 
            href="/" 
            className="text-[#8b949e] hover:text-white transition-colors"
            title="Back to Problems"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6"/>
            </svg>
          </Link>
          <div className="h-4 w-px bg-white/10"></div>
          <h1 className="text-sm font-bold text-white tracking-tight">{problem.id}. {problem.title}</h1>
          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${getDifficultyColor(problem.difficulty)} ${getDifficultyBg(problem.difficulty)}`}>
            {problem.difficulty}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <Link 
            href="/settings" 
            className="text-[#8b949e] hover:text-white transition-colors p-1.5 hover:bg-white/5 rounded-lg"
            title="Settings"
          >
            <Settings className="w-4 h-4" />
          </Link>
          <button
            onClick={() => {
              setShowAiMentor(!showAiMentor)
              if (unlockedHintLevel < 2 && runResults.length > 0) {
                setUnlockedHintLevel(2)
              }
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
              showAiMentor
                ? 'bg-[#8b5cf6]/20 text-[#8b5cf6] border-[#8b5cf6]/40 shadow-md shadow-[#8b5cf6]/10'
                : 'bg-white/5 text-[#c9d1d9] border-white/5 hover:bg-white/10'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2a3 3 0 0 0-3 3v14a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
              <path d="M19 10a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0v-7a3 3 0 0 0-3-3Z"/>
              <path d="M5 10a3 3 0 0 0-3 3v4a3 3 0 0 0 6 0v-4a3 3 0 0 0-3-3Z"/>
            </svg>
            Get {tutorName}'s Help
          </button>
        </div>
      </header>

      {/* Main Splitted Content Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Pane: Problem Details (takes 50% width) */}
        <div className="w-1/2 border-r border-white/5 overflow-y-auto bg-[#080b11]">
          <div className="max-w-2xl mx-auto px-6 py-6 space-y-6">
            <div>
              <h2 className="text-xl font-bold text-white mb-3">{problem.title}</h2>
              <div className="text-sm text-[#c9d1d9] leading-7 whitespace-pre-wrap">
                {problem.description.split('Input Format:')[0].trim()}
              </div>
            </div>

            {/* Input Format */}
            {problem.description.includes('Input Format:') && (
              <div className="bg-[#151b26]/50 border border-white/5 rounded-xl p-4">
                <h4 className="text-white text-xs font-bold uppercase tracking-wider mb-2">Input Format</h4>
                <p className="text-sm text-[#8b949e] leading-6 whitespace-pre-wrap">
                  {problem.description.split('Input Format:')[1]?.trim()}
                </p>
              </div>
            )}

            {/* Examples */}
            <div className="space-y-4">
              <h3 className="text-white text-sm font-bold uppercase tracking-wider">Examples</h3>
              {problem.examples.map((example, idx) => (
                <div key={idx} className="bg-[#0f141d] border border-white/5 rounded-xl overflow-hidden shadow-inner">
                  <div className="bg-white/5 px-3 py-1.5 text-[11px] font-bold text-[#8b949e] uppercase tracking-wider">
                    Example {idx + 1}
                  </div>
                  <div className="p-4 space-y-3 font-mono text-xs">
                    <div>
                      <span className="text-[#8b949e] block mb-1">Input:</span>
                      <pre className="text-white bg-[#080b11] p-2 rounded border border-white/5 whitespace-pre-wrap">{example.input || '(empty)'}</pre>
                    </div>
                    <div>
                      <span className="text-[#8b949e] block mb-1">Output:</span>
                      <pre className="text-white bg-[#080b11] p-2 rounded border border-white/5 whitespace-pre-wrap">{example.output}</pre>
                    </div>
                    {example.explanation && (
                      <div className="font-sans text-xs text-[#8b949e] leading-5 pt-1">
                        <span className="font-semibold text-[#c9d1d9]">Explanation:</span> {example.explanation}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Constraints */}
            <div className="space-y-2">
              <h3 className="text-white text-sm font-bold uppercase tracking-wider">Constraints</h3>
              <ul className="bg-white/5 border border-white/5 rounded-xl p-4 space-y-2">
                {problem.constraints.map((constraint, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-xs font-mono text-[#c9d1d9]">
                    <span className="text-[#8b5cf6]">•</span>
                    <code>{constraint}</code>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Right Pane: Code Editor + Split Console (takes 50% width) */}
        <div className="w-1/2 flex flex-col bg-[#0b0e14] overflow-hidden">
          {/* Top Panel: Code Editor (60% height) */}
          <div className="h-3/5 flex flex-col border-b border-white/5 overflow-hidden">
            {/* Editor Action Header */}
            <div className="bg-[#0f141d] px-4 py-2 flex items-center justify-between border-b border-white/5">
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#8b949e] font-semibold">Language:</span>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as Language)}
                  className="bg-[#080b11] text-white text-xs px-2.5 py-1.5 rounded-lg border border-white/5 focus:border-[#8b5cf6] focus:outline-none cursor-pointer font-bold"
                >
                  <option value="python">Python</option>
                  <option value="javascript">JavaScript</option>
                  <option value="cpp">C++</option>
                  <option value="c">C</option>
                  <option value="java">Java</option>
                </select>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleResetCode}
                  className="p-1.5 bg-white/5 hover:bg-white/10 hover:text-white border border-white/5 rounded-lg text-xs font-semibold text-[#8b949e] transition-all"
                  title="Reset template code"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M16 3h5v5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 21H3v-5"/>
                  </svg>
                </button>
              </div>
            </div>

            {/* Monaco Editor Container */}
            <div className="flex-1 min-h-0 relative">
              <Editor
                height="100%"
                language={language}
                value={code}
                onChange={(val) => setCode(val || '')}
                theme="vs-dark"
                options={{
                  minimap: { enabled: false },
                  fontSize: 14,
                  lineNumbers: 'on',
                  roundedSelection: false,
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  padding: { top: 12 },
                  fontFamily: 'JetBrains Mono, Consolas, monospace',
                }}
              />
            </div>
          </div>

          {/* Bottom Panel: Tabbed Console (40% height) */}
          <div className="flex-1 flex flex-col bg-[#080b11] overflow-hidden">
            {/* Console Headers & Exec Buttons */}
            <div className="bg-[#0f141d] px-4 py-1.5 flex items-center justify-between border-b border-white/5">
              <div className="flex gap-1">
                {(['results', 'custom-input'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setConsoleTab(tab)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      consoleTab === tab
                        ? 'bg-white/5 text-white border border-white/10'
                        : 'text-[#8b949e] hover:text-white'
                    }`}
                  >
                    {tab === 'results' ? 'Test Results' : 'Custom Input'}
                  </button>
                ))}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleRunCode}
                  disabled={isRunningCode || isSubmitting}
                  className="px-4 py-1.5 text-xs text-[#c9d1d9] bg-[#1d2433] hover:bg-[#283247] disabled:opacity-50 disabled:cursor-not-allowed font-semibold rounded-lg transition-all border border-white/5"
                >
                  {isRunningCode ? 'Running...' : 'Run Code'}
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting || isRunningCode}
                  className="px-4 py-1.5 text-xs text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed font-semibold rounded-lg transition-all shadow-md shadow-violet-500/10"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit'}
                </button>
              </div>
            </div>

            {/* Console Content Screen */}
            <div className="flex-1 overflow-y-auto p-4 font-mono text-xs">
              {consoleTab === 'results' ? (
                <div className="space-y-3">
                  {runError && (
                    <div className="bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-lg p-3 whitespace-pre-wrap">
                      {runError}
                    </div>
                  )}
                  {consoleOutput ? (
                    <pre className="text-[#c9d1d9] whitespace-pre-wrap leading-relaxed">{consoleOutput}</pre>
                  ) : (
                    <p className="text-[#58626f] italic">Click "Run Code" or "Submit" to see execution output...</p>
                  )}
                </div>
              ) : (
                <div className="h-full flex flex-col gap-2">
                  <p className="text-[10px] text-[#8b949e] font-sans font-semibold uppercase tracking-wider">
                    Provide custom raw stdin to pass to your code:
                  </p>
                  <textarea
                    value={customInput}
                    onChange={(e) => setCustomInput(e.target.value)}
                    placeholder="e.g. 42&#10;Hello World"
                    className="flex-1 bg-[#0d1117] text-white border border-white/5 hover:border-white/10 focus:border-[#8b5cf6] focus:outline-none rounded-xl p-3 resize-none font-mono"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* AI Mentor Chat Panel */}
        {showAiMentor && (
          <div className={`border-l border-gray-700 bg-gray-900 flex flex-col shadow-2xl flex-shrink-0 animate-in slide-in-from-right-4 duration-200 transition-all ${visualData || isVisualizing ? 'w-[480px]' : 'w-80'}`}>
            {/* Chat Header */}
            <div className="border-b border-white/5 px-4 py-3 flex items-center justify-between bg-[#0f141d]">
              <div className="flex items-center gap-2.5">
                {/* Large interactable kitten avatar */}
                <div className="relative group cursor-pointer w-9 h-9 rounded-full bg-emerald-500 flex items-center justify-center font-bold text-white shadow-md shadow-emerald-500/20 transition-all duration-300 hover:scale-110 flex-shrink-0">
                  <span className="group-hover:opacity-0 transition-opacity duration-200">
                    {(tutorName[0] || 'S').toUpperCase()}
                  </span>
                  <span className="absolute opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-lg transform group-hover:rotate-12 transition-transform duration-300 select-none">
                    🐱
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-white leading-none">{tutorName}</span>
                  <span className="text-xs text-gray-400 mt-1 leading-none">AI Tutor</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" title={`${tutorName} is online`}></div>
                <button
                  onClick={() => setShowAiMentor(false)}
                  className="text-[#8b949e] hover:text-white transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
                  </svg>
                </button>
              </div>
            </div>

            {/* Chat Messages */}
            {aiMessages.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-4">
                {/* Large welcome avatar */}
                <div className="relative group cursor-pointer w-16 h-16 rounded-full bg-emerald-500 flex items-center justify-center font-bold text-white text-2xl shadow-lg shadow-emerald-500/20 transition-all duration-300 hover:scale-110">
                  <span className="group-hover:opacity-0 transition-opacity duration-200">
                    {(tutorName[0] || 'S').toUpperCase()}
                  </span>
                  <span className="absolute opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-4xl transform group-hover:rotate-12 transition-transform duration-300 select-none">
                    🐱
                  </span>
                </div>
                <h3 className="text-white text-lg font-medium">Hi, I'm {tutorName}!</h3>
                <p className="text-sm text-gray-400 text-center max-w-xs">
                  Run your code first, then ask me anything.
                </p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {aiMessages.map((msg, idx) => {
                  const isUser = msg.role === 'user'
                  return (
                    <div key={idx} className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
                      {!isUser && (
                        <span className="text-xs text-emerald-400 font-medium mb-1 pl-8">
                          {tutorName}
                        </span>
                      )}
                      <div className={`flex items-start gap-2 max-w-[85%] ${isUser ? 'justify-end' : 'justify-start'}`}>
                        {!isUser && (
                          <div className="relative group cursor-pointer w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center font-bold text-white text-[10px] shadow-sm flex-shrink-0 transition-all duration-300 hover:scale-110">
                            <span className="group-hover:opacity-0 transition-opacity duration-200">
                              {(tutorName[0] || 'S').toUpperCase()}
                            </span>
                            <span className="absolute opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-xs select-none">
                              🐱
                            </span>
                          </div>
                        )}
                        <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
                          isUser
                            ? 'bg-gray-700 text-gray-100 rounded-tr-sm'
                            : 'bg-gray-800 text-gray-100 rounded-tl-sm'
                        }`}>
                          {msg.content}
                        </div>
                      </div>
                    </div>
                  )
                })}
                {aiLoading && (
                  <div className="flex flex-col items-start">
                    <span className="text-xs text-emerald-400 font-medium mb-1 pl-8">
                      {tutorName}
                    </span>
                    <div className="flex items-start gap-2 max-w-[85%]">
                      <div className="relative group cursor-pointer w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center font-bold text-white text-[10px] shadow-sm flex-shrink-0 transition-all duration-300 hover:scale-110">
                        <span className="group-hover:opacity-0 transition-opacity duration-200">
                          {(tutorName[0] || 'S').toUpperCase()}
                        </span>
                        <span className="absolute opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-xs select-none">
                          🐱
                        </span>
                      </div>
                      <div className="bg-gray-800 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block mx-0.5 animate-bounce" style={{ animationDelay: '0ms' }}></span>
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block mx-0.5 animate-bounce" style={{ animationDelay: '150ms' }}></span>
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block mx-0.5 animate-bounce" style={{ animationDelay: '300ms' }}></span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={chatBottomRef} />
              </div>
            )}

            {/* Visualizer Panel or Loading State */}
            {(visualData || isVisualizing) && (
              <div className="p-4 border-t border-white/5 bg-[#0b0f19] flex-shrink-0">
                {isVisualizing ? (
                  <div className="w-full h-[280px] bg-white/5 animate-pulse rounded-xl border border-white/5 flex items-center justify-center">
                    <span className="text-xs text-slate-500 font-semibold">Generating visual trace...</span>
                  </div>
                ) : (
                  visualData && <AlgorithmVisualizer data={visualData} />
                )}
              </div>
            )}

            {/* AI Prompts Suggestions */}
            <div className="px-3 pt-2 pb-1 bg-[#0f141d]/50 border-t border-white/5">
              <div className="flex flex-wrap gap-1">
                <button
                  onClick={() => handleTutorRequest('why_failing')}
                  disabled={aiLoading || runResults.length === 0}
                  className="px-2 py-1 bg-[#1c2433] hover:bg-[#283247] border border-white/5 text-[10px] text-[#c9d1d9] font-bold rounded-md disabled:opacity-50 disabled:pointer-events-none transition-all"
                >
                  🔍 Why failing?
                </button>
                <button
                  onClick={() => handleTutorRequest('explain_concept')}
                  disabled={aiLoading || runResults.length === 0}
                  className="px-2 py-1 bg-[#1c2433] hover:bg-[#283247] border border-white/5 text-[10px] text-[#c9d1d9] font-bold rounded-md disabled:opacity-50 disabled:pointer-events-none transition-all"
                >
                  💡 Explain concept
                </button>
                <button
                  onClick={() => {
                    handleTutorRequest('hint', unlockedHintLevel)
                    if (unlockedHintLevel < 3) setUnlockedHintLevel(prev => prev + 1)
                  }}
                  disabled={aiLoading || runResults.length === 0}
                  className="px-2 py-1 bg-[#1c2433] hover:bg-[#283247] border border-white/5 text-[10px] text-[#c9d1d9] font-bold rounded-md disabled:opacity-50 disabled:pointer-events-none transition-all"
                >
                  🎯 {unlockedHintLevel === 1 ? 'Nudge hint' : unlockedHintLevel === 2 ? 'Stuck hint' : 'Final hint'}
                </button>
              </div>
            </div>

            {/* Custom Chat Input Box */}
            <div className="border-t border-white/5 p-3 bg-[#0f141d]">
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  if (!aiInput.trim()) return
                  handleTutorRequest('chat', undefined, aiInput)
                }}
                className="flex gap-2"
              >
                <input
                  type="text"
                  placeholder="Ask a question..."
                  value={aiInput}
                  onChange={(e) => setAiInput(e.target.value)}
                  className="flex-1 bg-[#080b11] text-white border border-white/5 hover:border-white/10 focus:border-[#8b5cf6] focus:outline-none rounded-lg px-3 py-1.5 text-xs transition-all"
                />
                <button
                  type="submit"
                  disabled={aiLoading || !aiInput.trim()}
                  className="px-3 py-1.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-lg text-xs font-bold transition-all disabled:opacity-50 disabled:pointer-events-none"
                >
                  Send
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
