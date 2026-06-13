'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Award, Flame, Zap, BarChart2, Calendar, Settings, ArrowLeft } from 'lucide-react'
import { API_URL } from '../../lib/api'

function useCountUp(target: number, duration = 1000) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (target === 0) {
      setCount(0)
      return
    }
    let start = 0
    const increment = target / (duration / 16)
    const timer = setInterval(() => {
      start += increment
      if (start >= target) {
        setCount(target)
        clearInterval(timer)
      } else {
        setCount(Math.floor(start))
      }
    }, 16)
    return () => clearInterval(timer)
  }, [target, duration])
  return count
}

function AnimatedProgressStat({ value }: { value: number }) {
  const count = useCountUp(value, 800)
  return (
    <div className="text-4xl font-extrabold text-white">{count}</div>
  )
}

function AnimatedProgressStreak({ value }: { value: number }) {
  const count = useCountUp(value, 800)
  return (
    <span>{count}</span>
  )
}

interface ProgressData {
  solvedProblems: string[]
  totalSolved: number
  streak: number
  cleanSolvesCount: number
  solveHistory: Array<{
    problemId: string
    title: string
    difficulty: string
    concept: string
    solvedAt: string
    askedTutor: boolean
    language: string
    timeTaken: number
  }>
  conceptMastery: Record<string, number>
}

interface Node {
  name: string
  x: number
  y: number
}

function GithubIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
      <path d="M9 18c-4.51 2-5-2-7-2" />
    </svg>
  )
}

const nodes: Node[] = [
  { name: 'Binary Search', x: 80, y: 70 },
  { name: 'Stacks & Queues', x: 80, y: 430 },
  { name: 'Arrays', x: 80, y: 250 },
  { name: 'Two Pointers', x: 220, y: 140 },
  { name: 'Hash Maps', x: 220, y: 250 },
  { name: 'Sliding Window', x: 220, y: 360 },
  { name: 'Linked Lists', x: 360, y: 140 },
  { name: 'Strings', x: 360, y: 250 },
  { name: 'Trees', x: 500, y: 140 },
  { name: 'Graphs', x: 640, y: 70 },
  { name: 'Recursion', x: 640, y: 210 },
  { name: 'Dynamic Programming', x: 760, y: 360 }
]

const connections = [
  { from: 'Arrays', to: 'Two Pointers' },
  { from: 'Arrays', to: 'Hash Maps' },
  { from: 'Arrays', to: 'Sliding Window' },
  { from: 'Two Pointers', to: 'Linked Lists' },
  { from: 'Hash Maps', to: 'Strings' },
  { from: 'Sliding Window', to: 'Dynamic Programming' },
  { from: 'Linked Lists', to: 'Trees' },
  { from: 'Trees', to: 'Graphs' },
  { from: 'Trees', to: 'Recursion' },
  { from: 'Recursion', to: 'Dynamic Programming' }
]

