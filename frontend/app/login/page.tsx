'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { API_URL } from '../../lib/api'

export default function Login() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch(`${API_URL}/api/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ username, password })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Invalid username or password')
      }

      // Login successful, Next.js handles route pushing
      router.push('/')
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleQuickLogin = (user: string, pass: string) => {
    setUsername(user)
    setPassword(pass)
  }

  return (
    <main className="min-h-screen bg-[#080b11] flex items-center justify-center p-4">
      <div className="w-full max-w-md glass-card p-8 animate-fade-in-up">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-indigo-400 font-sans tracking-tight mb-2">
            Coding Buddy
          </h1>
          <p className="text-[#8b949e] text-sm">Please sign in to save your solving progress</p>
        </div>

        {error && (
          <div className="mb-6 bg-red-500/10 border border-red-500/30 text-red-300 rounded-lg p-3 text-sm flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#8b949e] mb-2">
              Username
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. admin"
              className="w-full bg-[#0d1117]/80 text-white border border-white/10 hover:border-white/20 focus:border-[#8b5cf6] focus:outline-none rounded-lg px-4 py-2.5 text-sm transition-all placeholder:text-[#58626f]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#8b949e] mb-2">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-[#0d1117]/80 text-white border border-white/10 hover:border-white/20 focus:border-[#8b5cf6] focus:outline-none rounded-lg px-4 py-2.5 text-sm transition-all placeholder:text-[#58626f]"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 bg-gradient-to-r from-[#8b5cf6] to-[#6366f1] hover:from-[#7c3aed] hover:to-[#4f46e5] active:scale-[0.98] text-white font-medium rounded-lg text-sm transition-all disabled:opacity-50 disabled:pointer-events-none shadow-lg shadow-[#8b5cf6]/20"
          >
            {loading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>

        {/* Demo Accounts Panel */}
        <div className="mt-8 pt-6 border-t border-white/5">
          <p className="text-center text-xs font-semibold uppercase tracking-wider text-[#8b949e] mb-4">
            Quick Login Demo Accounts
          </p>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Admin', user: 'admin', pass: 'admin', color: 'hover:border-violet-500/30 hover:bg-violet-500/5 text-violet-400' },
              { label: 'User 1', user: 'user1', pass: 'pass1', color: 'hover:border-emerald-500/30 hover:bg-emerald-500/5 text-emerald-400' },
              { label: 'User 2', user: 'user2', pass: 'pass2', color: 'hover:border-blue-500/30 hover:bg-blue-500/5 text-blue-400' }
            ].map((account) => (
              <button
                key={account.label}
                onClick={() => handleQuickLogin(account.user, account.pass)}
                type="button"
                className={`px-3 py-2 bg-[#0d1117]/60 border border-white/5 rounded-lg text-xs font-medium transition-all ${account.color}`}
              >
                {account.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6 text-center">
          <Link href="/" className="text-xs text-[#8b949e] hover:text-[#8b5cf6] transition-colors">
            ← Continue without signing in
          </Link>
        </div>
      </div>
    </main>
  )
}
