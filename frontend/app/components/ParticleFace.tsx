'use client'
import { useEffect, useRef, useState } from 'react'

type FaceState = 'idle' | 'thinking' | 'talking' | 'happy' | 'concerned'

interface Props {
  state?: FaceState
  size?: number
}

export default function ParticleFace({
  state = 'idle', size = 80
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stateRef = useRef(state)
  const animIdRef = useRef<number>()
  const particlesRef = useRef<any[]>([])

  useEffect(() => {
    stateRef.current = state
  }, [state])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    canvas.width = size
    canvas.height = size

    const cx = size / 2
    const cy = size / 2

    // Define face keypoints for each state
    // Each state = array of {x, y} target positions
    const getFacePoints = (s: FaceState) => {
      const points: {x: number, y: number, r: number, color: string}[] = []

      // HEAD OUTLINE — 24 points around a circle
      for (let i = 0; i < 24; i++) {
        const angle = (i / 24) * Math.PI * 2
        const radius = size * 0.38
        points.push({
          x: cx + Math.cos(angle) * radius,
          y: cy + Math.sin(angle) * radius,
          r: 1.5,
          color: s === 'happy' ? '#10b981'
               : s === 'thinking' ? '#8b5cf6'
               : s === 'concerned' ? '#f59e0b'
               : s === 'talking' ? '#6366f1'
               : '#8b5cf6'
        })
      }

      // LEFT EYE — 8 points
      const leftEyeX = cx - size * 0.12
      const leftEyeY = cy - size * 0.08
      const eyeR = size * (s === 'thinking' ? 0.04 : 0.06)
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2
        points.push({
          x: leftEyeX + Math.cos(angle) * eyeR,
          y: leftEyeY + Math.sin(angle) * eyeR,
          r: 2,
          color: '#ffffff'
        })
      }

      // RIGHT EYE — 8 points
      const rightEyeX = cx + size * 0.12
      const rightEyeY = cy - size * 0.08
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2
        points.push({
          x: rightEyeX + Math.cos(angle) * eyeR,
          y: rightEyeY + Math.sin(angle) * eyeR,
          r: 2,
          color: '#ffffff'
        })
      }

      // MOUTH — 10 points, shape changes by state
      const mouthY = cy + size * 0.12
      for (let i = 0; i < 10; i++) {
        const t = i / 9
        const mx = cx - size * 0.12 + t * size * 0.24
        const curve = s === 'happy' ? -size * 0.06
                    : s === 'concerned' ? size * 0.05
                    : s === 'talking' ? Math.sin(Date.now() * 0.01 + t * Math.PI) * size * 0.04
                    : 0
        points.push({
          x: mx,
          y: mouthY + Math.sin(t * Math.PI) * curve,
          r: 2,
          color: '#ffffff'
        })
      }

      // SCATTER — when thinking, scatter points randomly
      if (s === 'thinking') {
        return points.map(p => ({
          ...p,
          x: p.x + (Math.random() - 0.5) * size * 0.3,
          y: p.y + (Math.random() - 0.5) * size * 0.3,
        }))
      }

      return points
    }

    // Initialize particles at random positions
    const targets = getFacePoints('idle')
    particlesRef.current = targets.map(t => ({
      x: Math.random() * size,
      y: Math.random() * size,
      targetX: t.x,
      targetY: t.y,
      r: t.r,
      color: t.color,
      vx: 0,
      vy: 0,
    }))

    let lastState = state
    let t = 0

    const animate = () => {
      t++
      ctx.clearRect(0, 0, size, size)

      // Recalculate targets when state changes
      if (stateRef.current !== lastState) {
        lastState = stateRef.current
        const newTargets = getFacePoints(lastState)
        particlesRef.current.forEach((p, i) => {
          if (newTargets[i]) {
            p.targetX = newTargets[i].x
            p.targetY = newTargets[i].y
            p.color = newTargets[i].color
          }
        })
      }

      // Update talking mouth every 8 frames
      if (lastState === 'talking' && t % 8 === 0) {
        const newTargets = getFacePoints('talking')
        particlesRef.current.forEach((p, i) => {
          if (newTargets[i] && i >= 32) { // mouth points
            p.targetX = newTargets[i].x
            p.targetY = newTargets[i].y
          }
        })
      }

      // Physics: spring toward target
      particlesRef.current.forEach(p => {
        const dx = p.targetX - p.x
        const dy = p.targetY - p.y
        p.vx += dx * 0.12
        p.vy += dy * 0.12
        p.vx *= 0.75
        p.vy *= 0.75
        p.x += p.vx
        p.y += p.vy

        // Draw particle
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = p.color
        ctx.shadowColor = p.color
        ctx.shadowBlur = p.r * 3
        ctx.fill()
        ctx.shadowBlur = 0
      })

      // Subtle idle breathing — bob head points up/down
      if (lastState === 'idle') {
        const breathe = Math.sin(t * 0.02) * 1.5
        particlesRef.current.slice(0, 24).forEach(p => {
          p.targetY += breathe * 0.02
        })
      }

      animIdRef.current = requestAnimationFrame(animate)
    }
    animate()

    return () => {
      if (animIdRef.current) cancelAnimationFrame(animIdRef.current)
    }
  }, [size])

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      className="rounded-full"
    />
  )
}
