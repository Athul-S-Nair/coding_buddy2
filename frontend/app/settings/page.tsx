'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Settings } from 'lucide-react'

export default function SettingsPage() {
  const [tutorName, setTutorName] = useState('')
  const [isSaved, setIsSaved] = useState(false)

  useEffect(() => {
    const savedName = localStorage.getItem('tutorName')
    setTutorName(savedName || 'Sage')
  }, [])

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    localStorage.setItem('tutorName', tutorName.trim() || 'Sage')
    setIsSaved(true)
    setTimeout(() => {
      setIsSaved(false)
    }, 2000)
  }

  return (
    <main className="min-h-screen bg-[#080b11] text-[#f3f4f6] pb-12">
      {/* Header Bar */}
      <nav className="glass-panel sticky top-0 z-40 px-6 py-4 flex items-center justify-between shadow-lg backdrop-blur-md">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-[#8b949e] hover:text-white transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6"/>
            </svg>
          </Link>
          <div className="h-4 w-px bg-white/10"></div>
          <span className="text-sm font-bold text-white tracking-tight flex items-center gap-1.5">
            <Settings className="w-4 h-4 text-violet-400" />
            Platform Settings
          </span>
        </div>
      </nav>

      {/* Card Content */}
      <div className="max-w-md mx-auto px-6 py-16">
        <div className="glass-card p-8 space-y-6 relative overflow-hidden">
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-white">Customize AI Tutor</h2>
            <p className="text-xs text-slate-400">
              Personalize your coding assistant by giving them a custom name.
            </p>
          </div>

          <form onSubmit={handleSave} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Tutor Name
              </label>
              <input
                type="text"
                value={tutorName}
                onChange={(e) => setTutorName(e.target.value)}
                placeholder="e.g. Sage, Ada, Max..."
                className="w-full bg-[#0d1117] text-white border border-white/5 hover:border-white/10 focus:border-[#8b5cf6] focus:outline-none rounded-lg px-4 py-2.5 text-sm transition-all"
                required
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <div className="h-6">
                {isSaved && (
                  <span className="text-emerald-400 text-xs font-semibold flex items-center gap-1 animate-fade-in">
                    ✓ Saved!
                  </span>
                )}
              </div>
              <button
                type="submit"
                className="px-6 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-sm font-semibold rounded-lg transition-all shadow-lg shadow-violet-500/20"
              >
                Save Settings
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  )
}
