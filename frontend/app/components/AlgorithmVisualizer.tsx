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

export default function AlgorithmVisualizer({ data }: VisualizerProps) {
  const [currentStepIdx, setCurrentStepIdx] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const steps = data.steps || []
  const totalSteps = steps.length
  const step = steps[currentStepIdx] || {}

  useEffect(() => {
    // Reset index when data changes
    setCurrentStepIdx(0)
    setIsPlaying(false)
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
      }, 1200)
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
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
    if (currentStepIdx === totalSteps - 1 && !isPlaying) {
      setCurrentStepIdx(0)
      setIsPlaying(true)
    } else {
      setIsPlaying(!isPlaying)
    }
  }

  if (steps.length === 0) return null

  // Helper to format the title type
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

  // --- Rendering Functions ---

  const renderArrayVisual = () => {
    const arrayValues = data.array || []
    const pointerPositions = step.pointerPositions || {}
    const highlightIndices = step.highlightIndices || []
    const activeIndices = step.activeIndices || []

    // Group pointers by index to handle stacking
    const indexMap: Record<number, string[]> = {}
    Object.entries(pointerPositions).forEach(([name, idxVal]) => {
      const idx = Number(idxVal)
      if (data.pointers?.includes(name)) {
        if (!indexMap[idx]) indexMap[idx] = []
        indexMap[idx].push(name)
      }
    });

    // Flatten pointers for rendering with order
    const renderedPointers: { name: string; index: number; order: number }[] = []
    Object.entries(indexMap).forEach(([idxStr, names]) => {
      const idx = Number(idxStr)
      names.forEach((name, order) => {
        renderedPointers.push({ name, index: idx, order })
      })
    })

    return (
      <div className="flex flex-col items-center justify-center py-6 w-full overflow-x-auto min-h-[140px]">
        <div className="relative flex gap-3 h-24 items-end px-4">
          {/* Slideable pointer tags */}
          {renderedPointers.map((p) => {
            // Box width 48px (w-12), gap 12px (gap-3) -> 60px center spacing
            // Center is (idx * 60) + 24. Pointer width is 36px (w-9), so left offset = (idx * 60) + 6
            const leftOffset = p.index * 60 + 6
            const bottomOffset = 60 + p.order * 24 // Render above the box height (48px)
            return (
              <div
                key={p.name}
                style={{
                  left: `${leftOffset}px`,
                  bottom: `${bottomOffset}px`,
                  transition: 'all 0.3s ease-in-out',
                }}
                className={`absolute w-9 h-6 flex flex-col items-center justify-center rounded shadow-md text-[9px] font-bold text-white transition-all duration-300 animate-fade-in ${
                  p.name === 'left' ? 'bg-violet-600' : 'bg-pink-600'
                }`}
              >
                <span>{p.name}</span>
                <span className="leading-none text-[8px] mt-[-2px]">▼</span>
              </div>
            )
          })}

          {/* Array Boxes */}
          {arrayValues.map((val, idx) => {
            const isHighlighted = highlightIndices.includes(idx)
            const isActive = activeIndices.includes(idx)
            return (
              <div
                key={idx}
                className="flex flex-col items-center w-12 flex-shrink-0"
              >
                <div
                  className={`w-12 h-12 flex items-center justify-center rounded-lg border text-sm font-bold transition-all duration-300 ${
                    isHighlighted
                      ? 'bg-amber-500 border-amber-400 text-slate-950 shadow-md shadow-amber-500/20'
                      : isActive
                        ? 'bg-blue-600 border-blue-500 text-white shadow-md shadow-blue-500/20'
                        : 'bg-slate-800 border-slate-700 text-slate-300'
                  }`}
                >
                  {val}
                </div>
                <span className="text-[10px] text-slate-500 mt-1 select-none">
                  {idx}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  const renderBinarySearchVisual = () => {
    const arrayValues = data.array || []
    const low = step.low
    const high = step.high
    const mid = step.mid

    // Build standard pointer list for binary search
    const pointerPositions: Record<string, number> = {}
    if (low !== undefined) pointerPositions.low = low
    if (high !== undefined) pointerPositions.high = high
    if (mid !== undefined) pointerPositions.mid = mid

    const indexMap: Record<number, string[]> = {}
    Object.entries(pointerPositions).forEach(([name, idxVal]) => {
      const idx = Number(idxVal)
      if (!indexMap[idx]) indexMap[idx] = []
      indexMap[idx].push(name)
    })

    const renderedPointers: { name: string; index: number; order: number }[] = []
    Object.entries(indexMap).forEach(([idxStr, names]) => {
      const idx = Number(idxStr)
      names.forEach((name, order) => {
        renderedPointers.push({ name, index: idx, order })
      })
    })

    return (
      <div className="flex flex-col items-center justify-center py-6 w-full overflow-x-auto min-h-[140px]">
        <div className="relative flex gap-3 h-24 items-end px-4">
          {/* Low, High, Mid Pointer Tags */}
          {renderedPointers.map((p) => {
            const leftOffset = p.index * 60 + 6
            const bottomOffset = 60 + p.order * 24
            return (
              <div
                key={p.name}
                style={{
                  left: `${leftOffset}px`,
                  bottom: `${bottomOffset}px`,
                  transition: 'all 0.3s ease-in-out',
                }}
                className={`absolute w-9 h-6 flex flex-col items-center justify-center rounded shadow-md text-[9px] font-bold text-white transition-all duration-300 animate-fade-in ${
                  p.name === 'low'
                    ? 'bg-emerald-600'
                    : p.name === 'high'
                      ? 'bg-rose-600'
                      : 'bg-amber-600'
                }`}
              >
                <span>{p.name}</span>
                <span className="leading-none text-[8px] mt-[-2px]">▼</span>
              </div>
            )
          })}

          {/* Array Boxes */}
          {arrayValues.map((val, idx) => {
            const inActiveRange = low !== undefined && high !== undefined && idx >= low && idx <= high
            const isMid = mid !== undefined && idx === mid

            return (
              <div
                key={idx}
                className="flex flex-col items-center w-12 flex-shrink-0"
              >
                <div
                  className={`w-12 h-12 flex items-center justify-center rounded-lg border text-sm font-bold transition-all duration-300 ${
                    isMid
                      ? 'bg-amber-500 border-amber-400 text-slate-950 shadow-lg shadow-amber-500/35 scale-105 z-10'
                      : inActiveRange
                        ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                        : 'bg-slate-800/40 border-slate-800 text-slate-600'
                  }`}
                >
                  {val}
                </div>
                <span className="text-[10px] text-slate-500 mt-1 select-none">
                  {idx}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  const renderHashMapVisual = () => {
    const processing = step.processing
    const mapState = step.mapState || {}
    const entries = Object.entries(mapState)

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4 px-4 w-full items-stretch min-h-[140px]">
        {/* Left Panel: Processing */}
        <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-4 flex flex-col items-center justify-center text-center">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-2">
            Currently Processing
          </span>
          <div className="w-16 h-16 bg-gradient-to-tr from-violet-600 to-indigo-600 text-white rounded-2xl flex items-center justify-center text-xl font-bold shadow-lg shadow-violet-600/15 border border-violet-500/30 animate-pulse">
            {processing !== undefined && processing !== null ? String(processing) : '-'}
          </div>
        </div>

        {/* Right Panel: Hash Map Table */}
        <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-4 flex flex-col justify-center">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-3 block text-center md:text-left">
            Hash Map State
          </span>
          {entries.length === 0 ? (
            <div className="text-center py-4 text-xs text-slate-500 italic">
              Map is empty
            </div>
          ) : (
            <div className="max-h-28 overflow-y-auto border border-slate-700 rounded-lg">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-800 border-b border-slate-700 text-slate-400 font-semibold">
                    <th className="p-2">Key</th>
                    <th className="p-2">Value</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map(([k, v]) => (
                    <tr
                      key={k}
                      className="border-b border-slate-800 hover:bg-slate-800/20 text-slate-300 animate-fade-in"
                    >
                      <td className="p-2 font-mono text-violet-400">{k}</td>
                      <td className="p-2 font-mono text-emerald-400">{String(v)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    )
  }

  const renderTreeVisual = () => {
    // Dynamic Layout Calculation
    const nodeMap = new Map<string | number, any>()
    data.nodes?.forEach((n: any) => nodeMap.set(n.id, n))

    const root = data.nodes?.find((n: any) => n.depth === 0) || data.nodes?.[0]
    const positions: Record<string | number, { x: number; y: number }> = {}

    // Computes X and Y locations for each tree node inside the SVG canvas bounds [width: 440, height: 160]
    function calculateLayout(nodeId: any, xMin: number, xMax: number, y: number) {
      const node = nodeMap.get(nodeId)
      if (!node) return
      const x = (xMin + xMax) / 2
      positions[nodeId] = { x, y }

      if (node.children && node.children.length > 0) {
        const segmentWidth = (xMax - xMin) / node.children.length
        node.children.forEach((childId: any, idx: number) => {
          const childXMin = xMin + idx * segmentWidth
          const childXMax = childXMin + segmentWidth
          calculateLayout(childId, childXMin, childXMax, y + 45) // vertical gap of 45px
        })
      }
    }

    if (root) {
      calculateLayout(root.id, 20, 420, 25)
    }

    // Collect line coordinates
    const lines: { id: string; x1: number; y1: number; x2: number; y2: number }[] = []
    data.nodes?.forEach((node: any) => {
      const parentPos = positions[node.id]
      if (!parentPos) return
      node.children?.forEach((childId: any) => {
        const childPos = positions[childId]
        if (childPos) {
          lines.push({
            id: `${node.id}-${childId}`,
            x1: parentPos.x,
            y1: parentPos.y,
            x2: childPos.x,
            y2: childPos.y,
          })
        }
      })
    })

    return (
      <div className="flex justify-center py-4 w-full overflow-x-auto min-h-[140px]">
        <svg width="440" height="150" className="flex-shrink-0">
          {/* Draw connecting lines first */}
          {lines.map((line) => (
            <line
              key={line.id}
              x1={line.x1}
              y1={line.y1}
              x2={line.x2}
              y2={line.y2}
              stroke="#4b5563"
              strokeWidth="1.5"
              className="transition-all duration-300"
            />
          ))}

          {/* Draw nodes */}
          {data.nodes?.map((node: any) => {
            const pos = positions[node.id]
            if (!pos) return null
            const isVisited = step.visitedNodes?.includes(node.id)
            const isCurrent = step.currentNode === node.id

            return (
              <g key={node.id}>
                {isCurrent && (
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r="20"
                    fill="none"
                    stroke="#14b8a6"
                    strokeWidth="2"
                    className="animate-ping opacity-75"
                  />
                )}
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r="14"
                  className="transition-all duration-300"
                  fill={isCurrent ? '#14b8a6' : isVisited ? '#0d9488' : '#1e293b'}
                  stroke={isCurrent ? '#2dd4bf' : isVisited ? '#14b8a6' : '#475569'}
                  strokeWidth="1.5"
                />
                <text
                  x={pos.x}
                  y={pos.y}
                  dy=".3em"
                  textAnchor="middle"
                  className="text-[9px] font-bold fill-white select-none pointer-events-none"
                >
                  {node.value}
                </text>
              </g>
            )
          })}
        </svg>
      </div>
    )
  }

  return (
    <div className="bg-[#0f141d] border border-white/5 rounded-xl p-5 w-full flex flex-col space-y-4">
      {/* Header title */}
      <div className="flex justify-between items-center border-b border-white/5 pb-2">
        <h4 className="text-white text-sm font-bold tracking-tight">
          How it should work — <span className="text-violet-400">{getConceptName()}</span>
        </h4>
        <span className="text-xs text-[#8b949e] font-semibold">
          Step {currentStepIdx + 1} of {totalSteps}
        </span>
      </div>

      {/* Main visualization container */}
      <div className="bg-[#080b11] border border-white/5 rounded-xl flex items-center justify-center p-2 relative overflow-hidden min-h-[160px]">
        {data.type === 'array' && renderArrayVisual()}
        {data.type === 'binary_search' && renderBinarySearchVisual()}
        {data.type === 'hashmap' && renderHashMapVisual()}
        {data.type === 'tree' && renderTreeVisual()}
      </div>

      {/* Footer controls & note */}
      <div className="flex flex-col space-y-3">
        {/* Note */}
        <p className="text-xs text-slate-400 italic leading-relaxed text-center px-2">
          &ldquo;{step.note || 'Processing...'}&rdquo;
        </p>

        {/* Action Row */}
        <div className="flex items-center justify-between pt-1 border-t border-white/5">
          <div className="w-1/3 text-left">
            {currentStepIdx === totalSteps - 1 && (
              <span className="text-emerald-400 text-xs font-semibold animate-fade-in flex items-center gap-1">
                ✓ That&apos;s the correct approach!
              </span>
            )}
          </div>

          {/* Prev / Play-Pause / Next controls */}
          <div className="flex items-center gap-2 justify-center w-1/3">
            <button
              onClick={handlePrev}
              disabled={currentStepIdx === 0}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white disabled:opacity-40 disabled:hover:bg-white/5 transition-all"
              title="Previous Step"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="19 20 9 12 19 4 19 20"/><line x1="5" y1="19" x2="5" y2="5"/>
              </svg>
            </button>

            <button
              onClick={handleTogglePlay}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all ${
                isPlaying
                  ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20'
                  : 'bg-violet-600 hover:bg-violet-500 text-white'
              }`}
            >
              {isPlaying ? (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                    <rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/>
                  </svg>
                  <span>Pause</span>
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                    <polygon points="5 3 19 12 5 21 5 3"/>
                  </svg>
                  <span>{currentStepIdx === totalSteps - 1 ? 'Replay' : 'Play'}</span>
                </>
              )}
            </button>

            <button
              onClick={handleNext}
              disabled={currentStepIdx === totalSteps - 1}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white disabled:opacity-40 disabled:hover:bg-white/5 transition-all"
              title="Next Step"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="5 4 15 12 5 20 5 4"/><line x1="19" y1="5" x2="19" y2="19"/>
              </svg>
            </button>
          </div>

          <div className="w-1/3"></div>
        </div>
      </div>
    </div>
  )
}
