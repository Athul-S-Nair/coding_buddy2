'use client'

import { useEffect, useState } from 'react'
import LinkComponent from 'next/link'
import { useRouter } from 'next/navigation'
import { Settings } from 'lucide-react'
import dynamic from 'next/dynamic'

const Mascot = dynamic(() => import('./components/Mascot'), { ssr: false })

interface Problem {
  id: string
  title: string
  difficulty: 'Easy' | 'Medium' | 'Hard'
}

interface ProgressData {
  solvedProblems: string[]
  totalSolved: number
  streak: number
}

import { API_URL } from '../lib/api'

export default function Home() {
  const router = useRouter()
  const [problems, setProblems] = useState<Problem[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<{ id: string; username: string } | null>(null)
  const [progress, setProgress] = useState<ProgressData | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedDifficulty, setSelectedDifficulty] = useState<'All' | 'Easy' | 'Medium' | 'Hard'>('All')
  const [tutorName, setTutorName] = useState('Sage')
  const [kittyText, setKittyText] = useState("Purr... ready to learn? Let's crack some coding challenges today!")
  const [kittyEmoji, setKittyEmoji] = useState('🐱')

  useEffect(() => {
    const savedName = localStorage.getItem('tutorName')
    if (savedName) {
      setTutorName(savedName)
    }
  }, [])

  const handleKittyClick = () => {
    const reactions = [
      { emoji: '😻', text: 'Purrfect logic! Keep going!' },
      { emoji: '😽', text: 'Mrow! I love coding with you!' },
      { emoji: '😸', text: 'You are on the right track!' },
      { emoji: '😺', text: `${tutorName} is cheering you on!` },
      { emoji: '🦁', text: 'Roar! You are a coding lion!' }
    ]
    const randomReaction = reactions[Math.floor(Math.random() * reactions.length)]
    setKittyEmoji(randomReaction.emoji)
    setKittyText(randomReaction.text)
    setTimeout(() => {
      setKittyEmoji('🐱')
      setKittyText("Purr... ready to learn? Let's crack some coding challenges today!")
    }, 3000)
  }

  const fetchData = async () => {
    try {
      const problemRes = await fetch(`${API_URL}/api/problems`)
      if (problemRes.ok) {
        const problemData = await problemRes.json()
        setProblems(problemData)
      }

      try {
        const userRes = await fetch(`${API_URL}/api/me`, { credentials: 'include' })
        if (userRes.ok) {
          const userData = await userRes.json()
          setUser(userData)

          const progRes = await fetch(`${API_URL}/api/progress/${userData.id}`)
          if (progRes.ok) {
            const progData = await progRes.json()
            setProgress(progData)
          }
        } else {
          setUser(null)
          setProgress(null)
        }
      } catch (e) {
        console.error('Auth error', e)
      }
    } catch (e) {
      console.error('Error fetching data', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleLogout = async () => {
    try {
      const response = await fetch(`${API_URL}/api/logout`, {
        method: 'POST',
        credentials: 'include'
      })
      if (response.ok) {
        setUser(null)
        setProgress(null)
        router.refresh()
      }
    } catch (e) {
      console.error('Logout error', e)
    }
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

  // Filter problems
  const filteredProblems = problems.filter(p => {
    const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) || p.id === searchQuery
    const matchesDifficulty = selectedDifficulty === 'All' || p.difficulty === selectedDifficulty
    return matchesSearch && matchesDifficulty
  })

  // Calculate difficulty stats
  const totalEasy = problems.filter(p => p.difficulty === 'Easy').length
  const totalMedium = problems.filter(p => p.difficulty === 'Medium').length
  const totalHard = problems.filter(p => p.difficulty === 'Hard').length

  const solvedEasy = progress ? problems.filter(p => p.difficulty === 'Easy' && progress.solvedProblems.includes(p.id)).length : 0
  const solvedMedium = progress ? problems.filter(p => p.difficulty === 'Medium' && progress.solvedProblems.includes(p.id)).length : 0
  const solvedHard = progress ? problems.filter(p => p.difficulty === 'Hard' && progress.solvedProblems.includes(p.id)).length : 0

  return (
    <main className="min-h-screen bg-[#080b11] text-[#f3f4f6] pb-12">
      {/* Premium Header */}
      <nav className="glass-panel sticky top-0 z-40 px-6 py-4 flex justify-between items-center shadow-lg backdrop-blur-md">
        <LinkComponent href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-violet-500 to-indigo-500 flex items-center justify-center font-bold text-white shadow-md shadow-violet-500/20">
            C
          </div>
          <span className="text-xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-indigo-400">
            Coding Buddy
          </span>
        </LinkComponent>

        <div className="flex items-center gap-4">
          <LinkComponent 
            href="/settings" 
            className="text-[#8b949e] hover:text-white transition-colors p-1.5 hover:bg-white/5 rounded-full"
            title="Settings"
          >
            <Settings className="w-4.5 h-4.5" />
          </LinkComponent>
          {user ? (
            <div className="flex items-center gap-4 bg-white/5 border border-white/5 pl-4 pr-2 py-1.5 rounded-full">
              <span className="text-sm font-medium text-white">@{user.username}</span>
              <button
                onClick={handleLogout}
                className="px-3 py-1 bg-white/10 hover:bg-rose-500/20 hover:text-rose-300 border border-white/5 rounded-full text-xs font-semibold transition-all"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <LinkComponent
              href="/login"
              className="px-4 py-1.5 bg-gradient-to-r from-[#8b5cf6] to-[#6366f1] hover:from-[#7c3aed] hover:to-[#4f46e5] text-white rounded-full text-sm font-semibold transition-all shadow-md shadow-violet-500/15"
            >
              Sign In
            </LinkComponent>
          )}
        </div>
      </nav>

      {/* Main Grid Content */}
      <div className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Problem List (takes 2 cols on desktop) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold tracking-tight text-white">Coding Arena</h2>
            <LinkComponent
              href="/create"
              className="px-3.5 py-1.5 bg-white/5 hover:bg-violet-500/10 hover:text-violet-400 border border-white/5 hover:border-violet-500/30 rounded-lg text-xs font-semibold transition-all flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Create Custom Problem
            </LinkComponent>
          </div>

          {/* Search and Filters Bar */}
          <div className="flex flex-col sm:flex-row gap-3 bg-white/5 border border-white/5 p-3 rounded-xl">
            <div className="relative flex-1">
              <svg className="absolute left-3 top-2.5 w-4 h-4 text-[#8b949e]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search problems by name or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#0d1117] text-white border border-white/5 hover:border-white/10 focus:border-[#8b5cf6] focus:outline-none rounded-lg pl-9 pr-4 py-2 text-sm transition-all"
              />
            </div>
            
            <div className="flex bg-[#0d1117] rounded-lg p-0.5 border border-white/5">
              {(['All', 'Easy', 'Medium', 'Hard'] as const).map((diff) => (
                <button
                  key={diff}
                  onClick={() => setSelectedDifficulty(diff)}
                  className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
                    selectedDifficulty === diff
                      ? 'bg-gradient-to-r from-violet-500/30 to-indigo-500/30 border border-violet-500/40 text-white'
                      : 'text-[#8b949e] hover:text-white'
                  }`}
                >
                  {diff}
                </button>
              ))}
            </div>
          </div>

          {/* Problem List */}
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map(n => (
                <div key={n} className="h-16 bg-white/5 animate-pulse rounded-xl border border-white/5" />
              ))}
            </div>
          ) : filteredProblems.length === 0 ? (
            <div className="text-center py-12 bg-white/5 border border-white/5 rounded-2xl">
              <p className="text-[#8b949e] text-sm">No problems found matching filters.</p>
            </div>
          ) : (
            <div className="space-y-3 animate-fade-in-up">
              {filteredProblems.map((problem) => {
                const isSolved = progress?.solvedProblems.includes(problem.id)
                return (
                  <LinkComponent
                    key={problem.id}
                    href={`/problem/${problem.id}`}
                    className="block p-4 bg-white/5 border border-white/5 hover:border-white/15 rounded-xl hover:bg-white/[0.07] transition-all group"
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        {isSolved ? (
                          <span className="flex items-center justify-center bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-full w-5 h-5 text-[10px] font-bold">
                            ✓
                          </span>
                        ) : (
                          <span className="flex items-center justify-center bg-white/5 text-white/20 border border-white/5 rounded-full w-5 h-5 text-[10px]">
                            •
                          </span>
                        )}
                        <span className="text-white font-medium group-hover:text-violet-400 transition-colors">
                          {problem.id}. {problem.title}
                        </span>
                      </div>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${getDifficultyColor(problem.difficulty)} ${getDifficultyBg(problem.difficulty)}`}>
                        {problem.difficulty}
                      </span>
                    </div>
                  </LinkComponent>
                )
              })}
            </div>
          )}
        </div>

        {/* Right Column: Statistics & User Profile (takes 1 col) */}
        <div className="space-y-6">
          {/* User Profile Card / Hologram */}
          {!user ? (
            /* Holographic Kitten Assistant Card */
            <div className="glass-card p-6 flex flex-col items-center justify-center text-center overflow-hidden relative group border-cyan-500/20 shadow-lg shadow-cyan-500/5 hover:border-violet-500/30 hover:shadow-violet-500/10 min-h-[360px]">
              {/* Holographic grid scan lines */}
              <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(6,182,212,0.03)_1px,transparent_1px)] bg-[size:100%_4px] pointer-events-none animate-[pulse_2s_infinite]"></div>
              
              {/* Mascot Lottie Animation */}
              <div className="mb-6 flex justify-center items-center">
                <Mascot />
              </div>

              {/* Holographic labels */}
              <div className="space-y-3 relative z-10">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-[10px] font-mono font-bold tracking-widest uppercase animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping"></span>
                  {tutorName} Hologram
                </div>
                <h3 className="text-white font-bold text-base group-hover:text-cyan-300 transition-colors">
                  Interactive AI Assistant
                </h3>
                <div className="min-h-[50px] flex items-center justify-center">
                  <p className="text-xs text-slate-400 max-w-[200px] leading-relaxed transition-all duration-300">
                    "{kittyText}"
                  </p>
                </div>
              </div>

              <div className="w-full mt-6 flex flex-col gap-2 relative z-10">
                <LinkComponent
                  href="/login"
                  className="w-full py-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-sm font-semibold rounded-lg transition-all text-center shadow-lg shadow-violet-500/20"
                >
                  Log In / Register
                </LinkComponent>
              </div>

              {/* Floating interaction tooltip bubble */}
              <div className="absolute bottom-2 text-[9px] font-mono text-slate-500 tracking-wider opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-1 group-hover:translate-y-0 select-none">
                * CLICK THE KITTEN TO INTERACT *
              </div>
            </div>
          ) : (
            /* User Profile Card */
            <div className="glass-card p-6 flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-violet-500 to-indigo-500 flex items-center justify-center font-bold text-white text-2xl shadow-lg shadow-violet-500/25 mb-4">
                {user.username[0].toUpperCase()}
              </div>
              <h3 className="text-lg font-bold text-white mb-1">
                Welcome back, {user.username}!
              </h3>
              <p className="text-xs text-[#8b949e] mb-6">
                Track your streak and progress statistics
              </p>

              {progress && (
                <div className="w-full grid grid-cols-2 gap-4 py-4 border-t border-b border-white/5 mb-6">
                  <div>
                    <p className="text-2xl font-black text-white">{progress.totalSolved}</p>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-[#8b949e]">Solved</p>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="flex items-center gap-1.5 streak-flame">
                      <span className="text-2xl font-black">{progress.streak}</span>
                      <span className="text-lg">🔥</span>
                    </div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-[#8b949e]">Day Streak</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Progress Breakdown */}
          {progress && (
            <div className="glass-card p-6 space-y-4">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-[#8b949e]">Solving Progress</h4>
              
              <div className="space-y-3">
                {/* Easy */}
                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-emerald-400">Easy</span>
                    <span className="text-white">{solvedEasy} / {totalEasy}</span>
                  </div>
                  <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-emerald-400 rounded-full transition-all duration-500" 
                      style={{ width: `${totalEasy > 0 ? (solvedEasy / totalEasy) * 100 : 0}%` }}
                    />
                  </div>
                </div>

                {/* Medium */}
                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-amber-400">Medium</span>
                    <span className="text-white">{solvedMedium} / {totalMedium}</span>
                  </div>
                  <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-amber-400 rounded-full transition-all duration-500" 
                      style={{ width: `${totalMedium > 0 ? (solvedMedium / totalMedium) * 100 : 0}%` }}
                    />
                  </div>
                </div>

                {/* Hard */}
                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-rose-400">Hard</span>
                    <span className="text-white">{solvedHard} / {totalHard}</span>
                  </div>
                  <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-rose-400 rounded-full transition-all duration-500" 
                      style={{ width: `${totalHard > 0 ? (solvedHard / totalHard) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