export default function ProgressDashboard() {
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<{ id: string; username: string } | null>(null)
  const [progress, setProgress] = useState<ProgressData | null>(null)
  const [selectedNode, setSelectedNode] = useState<Node | null>(null)

  useEffect(() => {
    const init = async () => {
      try {
        const meRes = await fetch(`${API_URL}/api/me`, { credentials: 'include' })
        if (meRes.ok) {
          const meData = await meRes.json()
          setUser(meData)
          
          const progressRes = await fetch(`${API_URL}/api/progress/${meData.id}`)
          if (progressRes.ok) {
            const progressData = await progressRes.json()
            setProgress(progressData)
          }
        }
      } catch (err) {
        console.error('Failed to load progress details:', err)
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [])

  const renderDifficultyBadge = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-500/10 text-green-400 border border-green-500/20">
            Easy
          </span>
        )
      case 'Medium':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
            Medium
          </span>
        )
      case 'Hard':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-500/10 text-red-400 border border-red-500/20">
            Hard
          </span>
        )
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-gray-500/10 text-gray-400 border border-gray-500/20">
            {difficulty}
          </span>
        )
    }
  }

  // Heatmap Weeks Calculation
  const getHeatmapWeeks = () => {
    const weeks = []
    const today = new Date()
    const currentDayOfWeek = today.getDay()
    const startOfCurrentWeek = new Date(today)
    startOfCurrentWeek.setDate(today.getDate() - currentDayOfWeek)
    
    const startDate = new Date(startOfCurrentWeek)
    startDate.setDate(startOfCurrentWeek.getDate() - 11 * 7)
    
    let currentCursor = new Date(startDate)
    for (let w = 0; w < 12; w++) {
      const weekDays = []
      for (let d = 0; d < 7; d++) {
        weekDays.push(new Date(currentCursor))
        currentCursor.setDate(currentCursor.getDate() + 1)
      }
      weeks.push(weekDays)
    }
    return weeks
  }

  const weeks = getHeatmapWeeks()

  // Group solved count by local date YYYY-MM-DD
  const countByDate: Record<string, number> = {}
  if (progress?.solveHistory) {
    progress.solveHistory.forEach((solve) => {
      if (solve.solvedAt) {
        const solveDate = new Date(solve.solvedAt)
        const year = solveDate.getFullYear()
        const month = String(solveDate.getMonth() + 1).padStart(2, '0')
        const date = String(solveDate.getDate()).padStart(2, '0')
        const dateStr = `${year}-${month}-${date}`
        countByDate[dateStr] = (countByDate[dateStr] || 0) + 1
      }
    })
  }

  // Month labels
  const monthLabels: Array<{ label: string; index: number }> = []
  let lastMonth = -1
  weeks.forEach((week, wIndex) => {
    const firstDay = week[0]
    const month = firstDay.getMonth()
    if (month !== lastMonth) {
      monthLabels.push({
        label: firstDay.toLocaleString('default', { month: 'short' }),
        index: wIndex
      })
      lastMonth = month
    }
  })

  // Sort history recent first
  const sortedHistory = progress?.solveHistory
    ? [...progress.solveHistory].sort((a, b) => new Date(b.solvedAt).getTime() - new Date(a.solvedAt).getTime())
    : []

  if (loading) {
    return (
      <main className="min-h-screen bg-[#080b11] text-[#f3f4f6] pb-12">
        <nav className="glass-panel sticky top-0 z-40 px-6 py-4 flex items-center justify-between shadow-lg backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 bg-gray-800 rounded animate-pulse"></div>
            <div className="w-32 h-6 bg-gray-800 rounded animate-pulse"></div>
          </div>
        </nav>
        <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-gray-800 rounded-xl animate-pulse"></div>
            ))}
          </div>
          <div className="h-[520px] bg-gray-800 rounded-xl animate-pulse"></div>
          <div className="h-40 bg-gray-800 rounded-xl animate-pulse"></div>
        </div>
      </main>
    )
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-[#080b11] text-[#f3f4f6] flex items-center justify-center">
        <div className="glass-card p-8 text-center max-w-sm space-y-6">
          <h2 className="text-xl font-bold text-white">Sign In Required</h2>
          <p className="text-sm text-slate-400 leading-relaxed">
            Please log in to track your solving streak, view your personalized concept skill tree, and view details.
          </p>
          <Link href="/login" className="block w-full py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold rounded-lg shadow-lg shadow-violet-500/20 transition-all">
            Sign In
          </Link>
        </div>
      </main>
    )
  }

  const conceptMastery = progress?.conceptMastery || {}

  return (
    <main className="min-h-screen bg-[#080b11] text-[#f3f4f6] pb-16" onClick={() => setSelectedNode(null)}>
      {/* Top Header */}
      <nav className="glass-panel sticky top-0 z-40 px-6 py-4 flex items-center justify-between shadow-lg backdrop-blur-md">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-[#8b949e] hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="h-4 w-px bg-white/10"></div>
          <span className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-violet-400" />
            Platform Progress & Skill Tree
          </span>
        </div>
        <div className="flex items-center gap-3">
          <a
            href="https://github.com/Amritha-Malapaka"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#8b949e] hover:text-white transition-colors p-1.5 hover:bg-white/5 rounded-lg flex items-center gap-1.5 text-xs font-semibold"
            title="GitHub Profile"
          >
            <GithubIcon className="w-4 h-4" />
            <span>GitHub</span>
          </a>
          <Link href="/settings" className="text-[#8b949e] hover:text-white transition-colors p-1.5 hover:bg-white/5 rounded-lg" title="Settings">
            <Settings className="w-4 h-4" />
          </Link>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-10 space-y-10">
        
        {/* SECTION 1: Stats Bar */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Problems Solved */}
          <div className="bg-gray-800 rounded-xl p-6 shadow-lg">
            <AnimatedProgressStat value={progress?.totalSolved || 0} />
            <div className="text-gray-400 text-sm mt-2 font-medium">
              Problems Solved
            </div>
          </div>

          {/* Card 2: Current Streak */}
          <div className="bg-gray-800 rounded-xl p-6 shadow-lg">
            <div className="text-4xl font-extrabold text-white flex items-center gap-2">
              <AnimatedProgressStreak value={progress?.streak || 0} />
              <span className="text-3xl">🔥</span>
            </div>
            <div className="text-gray-400 text-sm mt-2 font-medium">
              Day Streak
            </div>
          </div>

          {/* Card 3: Hint-free solves */}
          <div className="bg-gray-800 rounded-xl p-6 shadow-lg">
            <AnimatedProgressStat value={progress?.cleanSolvesCount || 0} />
            <div className="text-gray-400 text-sm mt-2 font-medium">
              Clean Solves
            </div>
          </div>
        </section>

        {/* SECTION 2: Skill Tree */}
        <section className="glass-card p-6 bg-gray-800/20 border border-white/5 rounded-xl shadow-lg relative overflow-hidden">
          <div className="mb-4">
            <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <Award className="w-5 h-5 text-violet-400" />
              Algorithm Concept Skill Tree
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Visualize dependencies and mastery levels across major algorithms. Click a node to inspect solves.
            </p>
          </div>

          {/* SVG ViewBox Graph */}
          <div className="w-full aspect-[8/5] bg-[#0d1117]/40 rounded-xl border border-white/5 relative overflow-hidden">
            <svg viewBox="0 0 800 500" className="w-full h-full">
              {/* SVG Grid Glow */}
              <defs>
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#ffffff" strokeWidth="0.5" opacity="0.03" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />

              {/* Connections (Lines) */}
              {connections.map((conn, index) => {
                const fromNode = nodes.find(n => n.name === conn.from)
                const toNode = nodes.find(n => n.name === conn.to)
                if (!fromNode || !toNode) return null

                const fromCount = conceptMastery[fromNode.name] || 0
                const toCount = conceptMastery[toNode.name] || 0
                const isUnlocked = fromCount >= 1 && toCount >= 1

                const strokeColor = isUnlocked ? '#10b981' : '#374151'
                const strokeWidth = isUnlocked ? 2 : 1
                const opacity = isUnlocked ? 0.8 : 0.4

                return (
                  <line
                    key={index}
                    x1={fromNode.x}
                    y1={fromNode.y}
                    x2={toNode.x}
                    y2={toNode.y}
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    opacity={opacity}
                    className="transition-all duration-300"
                  />
                )
              })}

              {/* Nodes */}
              {nodes.map((node, index) => {
                const count = conceptMastery[node.name] || 0
                
                let fill = '#374151'
                let stroke = 'none'
                let strokeWidth = 0
                let glowStyle = {}
                let textClass = 'text-gray-500'

                if (count >= 3) {
                  fill = '#10b981'
                  textClass = 'text-white'
                  glowStyle = { filter: 'drop-shadow(0 0 8px #10b981)' }
                } else if (count >= 1) {
                  fill = '#064e3b'
                  stroke = '#059669'
                  strokeWidth = 2
                  textClass = 'text-emerald-400'
                }

                const isSelected = selectedNode?.name === node.name

                return (
                  <g 
                    key={index} 
                    className="cursor-pointer select-none group"
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelectedNode(node)
                    }}
                  >
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r="28"
                      fill={fill}
                      stroke={isSelected ? '#ffffff' : stroke}
                      strokeWidth={isSelected ? 3 : strokeWidth}
                      style={glowStyle}
                      className="transition-all duration-300 hover:scale-105"
                    />
                    <text
                      x={node.x}
                      y={node.y + 44}
                      fill="currentColor"
                      textAnchor="middle"
                      className={`text-xs font-semibold pointer-events-none select-none ${textClass}`}
                    >
                      {node.name}
                    </text>
                  </g>
                )
              })}

              {/* Tooltip Overlay */}
              {selectedNode && (
                <g transform={`translate(${selectedNode.x}, ${selectedNode.y + 60})`} className="pointer-events-none">
                  <rect
                    x="-105"
                    y="-12"
                    width="210"
                    height="24"
                    rx="6"
                    fill="#0f172a"
                    stroke="#334155"
                    strokeWidth="1"
                    className="opacity-95 shadow-2xl"
                  />
                  <text
                    fill="#f1f5f9"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="text-[10px] font-bold font-mono tracking-wider"
                  >
                    {conceptMastery[selectedNode.name] || 0} problems solved · {selectedNode.name}
                  </text>
                </g>
              )}
            </svg>
          </div>
        </section>

        {/* SECTION 3: Activity Heatmap */}
        <section className="glass-card p-6 bg-gray-800/20 border border-white/5 rounded-xl shadow-lg">
          <div className="mb-4">
            <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <Calendar className="w-5 h-5 text-violet-400" />
              Activity Heatmap (Last 12 Weeks)
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Visual track of daily challenge submissions. Color indicates complexity/intensity of solves.
            </p>
          </div>

          <div className="flex items-end gap-3 p-4 bg-[#0d1117]/30 border border-white/5 rounded-xl overflow-x-auto">
            {/* Days of week labels */}
            <div className="flex flex-col justify-between text-[9px] text-slate-500 h-[80px] pb-[1px] font-mono font-bold pr-1">
              <span>Sun</span>
              <span>Tue</span>
              <span>Thu</span>
              <span>Sat</span>
            </div>

            {/* Heatmap Grid & Month labels */}
            <div className="flex-1 min-w-[200px]">
              {/* Month Labels Row */}
              <div className="relative h-4 w-full text-[10px] text-slate-500 font-mono font-bold uppercase tracking-wider mb-2">
                {monthLabels.map((m, i) => (
                  <span
                    key={i}
                    className="absolute"
                    style={{ left: `${m.index * 12}px` }}
                  >
                    {m.label}
                  </span>
                ))}
              </div>

              {/* Grid Weeks */}
              <div className="flex gap-[2px]">
                {weeks.map((week, wIndex) => (
                  <div key={wIndex} className="flex flex-col gap-[2px]">
                    {week.map((day, dIndex) => {
                      const year = day.getFullYear()
                      const month = String(day.getMonth() + 1).padStart(2, '0')
                      const date = String(day.getDate()).padStart(2, '0')
                      const dateStr = `${year}-${month}-${date}`
                      const count = countByDate[dateStr] || 0
                      
                      let bgColor = 'bg-gray-800'
                      if (count === 1) bgColor = 'bg-emerald-900'
                      else if (count === 2) bgColor = 'bg-emerald-700'
                      else if (count >= 3) bgColor = 'bg-emerald-500'

                      return (
                        <div
                          key={dIndex}
                          className={`w-[10px] h-[10px] rounded-[1.5px] transition-all hover:scale-110 cursor-pointer ${bgColor}`}
                          title={`${count} problem(s) solved on ${day.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`}
                        />
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 4: Problem History Table */}
        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <Zap className="w-5 h-5 text-violet-400" />
              Submission Solve History
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Detailed chronological record of solved algorithms. Clean solves performed without using tutor hints are marked with a bolt.
            </p>
          </div>

          {sortedHistory.length === 0 ? (
            <div className="text-center py-12 bg-[#0d1117]/30 border border-white/5 rounded-xl">
              <p className="text-slate-500 text-sm">No solved problems recorded yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-white/5 bg-white/5">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-white/5 text-slate-400 text-xs font-semibold uppercase tracking-wider bg-white/[0.02]">
                    <th className="py-3 px-4">Problem</th>
                    <th className="py-3 px-4">Difficulty</th>
                    <th className="py-3 px-4">Concept</th>
                    <th className="py-3 px-4">Date Solved</th>
                    <th className="py-3 px-4 text-center">Solve Type</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-slate-300">
                  {sortedHistory.map((solve, i) => (
                    <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3.5 px-4 font-medium text-white">
                        <Link href={`/problem/${solve.problemId}`} className="hover:text-violet-400 transition-colors">
                          {solve.problemId}. {solve.title}
                        </Link>
                      </td>
                      <td className="py-3.5 px-4">
                        {renderDifficultyBadge(solve.difficulty)}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-400 font-medium">
                        {solve.concept}
                      </td>
                      <td className="py-3.5 px-4 text-xs font-mono text-slate-400">
                        {new Date(solve.solvedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {!solve.askedTutor ? (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-md shadow-amber-500/10 animate-pulse" title="Clean Solve (No hints)">
                            ⚡
                          </span>
                        ) : (
                          <span className="text-xs text-slate-500 font-mono">Assisted</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

      </div>
    </main>
  )
}
