'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import Editor from '@monaco-editor/react'
import { Settings } from 'lucide-react'
import AlgorithmVisualizer from '../../components/AlgorithmVisualizer'
import confetti from 'canvas-confetti'

function TypewriterText({ text, speed = 12 }: { 
  text: string, speed?: number 
}) {
  const [displayed, setDisplayed] = useState('')
  const [done, setDone] = useState(false)
  
  useEffect(() => {
    setDisplayed('')
    setDone(false)
    let i = 0
    const timer = setInterval(() => {
      if (i < text.length) {
        setDisplayed(text.slice(0, i + 1))
        i++
      } else {
        setDone(true)
        clearInterval(timer)
      }
    }, speed)
    return () => clearInterval(timer)
  }, [text, speed])

  return (
    <span>
      {displayed}
      {!done && (
        <span className="inline-block w-0.5 h-3.5 bg-emerald-400 
        ml-0.5 animate-pulse align-middle" />
      )}
    </span>
  )
}

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

import { API_URL } from '../../../lib/api'

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
  const [codeByLanguage, setCodeByLanguage] = useState<Record<Language, string>>(() => {
    // Try to load saved code from localStorage
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(`code_${params.id}`)
        if (saved) {
          const parsed = JSON.parse(saved)
          // Validate it has the right shape
          if (parsed && typeof parsed === 'object') {
            return {
              python: parsed.python || '',
              javascript: parsed.javascript || '',
              java: parsed.java || '',
              cpp: parsed.cpp || '',
              c: parsed.c || '',
            }
          }
        }
      } catch (e) {
        // ignore parse errors
      }
    }
    return {
      python: '',
      javascript: '',
      java: '',
      cpp: '',
      c: '',
    }
  })
  const code = codeByLanguage[language]
  const setCode = (value: string) => {
    setCodeByLanguage((prev) => {
      const updated = { ...prev, [language]: value }
      // Persist to localStorage
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(`code_${params.id}`, JSON.stringify(updated))
        } catch (e) {
          // ignore storage errors
        }
      }
      return updated
    })
  }
  
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
  const [runStatus, setRunStatus] = useState('')
  const [submitStatus, setSubmitStatus] = useState('')
  const [elapsedSeconds, setElapsedSeconds] = useState(0)

  // Adversarial Attack States
  const [adversarialStatus, setAdversarialStatus] = useState<'idle' | 'loading' | 'completed' | 'error'>('idle')
  const [adversarialProgress, setAdversarialProgress] = useState(0)
  const [adversarialResults, setAdversarialResults] = useState<any | null>(null)
  const [expandedAttackIndex, setExpandedAttackIndex] = useState<number | null>(null)

  // AI Mentor States
  const [showAiMentor, setShowAiMentor] = useState(false)
  const [aiInput, setAiInput] = useState('')
  const [aiMessages, setAiMessages] = useState<{role: 'user' | 'ai', content: string}[]>([])
  const [aiLoading, setAiLoading] = useState(false)
  const [unlockedHintLevel, setUnlockedHintLevel] = useState(1)
  const [visualData, setVisualData] = useState<any | null>(null)
  const [isVisualizing, setIsVisualizing] = useState(false)
  const [visualizerCollapsed, setVisualizerCollapsed] = useState(false)
  const [tutorName, setTutorName] = useState('Sage')
  const [askedTutor, setAskedTutor] = useState(false)
  const [showSolvedOverlay, setShowSolvedOverlay] = useState(false)
  const [problemCollapsed, setProblemCollapsed] = useState(false)

  const triggerSolveAnimation = () => {
    // First burst - center
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#8b5cf6', '#6366f1', '#10b981', '#f59e0b', '#ffffff']
    })
    // Second burst - left
    setTimeout(() => confetti({
      particleCount: 50,
      angle: 60,
      spread: 55,
      origin: { x: 0 },
      colors: ['#8b5cf6', '#10b981', '#ffffff']
    }), 200)
    // Third burst - right
    setTimeout(() => confetti({
      particleCount: 50,
      angle: 120,
      spread: 55,
      origin: { x: 1 },
      colors: ['#6366f1', '#f59e0b', '#ffffff']
    }), 400)
  }

  const runAdversarialAttack = async () => {
    setAdversarialStatus('loading')
    setAdversarialProgress(0)
    setAdversarialResults(null)
    setExpandedAttackIndex(null)
    setConsoleTab('results')

    let currentProgress = 0
    const progressInterval = setInterval(() => {
      currentProgress += 100 / (3000 / 100)
      if (currentProgress >= 100) {
        setAdversarialProgress(100)
        clearInterval(progressInterval)
      } else {
        setAdversarialProgress(currentProgress)
      }
    }, 100)

    try {
      const response = await fetch(`${API_URL}/api/ai/adversarial`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          code,
          language,
          problemTitle: problem?.title,
          problemDescription: problem?.description,
          language_id: languageIds[language],
          problemId: problem?.id
        })
      })

      if (!response.ok) {
        throw new Error('Adversarial attack analysis failed')
      }

      const results = await response.json()
      clearInterval(progressInterval)
      setAdversarialProgress(100)
      setAdversarialResults(results)
      setAdversarialStatus('completed')

      if (results.survived === 5) {
        try {
          const userRes = await fetch(`${API_URL}/api/me`, { credentials: 'include' })
          if (userRes.ok) {
            const userData = await userRes.json()
            await fetch(`${API_URL}/api/progress/achievement`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId: userData.id,
                achievement: 'Battle Hardened',
                xpBonus: 75
              })
            })
          }
        } catch (e) {
          console.error('Failed to save achievement', e)
        }
      }
    } catch (err: any) {
      clearInterval(progressInterval)
      setAdversarialStatus('error')
      console.error('Adversarial attack error:', err)
    }
  }

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
    if (!isRunningCode && !isSubmitting) {
      setElapsedSeconds(0)
      return
    }

    const startedAt = Date.now()
    const intervalId = window.setInterval(() => {
      setElapsedSeconds(Number(((Date.now() - startedAt) / 1000).toFixed(1)))
    }, 100)

    return () => window.clearInterval(intervalId)
  }, [isRunningCode, isSubmitting])

  const handleLanguageChange = (newLang: Language) => {
    setLanguage(newLang)
  }

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
    setAskedTutor(true)

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
      setProblemCollapsed(true)
      setVisualizerCollapsed(true)

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
                setVisualizerCollapsed(false)
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
    setRunStatus(isCustom ? 'Executing custom input...' : 'Running test cases in parallel...')

    try {
      const response = await fetch(`${API_URL}/run-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          source_code: code,
          language_id: languageIds[language],
          problemId: problem.id,
          stdin: isCustom ? customInput : ''
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
          setRunStatus('Execution failed')
        } else {
          outputText += `Status: ✅ Completed successfully\n\nOutput:\n${result.stdout || '(empty)'}\n`
          if (result.stderr) outputText += `\nStderr:\n${result.stderr}\n`
          setRunStatus('Completed successfully')
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
        setRunStatus(`Finished — ${passedCount}/${testRes.length} passed`)
        if (passedCount < testRes.length) {
          const firstErr = testRes.find((r: any) => !r.passed)
          setRunError(firstErr?.error || 'Wrong Answer')
        }
      }
    } catch (err: any) {
      setConsoleOutput(`Error: ${err.message}`)
      setRunError(err.message)
      setRunStatus('Run failed')
    } finally {
      setIsRunningCode(false)
    }
  }

  const handleSubmit = async () => {
    if (!problem) return
 
    setIsSubmitting(true)
    setConsoleTab('results')
    setSubmitStatus('Submitting all test cases...')
    setConsoleOutput('Submitting... Running all test cases...\n\n')
    setRunResults([])
    setRunSummary(null)
    setRunError(null)
    setAdversarialStatus('idle')
 
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
        triggerSolveAnimation()
        setShowSolvedOverlay(true)
        setTimeout(() => setShowSolvedOverlay(false), 2500)
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
                timeTaken: result.testResults.reduce((acc: number, t: any) => acc + (parseFloat(t.time) || 0), 0),
                askedTutor: askedTutor
              })
            })
          }
        } catch (e) {
          console.error('Failed to save progress', e)
        }
        setTimeout(() => {
          runAdversarialAttack()
        }, 3000)
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
      setSubmitStatus(`Completed — ${result.overallStatus}`)
      if (!isAccepted) {
        const firstErr = result.testResults.find((r: any) => !r.passed)
        setRunError(firstErr?.error || 'Wrong Answer')
      }
    } catch (err: any) {
      setConsoleOutput(`Submission Error: ${err.message}`)
      setRunError(err.message)
      setSubmitStatus('Submit failed')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleResetCode = () => {
    const defaultValue = defaultCode[language] || ''
    setCode(defaultValue)
    setProblemCollapsed(false)
    // Clear saved code for this problem
    try {
      const saved = localStorage.getItem(`code_${params.id}`)
      if (saved) {
        const parsed = JSON.parse(saved)
        parsed[language] = defaultValue
        localStorage.setItem(`code_${params.id}`, JSON.stringify(parsed))
      }
    } catch (e) {}
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
            href="/progress" 
            className="text-xs font-semibold text-[#8b949e] hover:text-white transition-colors px-2 py-1.5 hover:bg-white/5 rounded-lg"
          >
            Progress
          </Link>
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
      <div className="flex-1 flex overflow-hidden relative">
        {/* Toggle button on the border between problem and editor panels */}
        <button
          onClick={() => setProblemCollapsed(prev => !prev)}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-20
            w-5 h-16 bg-gray-800 hover:bg-gray-700
            border border-white/10 rounded-r-lg
            flex items-center justify-center
            text-gray-400 hover:text-white
            transition-all duration-200"
          title={problemCollapsed ? 'Show problem' : 'Hide problem'}
        >
          {problemCollapsed ? '›' : '‹'}
        </button>
        {/* Left Pane: Problem Details (collapsible) */}
        <div className={`transition-all duration-300 ease-in-out
          overflow-hidden flex flex-col border-r border-white/5 bg-[#080b11]
          ${problemCollapsed ? 'w-0 opacity-0 min-w-0' : 'w-[400px] opacity-100'}`}>
          <div className="max-w-2xl mx-auto px-6 py-6 space-y-6 overflow-y-auto">
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

        {/* Right Pane: Code Editor + Split Console (fills remaining width) */}
        <div className="flex-1 flex flex-col bg-[#0b0e14] overflow-hidden">
          {problemCollapsed && (
            <div className="flex items-center gap-2 px-4 py-2
              bg-gray-900 border-b border-white/5 text-sm">
              <span className="text-gray-400 truncate">
                {problem?.title}
              </span>
              <button
                onClick={() => setProblemCollapsed(false)}
                className="text-xs text-violet-400 hover:text-violet-300
                whitespace-nowrap ml-auto"
              >
                Show problem ›
              </button>
            </div>
          )}
          {/* Top Panel: Code Editor (60% height) */}
          <div className="h-3/5 flex flex-col border-b border-white/5 overflow-hidden">
            {/* Editor Action Header */}
            <div className="bg-[#0f141d] px-4 py-2 flex items-center justify-between border-b border-white/5">
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#8b949e] font-semibold">Language:</span>
                <select
                  value={language}
                  onChange={(e) => handleLanguageChange(e.target.value as Language)}
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

              <div className="flex gap-2 items-center">
                {(isRunningCode || isSubmitting) && (
                  <span className="text-xs text-[#8b949e] tabular-nums mr-1 bg-white/5 px-2 py-1 rounded-md border border-white/5 font-semibold">
                    ⏱️ {elapsedSeconds.toFixed(1)}s
                  </span>
                )}
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
                  {(runStatus || submitStatus || isRunningCode || isSubmitting) && (
                    <div className="text-xs text-[#8b949e] border-b border-white/5 pb-2 mb-2 flex items-center justify-between">
                      <span>
                        {isRunningCode 
                          ? `${runStatus || 'Running...'} (${elapsedSeconds.toFixed(1)}s)` 
                          : isSubmitting 
                            ? `${submitStatus || 'Submitting...'} (${elapsedSeconds.toFixed(1)}s)` 
                            : runStatus || submitStatus}
                      </span>
                      {(isRunningCode || isSubmitting) && (
                        <span className="tabular-nums font-semibold text-[#8b5cf6]">{elapsedSeconds.toFixed(1)}s</span>
                      )}
                    </div>
                  )}
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

                  {/* Sage Adversarial Attack Section */}
                  {adversarialStatus !== 'idle' && (
                    <div className="mt-6 border-t border-white/10 pt-6 font-sans">
                      {adversarialStatus === 'loading' && (
                        <div className="bg-[#151324] border border-[#8b5cf6]/20 rounded-xl p-5 space-y-4">
                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-bold text-violet-300 flex items-center gap-2">
                              <span className="animate-spin inline-block">⚔️</span> {tutorName} is attacking your code...
                            </h4>
                            <span className="text-xs text-violet-400 font-mono font-semibold">{Math.round(adversarialProgress)}%</span>
                          </div>
                          <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden border border-white/5">
                            <div 
                              className="bg-gradient-to-r from-violet-600 to-indigo-500 h-full transition-all duration-100 ease-out"
                              style={{ width: `${adversarialProgress}%` }}
                            ></div>
                          </div>
                        </div>
                      )}

                      {adversarialStatus === 'error' && (
                        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-xl p-4 text-xs">
                          ⚠️ Sage was unable to perform the adversarial attack. Please check your network connection and try again.
                        </div>
                      )}

                      {adversarialStatus === 'completed' && adversarialResults && (
                        <div className="bg-slate-900/50 border border-white/5 rounded-xl p-5 space-y-6">
                          {/* Battle report UI */}
                          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
                            <div>
                              <h4 className="text-base font-black text-white flex items-center gap-2">
                                <span>⚔️</span> {tutorName}'s Battle Report
                              </h4>
                              <p className="text-xs text-slate-400 mt-0.5">
                                Your code survived <span className="text-violet-400 font-bold">{adversarialResults.survived}</span>/{adversarialResults.total} attacks
                              </p>
                            </div>

                            {/* Badge / Animation indicator */}
                            <div className="flex items-center gap-2">
                              {adversarialResults.survived === 5 ? (
                                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 flex items-center gap-1 shadow-md shadow-yellow-500/5">
                                  <span>🏅</span> Battle Hardened
                                </span>
                              ) : adversarialResults.survived >= 3 ? (
                                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                                  <span>🛡️</span> Solid Defense
                                </span>
                              ) : (
                                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center gap-1">
                                  <span>⚠️</span> Needs Hardening
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Golden Shield Animation if 5/5 */}
                          {adversarialResults.survived === 5 && (
                            <div className="flex flex-col items-center justify-center py-6 bg-gradient-to-b from-yellow-500/10 to-transparent border border-yellow-500/20 rounded-xl relative overflow-hidden">
                              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(234,179,8,0.08)_0%,transparent_70%)] animate-pulse"></div>
                              <div className="relative w-20 h-20 flex items-center justify-center bg-yellow-500/10 rounded-full border border-yellow-500/30 shadow-[0_0_20px_rgba(234,179,8,0.2)] animate-bounce">
                                <svg 
                                  xmlns="http://www.w3.org/2000/svg" 
                                  viewBox="0 0 24 24" 
                                  fill="currentColor" 
                                  className="w-12 h-12 text-yellow-400"
                                >
                                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                                </svg>
                              </div>
                              <h3 className="text-base font-black text-yellow-400 mt-4 tracking-wide uppercase">Battle Hardened!</h3>
                              <p className="text-xs text-yellow-200/70 mt-1 font-medium">+75 XP Bonus Awarded</p>
                            </div>
                          )}

                          {/* Tip for 0-2/5 */}
                          {adversarialResults.survived <= 2 && adversarialResults.tip && (
                            <div className="bg-amber-500/10 border border-amber-500/20 text-amber-300 rounded-xl p-4 flex items-start gap-3">
                              <span className="text-lg">💡</span>
                              <div>
                                <div className="font-bold text-xs uppercase tracking-wider text-amber-400">Sage's Advice</div>
                                <p className="text-xs leading-relaxed mt-1 font-sans">{adversarialResults.tip}</p>
                              </div>
                            </div>
                          )}

                          {/* Attacks List */}
                          <div className="space-y-2.5">
                            {adversarialResults.attacks.map((attack: any, idx: number) => {
                              const isExpanded = expandedAttackIndex === idx;
                              return (
                                <div 
                                  key={idx} 
                                  className="bg-[#0f141d] border border-white/5 rounded-xl overflow-hidden hover:border-white/10 transition-colors"
                                >
                                  <div 
                                    className="p-3.5 flex items-center justify-between cursor-pointer select-none"
                                    onClick={() => setExpandedAttackIndex(isExpanded ? null : idx)}
                                  >
                                    <div className="flex items-center gap-3">
                                      {attack.survived ? (
                                        <span className="inline-flex items-center gap-1 text-[10px] font-extrabold bg-emerald-500/10 text-emerald-400 px-2.5 py-0.5 rounded-full border border-emerald-500/20 uppercase tracking-wide">
                                          🛡️ Survived
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center gap-1 text-[10px] font-extrabold bg-rose-500/10 text-rose-400 px-2.5 py-0.5 rounded-full border border-rose-500/20 uppercase tracking-wide">
                                          💀 Broke
                                        </span>
                                      )}
                                      <span className="text-xs font-mono text-slate-300 truncate max-w-[200px] sm:max-w-md">
                                        Input: {attack.input.trim().substring(0, 30)}{attack.input.length > 30 ? '...' : ''}
                                      </span>
                                    </div>
                                    <div className="text-slate-500 text-xs">
                                      {isExpanded ? '▲' : '▼'}
                                    </div>
                                  </div>

                                  {isExpanded && (
                                    <div className="px-4 pb-4 pt-1 border-t border-white/5 bg-white/[0.01] space-y-3 font-sans text-xs">
                                      <div className="mt-2">
                                        <span className="text-slate-400 block font-semibold mb-1">Targeted Weakness:</span>
                                        <p className="text-slate-200 bg-white/5 p-2.5 rounded-lg border border-white/5 leading-relaxed">{attack.targetedWeakness}</p>
                                      </div>
                                      <div>
                                        <span className="text-slate-400 block font-semibold mb-1">Confidence of Break:</span>
                                        <span className={`px-2 py-0.5 rounded font-mono font-bold capitalize text-[10px] ${
                                          attack.confidence === 'will_break' 
                                            ? 'bg-rose-500/20 text-rose-400' 
                                            : attack.confidence === 'might_break' 
                                              ? 'bg-amber-500/20 text-amber-400' 
                                              : 'bg-emerald-500/20 text-emerald-400'
                                        }`}>
                                          {attack.confidence.replace('_', ' ')}
                                        </span>
                                      </div>
                                      <div className="grid grid-cols-2 gap-4">
                                        <div>
                                          <span className="text-slate-400 block font-semibold mb-1 font-sans">Expected Output:</span>
                                          <pre className="text-slate-300 bg-[#080b11] p-2.5 rounded border border-white/5 font-mono overflow-x-auto whitespace-pre-wrap">{attack.expected || '(empty)'}</pre>
                                        </div>
                                        <div>
                                          <span className="text-slate-400 block font-semibold mb-1 font-sans">Actual Output:</span>
                                          <pre className={`p-2.5 rounded border font-mono overflow-x-auto whitespace-pre-wrap ${
                                            attack.survived 
                                              ? 'text-emerald-300 bg-[#080b11] border-emerald-500/10' 
                                              : 'text-rose-300 bg-rose-950/10 border-rose-500/10'
                                          }`}>{attack.actual || '(empty)'}</pre>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
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
                {/* Large interactable owl avatar */}
                <div className="relative group cursor-pointer w-9 h-9 rounded-full bg-emerald-500 flex items-center justify-center font-bold text-white shadow-md shadow-emerald-500/20 transition-all duration-300 hover:scale-110 flex-shrink-0">
                  <span className="group-hover:opacity-0 transition-opacity duration-200">
                    {(tutorName[0] || 'S').toUpperCase()}
                  </span>
                  <span className="absolute opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-lg transform group-hover:rotate-12 transition-transform duration-300 select-none">
                    🦉
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
                  const isLatest = idx === aiMessages.length - 1 && msg.role === 'ai'
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
                          {isLatest 
                            ? <TypewriterText text={msg.content} speed={10} />
                            : msg.content
                          }
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
              <div className="border-t border-white/5 bg-[#0b0f19] flex-shrink-0">
                {/* Collapsible header */}
                <button
                  onClick={() => setVisualizerCollapsed(prev => !prev)}
                  className="w-full flex items-center justify-between px-4 py-2 hover:bg-white/5 transition-colors group"
                >
                  <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                    <span>⚡</span>
                    Visual Trace
                    {isVisualizing && (
                      <span className="text-slate-500 font-normal">
                        — generating...
                      </span>
                    )}
                  </span>
                  <span className="text-slate-500 text-xs group-hover:text-slate-300 transition-colors">
                    {visualizerCollapsed ? '▲ show' : '▼ hide'}
                  </span>
                </button>

                {/* Collapsible body */}
                {!visualizerCollapsed && (
                  <div className="px-4 pb-4">
                    {isVisualizing ? (
                      <div className="w-full h-[200px] bg-white/5 animate-pulse rounded-xl border border-white/5 flex items-center justify-center">
                        <span className="text-xs text-slate-500 font-semibold">
                          Generating visual trace...
                        </span>
                      </div>
                    ) : (
                      visualData && <AlgorithmVisualizer data={visualData} />
                    )}
                  </div>
                )}
              </div>
            )}

            {/* AI Prompts Suggestions */}
            <div className="px-3 pt-2 pb-1 bg-[#0f141d]/50 border-t border-white/5">
              <div className="flex flex-wrap gap-1">
                <button
                  onClick={() => handleTutorRequest('why_failing')}
                  disabled={aiLoading || runResults.length === 0}
                  title={runResults.length === 0 ? "Run your code first to unlock the tutor" : ""}
                  className="px-2 py-1 bg-[#1c2433] hover:bg-[#283247] border border-white/5 text-[10px] text-[#c9d1d9] font-bold rounded-md disabled:opacity-50 disabled:pointer-events-none transition-all"
                >
                  🔍 Why failing?
                </button>
                <button
                  onClick={() => handleTutorRequest('explain_concept')}
                  disabled={aiLoading || runResults.length === 0}
                  title={runResults.length === 0 ? "Run your code first to unlock the tutor" : ""}
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
                  title={runResults.length === 0 ? "Run your code first to unlock the tutor" : ""}
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
      {showSolvedOverlay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none animate-fade-in">
          <div className="flex flex-col items-center gap-4 bg-gray-900/80 backdrop-blur-md px-16 py-10 rounded-3xl border border-emerald-500/30 shadow-2xl shadow-emerald-500/20">
            <div className="text-6xl animate-bounce">🎉</div>
            <p className="text-2xl font-black text-white tracking-tight">
              Problem Solved!
            </p>
            <p className="text-sm text-emerald-400 font-semibold">
              All test cases passed
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
