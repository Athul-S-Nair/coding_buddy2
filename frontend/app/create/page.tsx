'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Settings } from 'lucide-react'
import { API_URL } from '../../lib/api'

interface ExampleInput {
  input: string
  output: string
  explanation: string
}

interface TestCaseInput {
  input: string
  expectedOutput: string
}

export default function CreateProblem() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [difficulty, setDifficulty] = useState<'Easy' | 'Medium' | 'Hard'>('Easy')
  const [description, setDescription] = useState('')
  const [inputFormat, setInputFormat] = useState('')
  
  // Dynamic arrays
  const [examples, setExamples] = useState<ExampleInput[]>([{ input: '', output: '', explanation: '' }])
  const [constraints, setConstraints] = useState<string[]>([''])
  const [testCases, setTestCases] = useState<TestCaseInput[]>([{ input: '', expectedOutput: '' }])
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleAddExample = () => {
    setExamples([...examples, { input: '', output: '', explanation: '' }])
  }

  const handleRemoveExample = (index: number) => {
    setExamples(examples.filter((_, i) => i !== index))
  }

  const handleExampleChange = (index: number, field: keyof ExampleInput, value: string) => {
    const updated = [...examples]
    updated[index][field] = value
    setExamples(updated)
  }

  const handleAddConstraint = () => {
    setConstraints([...constraints, ''])
  }

  const handleRemoveConstraint = (index: number) => {
    setConstraints(constraints.filter((_, i) => i !== index))
  }

  const handleConstraintChange = (index: number, value: string) => {
    const updated = [...constraints]
    updated[index] = value
    setConstraints(updated)
  }

  const handleAddTestCase = () => {
    setTestCases([...testCases, { input: '', expectedOutput: '' }])
  }

  const handleRemoveTestCase = (index: number) => {
    setTestCases(testCases.filter((_, i) => i !== index))
  }

  const handleTestCaseChange = (index: number, field: keyof TestCaseInput, value: string) => {
    const updated = [...testCases]
    updated[index][field] = value
    setTestCases(updated)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    // Build the final description incorporating Input Format if provided
    const finalDescription = inputFormat.trim() 
      ? `${description.trim()}\n\nInput Format:\n${inputFormat.trim()}`
      : description.trim()

    // Filter out empty constraints
    const filteredConstraints = constraints.filter(c => c.trim().length > 0)
    
    // Validate examples and test cases
    const validExamples = examples.filter(ex => ex.output.trim().length > 0)
    const validTestCases = testCases.filter(tc => tc.expectedOutput.trim().length > 0)

    if (validTestCases.length === 0) {
      setError('At least one testcase with expected output is required')
      setLoading(false)
      return
    }

    try {
      const response = await fetch(`${API_URL}/api/problems`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: title.trim(),
          difficulty,
          description: finalDescription,
          examples: validExamples,
          constraints: filteredConstraints,
          testCases: validTestCases
        })
      })

      if (!response.ok) {
        const errData = await response.json()
        throw new Error(errData.error || 'Failed to create problem')
      }

      router.push('/')
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#080b11] text-[#f3f4f6] pb-16">
      {/* Header Bar */}
      <nav className="glass-panel sticky top-0 z-40 px-6 py-4 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-[#8b949e] hover:text-white transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6"/>
            </svg>
          </Link>
          <div className="h-4 w-px bg-white/10"></div>
          <span className="text-sm font-bold text-white tracking-tight">Create Custom Problem</span>
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
            className="text-[#8b949e] hover:text-white transition-colors p-1.5 hover:bg-white/5 rounded-full"
            title="Settings"
          >
            <Settings className="w-4 h-4" />
          </Link>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-10">
        <form onSubmit={handleSubmit} className="space-y-8 animate-fade-in-up">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-300 rounded-xl p-4 text-sm flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <span>{error}</span>
            </div>
          )}

          {/* Section 1: Basic Information */}
          <div className="glass-card p-6 space-y-5">
            <h3 className="text-white font-bold text-sm uppercase tracking-wider border-b border-white/5 pb-2">
              1. Basic Information
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#8b949e] mb-2">
                  Problem Title
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Find Fibonacci Number"
                  className="w-full bg-[#0d1117] text-white border border-white/5 hover:border-white/10 focus:border-[#8b5cf6] focus:outline-none rounded-lg px-4 py-2.5 text-sm transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#8b949e] mb-2">
                  Difficulty
                </label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value as any)}
                  className="w-full bg-[#0d1117] text-white border border-white/5 focus:border-[#8b5cf6] focus:outline-none rounded-lg px-4 py-2.5 text-sm transition-all font-bold"
                >
                  <option value="Easy">Easy</option>
                  <option value="Medium">Medium</option>
                  <option value="Hard">Hard</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#8b949e] mb-2">
                Problem Description
              </label>
              <textarea
                required
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the coding problem task here..."
                className="w-full bg-[#0d1117] text-white border border-white/5 hover:border-white/10 focus:border-[#8b5cf6] focus:outline-none rounded-lg px-4 py-2.5 text-sm transition-all font-sans"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#8b949e] mb-2">
                Input Format (Optional)
              </label>
              <textarea
                rows={2}
                value={inputFormat}
                onChange={(e) => setInputFormat(e.target.value)}
                placeholder="e.g. First line: integer n representing size..."
                className="w-full bg-[#0d1117] text-white border border-white/5 hover:border-white/10 focus:border-[#8b5cf6] focus:outline-none rounded-lg px-4 py-2.5 text-sm transition-all font-sans"
              />
            </div>
          </div>

          {/* Section 2: Examples */}
          <div className="glass-card p-6 space-y-5">
            <div className="flex justify-between items-center border-b border-white/5 pb-2">
              <h3 className="text-white font-bold text-sm uppercase tracking-wider">
                2. Examples for Description
              </h3>
              <button
                type="button"
                onClick={handleAddExample}
                className="px-2.5 py-1 bg-white/5 hover:bg-white/10 border border-white/5 rounded-md text-[10px] font-bold text-violet-400 uppercase tracking-wider"
              >
                + Add Example
              </button>
            </div>

            {examples.map((example, idx) => (
              <div key={idx} className="bg-[#0f141d] border border-white/5 rounded-xl p-4 space-y-4 relative">
                <div className="flex justify-between items-center text-xs font-bold text-[#8b949e]">
                  <span>Example {idx + 1}</span>
                  {examples.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveExample(idx)}
                      className="text-rose-400 hover:text-rose-300 text-[10px] uppercase tracking-wider"
                    >
                      Remove
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-[#8b949e] mb-1.5">Input</label>
                    <textarea
                      rows={2}
                      value={example.input}
                      onChange={(e) => handleExampleChange(idx, 'input', e.target.value)}
                      placeholder="e.g. 5"
                      className="w-full bg-[#080b11] text-white border border-white/5 focus:border-[#8b5cf6] focus:outline-none rounded-lg p-2.5 font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-[#8b949e] mb-1.5">Output</label>
                    <textarea
                      rows={2}
                      value={example.output}
                      onChange={(e) => handleExampleChange(idx, 'output', e.target.value)}
                      placeholder="e.g. 5"
                      className="w-full bg-[#080b11] text-white border border-white/5 focus:border-[#8b5cf6] focus:outline-none rounded-lg p-2.5 font-mono text-xs"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#8b949e] mb-1.5">Explanation (Optional)</label>
                  <input
                    type="text"
                    value={example.explanation}
                    onChange={(e) => handleExampleChange(idx, 'explanation', e.target.value)}
                    placeholder="Explain how input maps to output..."
                    className="w-full bg-[#080b11] text-white border border-white/5 focus:border-[#8b5cf6] focus:outline-none rounded-lg px-3 py-2 text-xs"
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Section 3: Constraints */}
          <div className="glass-card p-6 space-y-5">
            <div className="flex justify-between items-center border-b border-white/5 pb-2">
              <h3 className="text-white font-bold text-sm uppercase tracking-wider">
                3. Constraints
              </h3>
              <button
                type="button"
                onClick={handleAddConstraint}
                className="px-2.5 py-1 bg-white/5 hover:bg-white/10 border border-white/5 rounded-md text-[10px] font-bold text-violet-400 uppercase tracking-wider"
              >
                + Add Constraint
              </button>
            </div>

            <div className="space-y-2">
              {constraints.map((constraint, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <input
                    type="text"
                    value={constraint}
                    onChange={(e) => handleConstraintChange(idx, e.target.value)}
                    placeholder="e.g. 0 <= n <= 30"
                    className="flex-1 bg-[#0d1117] text-white border border-white/5 focus:border-[#8b5cf6] focus:outline-none rounded-lg px-3 py-2 text-xs font-mono"
                  />
                  {constraints.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveConstraint(idx)}
                      className="p-2 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg transition-all"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Section 4: Test Cases */}
          <div className="glass-card p-6 space-y-5">
            <div className="flex justify-between items-center border-b border-white/5 pb-2">
              <h3 className="text-white font-bold text-sm uppercase tracking-wider">
                4. Test Cases for Code Execution
              </h3>
              <button
                type="button"
                onClick={handleAddTestCase}
                className="px-2.5 py-1 bg-white/5 hover:bg-white/10 border border-white/5 rounded-md text-[10px] font-bold text-violet-400 uppercase tracking-wider"
              >
                + Add Test Case
              </button>
            </div>

            {testCases.map((testCase, idx) => (
              <div key={idx} className="bg-[#0f141d] border border-white/5 rounded-xl p-4 space-y-4 relative">
                <div className="flex justify-between items-center text-xs font-bold text-[#8b949e]">
                  <span>Test Case {idx + 1}</span>
                  {testCases.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveTestCase(idx)}
                      className="text-rose-400 hover:text-rose-300 text-[10px] uppercase tracking-wider"
                    >
                      Remove
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-[#8b949e] mb-1.5">Input Stdin</label>
                    <textarea
                      rows={2}
                      value={testCase.input}
                      onChange={(e) => handleTestCaseChange(idx, 'input', e.target.value)}
                      placeholder="Input to pass into stdin..."
                      className="w-full bg-[#080b11] text-white border border-white/5 focus:border-[#8b5cf6] focus:outline-none rounded-lg p-2.5 font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-[#8b949e] mb-1.5">Expected Output Stdout</label>
                    <textarea
                      rows={2}
                      required
                      value={testCase.expectedOutput}
                      onChange={(e) => handleTestCaseChange(idx, 'expectedOutput', e.target.value)}
                      placeholder="Expected print output..."
                      className="w-full bg-[#080b11] text-white border border-white/5 focus:border-[#8b5cf6] focus:outline-none rounded-lg p-2.5 font-mono text-xs"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Form Actions */}
          <div className="flex gap-4 justify-end">
            <Link
              href="/"
              className="px-6 py-2.5 bg-white/5 hover:bg-white/10 text-[#c9d1d9] text-sm font-semibold rounded-lg transition-all"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="px-8 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-sm font-semibold rounded-lg transition-all shadow-lg shadow-violet-500/20 disabled:opacity-50"
            >
              {loading ? 'Creating Problem...' : 'Create Problem'}
            </button>
          </div>
        </form>
      </div>
    </main>
  )
}
