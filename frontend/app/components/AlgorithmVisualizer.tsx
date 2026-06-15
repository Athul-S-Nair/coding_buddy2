'use client'

import { useEffect, useState, useRef } from 'react'

interface VisualizerProps {
  data: {
    type: 'array' | 'binary_search' | 'hashmap' | 'tree'
    array?: (number | string)[]
    pointers?: string[]
    nodes?: { id: string | number; value: any; children: (string | number)[]; depth: number }[]
    steps: any[]
    result: any
  }
}

const POINTER_STYLES: Record<string, string> = {
  left: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500',
  right: 'bg-rose-500/20 text-rose-400 border border-rose-500',
  mid: 'bg-amber-500/20 text-amber-400 border border-amber-500',
}

export default function AlgorithmVisualizer({ data }: VisualizerProps) {
  const [currentStepIdx, setCurrentStepIdx] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const steps = data.steps || []
  const totalSteps = steps.length
  const step = steps[currentStepIdx] || {}
  const isLastStep = currentStepIdx === totalSteps - 1

  // Auto-play whenever new data arrives
  useEffect(() => {
    setCurrentStepIdx(0)
    setIsPlaying(true)
  }, [data])

  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setInterval(() => {
        setCurrentStepIdx((prev) => {
          if (prev >= totalSteps - 1) {
            setIsPlaying(false)
            return prev
          }
          return prev + 1
        })
      }, 1000)
    } else if (timerRef.current) {
      clearInterval(timerRef.current)
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [isPlaying, totalSteps])

  const handlePrev = () => {
    setIsPlaying(false)
    setCurrentStepIdx((prev) => Math.max(0, prev - 1))
  }

  const handleNext = () => {
    setIsPlaying(false)
    setCurrentStepIdx((prev) => Math.min(totalSteps - 1, prev + 1))
  }

  const handleTogglePlay = () => {
    if (isLastStep && !isPlaying) {
      setCurrentStepIdx(0)
      setIsPlaying(true)
    } else {
      setIsPlaying(!isPlaying)
    }
  }

  if (steps.length === 0) return null

  const getConceptName = () => {
    switch (data.type) {
      case 'array':
        return 'Array / Pointers'
      case 'binary_search':
        return 'Binary Search'
      case 'hashmap':
        return 'Hash Map'
      case 'tree':
        return 'Recursion / Tree'
      default:
        return 'Algorithm'
    }
  }

  const progressPct = totalSteps > 1 ? (currentStepIdx / (totalSteps - 1)) * 100 : 100

  // --- Box-based visual (array / two-pointer / binary search / sliding window) ---
  const renderBoxes = () => {
    const arrayValues = data.array || []
    const highlightIndices: number[] = step.highlightIndices || []
    const activeIndices: number[] = step.activeIndices || []

    // Collect pointers from either step.pointerPositions (array) or low/high/mid (binary search)
    const pointerMap: Record<number, string[]> = {}
    const addPointer = (name: string, idx: any) => {
      const n = Number(idx)
      if (Number.isNaN(n)) return
      if (!pointerMap[n]) pointerMap[n] = []
      pointerMap[n].push(name)
    }
    if (step.pointerPositions && typeof step.pointerPositions === 'object') {
      Object.entries(step.pointerPositions).forEach(([name, idx]) => {
        if (!data.pointers || data.pointers.includes(name)) addPointer(name, idx)
      })
    }
    if (data.type === 'binary_search') {
      if (step.low !== undefined) addPointer('low', step.low)
      if (step.high !== undefined) addPointer('high', step.high)
      if (step.mid !== undefined) addPointer('mid', step.mid)
    }

    const low = step.low
    const high = step.high
    const inRange = (idx: number) =>
      data.type === 'binary_search' &&
      low !== undefined &&
      high !== undefined &&
      idx >= low &&
      idx <= high

    return (
      <div className="flex flex-wrap items-end justify-center gap-3 py-4">
        {arrayValues.map((val, idx) => {
          const isHighlighted = highlightIndices.includes(idx)
          const isActive = activeIndices.includes(idx)
          const pointers = pointerMap[idx] || []
          return (
            <div key={idx} className="flex flex-col items-center">
              {/* Pointer tags */}
              <div className="flex flex-col items-center gap-1 mb-1 min-h-[22px]">
                {pointers.map((name) => (
                  <span
                    key={name}
                    className={`px-2 py-0.5 rounded text-xs font-bold transition-all duration-500 ease-in-out ${
                      POINTER_STYLES[name] || 'bg-violet-500/20 text-violet-400 border border-violet-500'
                    }`}
                  >
                    {name} ↓
                  </span>
                ))}
              </div>
              <div
                className={`w-14 h-14 flex items-center justify-center rounded-xl font-bold text-lg transition-all duration-500 ${
                  isHighlighted
                    ? 'bg-amber-500/30 border-2 border-amber-400 text-amber-200 shadow-lg shadow-amber-500/30'
                    : isActive
                    ? 'bg-violet-500/30 border-2 border-violet-400 text-violet-200 shadow-lg shadow-violet-500/30'
                    : inRange(idx)
                    ? 'bg-violet-500/5 border border-gray-600 text-gray-300'
                    : 'bg-gray-800 border border-gray-600 text-gray-300'
                }`}
              >
                {val}
              </div>
              <span className="text-[10px] text-gray-500 mt-1 select-none">{idx}</span>
            </div>
          )
        })}
      </div>
    )
  }

  // --- Hash map ---
  const renderHashMap = () => {
    const processing = step.processing
    const mapState = step.mapState || {}
    const entries = Object.entries(mapState)

    return (
      <div className="flex flex-col md:flex-row items-stretch justify-center gap-6 py-4 w-full">
        {/* Processing panel */}
        <div className="flex flex-col items-center justify-center gap-3">
          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
            Processing
          </span>
          <div className="relative">
            <div className="absolute inset-0 rounded-2xl border-2 border-violet-400 animate-ping opacity-40" />
            <div className="relative w-24 h-24 flex items-center justify-center rounded-2xl bg-violet-500/20 border-2 border-violet-400 text-2xl font-black text-violet-200">
              {processing !== undefined && processing !== null ? String(processing) : '–'}
            </div>
          </div>
        </div>

        {/* Hash map table */}
        <div className="flex flex-col gap-2 min-w-[180px]">
          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider text-center md:text-left">
            Hash Map
          </span>
          {entries.length === 0 ? (
            <div className="text-center py-4 text-xs text-gray-500 italic">Map is empty</div>
          ) : (
            <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto pr-1">
              {entries.map(([k, v]) => (
                <div
                  key={k}
                  className="flex items-center justify-between gap-4 bg-gray-800 rounded-lg px-4 py-2 animate-fade-in"
                >
                  <span className="font-mono text-sm font-bold text-violet-400">{k}</span>
                  <span className="text-gray-600">→</span>
                  <span className="font-mono text-sm font-bold text-emerald-400">{String(v)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  // --- Tree ---
  const renderTree = () => {
    const nodes = data.nodes || []
    if (nodes.length === 0) return null

    // Layout: group by depth, distribute siblings horizontally
    const W = 600
    const topMargin = 50
    const levelHeight = 90
    const radius = 22
    const maxDepth = nodes.reduce((m, n) => Math.max(m, n.depth), 0)
    const byDepth: Record<number, typeof nodes> = {}
    nodes.forEach((n) => {
      if (!byDepth[n.depth]) byDepth[n.depth] = []
      byDepth[n.depth].push(n)
    })

    const positions: Record<string | number, { x: number; y: number }> = {}
    Object.entries(byDepth).forEach(([depthStr, levelNodes]) => {
      const depth = Number(depthStr)
      const count = levelNodes.length
      levelNodes.forEach((n, i) => {
        positions[n.id] = {
          x: ((i + 1) / (count + 1)) * W,
          y: topMargin + depth * levelHeight,
        }
      })
    })

    const height = topMargin + maxDepth * levelHeight + radius + 30

    const edges: { id: string; d: string }[] = []
    nodes.forEach((n) => {
      const p = positions[n.id]
      if (!p) return
      n.children?.forEach((childId) => {
        const c = positions[childId]
        if (!c) return
        const midY = (p.y + c.y) / 2
        edges.push({
          id: `${n.id}-${childId}`,
          d: `M ${p.x} ${p.y} Q ${p.x} ${midY}, ${c.x} ${c.y}`,
        })
      })
    })

    return (
      <div className="w-full flex justify-center py-2">
        <svg viewBox={`0 0 ${W} ${Math.max(height, 200)}`} className="w-full" style={{ maxHeight: 360 }}>
          {edges.map((e) => (
            <path key={e.id} d={e.d} fill="none" stroke="#374151" strokeWidth="2" />
          ))}
          {nodes.map((n) => {
            const pos = positions[n.id]
            if (!pos) return null
            const isVisited = step.visitedNodes?.includes(n.id)
            const isCurrent = step.currentNode === n.id
            return (
              <g key={n.id}>
                {isCurrent && (
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r={radius + 6}
                    fill="none"
                    stroke="#8b5cf6"
                    strokeWidth="2"
                    className="animate-ping"
                    opacity="0.7"
                  />
                )}
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={radius}
                  fill={isCurrent || isVisited ? '#5b21b6' : '#1f2937'}
                  stroke={isCurrent || isVisited ? '#8b5cf6' : '#374151'}
                  strokeWidth="2"
                  style={{
                    filter:
                      isCurrent || isVisited
                        ? 'drop-shadow(0 0 8px rgba(139,92,246,0.6))'
                        : 'none',
                    transition: 'all 0.4s ease',
                  }}
                />
                <text
                  x={pos.x}
                  y={pos.y}
                  dy=".35em"
                  textAnchor="middle"
                  className="text-sm font-bold fill-white select-none pointer-events-none"
                >
                  {n.value}
                </text>
              </g>
            )
          })}
        </svg>
      </div>
    )
  }

  return (
    <div className="relative w-full min-h-[420px] bg-gray-900/95 backdrop-blur-md rounded-2xl border border-violet-500/30 shadow-xl shadow-violet-500/10 overflow-hidden flex flex-col">
      {/* Progress scrubber */}
      <div className="w-full h-1 bg-gray-700 rounded">
        <div
          className="h-full bg-violet-500 rounded transition-all duration-300"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* Header row */}
      <div className="flex items-center justify-between px-5 pt-4">
        <span className="text-violet-400 font-mono text-sm">⚡ Algorithm Trace</span>
        <span className="px-3 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
          {getConceptName()}
        </span>
        <span className="text-gray-500 font-mono text-sm">
          Step {currentStepIdx + 1} / {totalSteps}
        </span>
      </div>

      {/* Visualization area */}
      <div className="flex-1 flex items-center justify-center px-5 py-4">
        {(data.type === 'array' || data.type === 'binary_search') && renderBoxes()}
        {data.type === 'hashmap' && renderHashMap()}
        {data.type === 'tree' && renderTree()}
      </div>

      {/* Step note */}
      <div className="px-5">
        <p
          key={currentStepIdx}
          className="bg-gray-800/50 rounded-xl px-6 py-4 mt-4 text-base text-gray-200 italic animate-fade-in-up"
        >
          {step.note || 'Processing...'}
        </p>
      </div>

      {/* Result on last step */}
      {isLastStep && data.result !== undefined && data.result !== null && (
        <div className="px-5 mt-3">
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-4 py-2 text-center text-emerald-400 animate-bounce">
            ✓ Result: {typeof data.result === 'object' ? JSON.stringify(data.result) : String(data.result)}
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center justify-center gap-3 px-5 py-4">
        <button
          onClick={handlePrev}
          disabled={currentStepIdx === 0}
          className="px-3 py-2 rounded-lg text-sm text-gray-300 hover:bg-white/5 disabled:opacity-40 disabled:hover:bg-transparent transition-all"
        >
          ◀ Prev
        </button>
        <button
          onClick={handleTogglePlay}
          className="px-8 py-2 rounded-lg text-sm font-semibold bg-violet-600 hover:bg-violet-500 text-white transition-all"
        >
          {isPlaying ? '⏸ Pause' : isLastStep ? '▶ Replay' : '▶ Play'}
        </button>
        <button
          onClick={handleNext}
          disabled={isLastStep}
          className="px-3 py-2 rounded-lg text-sm text-gray-300 hover:bg-white/5 disabled:opacity-40 disabled:hover:bg-transparent transition-all"
        >
          Next ▶
        </button>
      </div>
    </div>
  )
}
