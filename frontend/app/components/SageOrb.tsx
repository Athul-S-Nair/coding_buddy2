'use client'
import { useEffect, useRef } from 'react'

type OrbState = 'idle' | 'thinking' | 'talking' | 'happy' | 'concerned'

interface Props {
  state?: OrbState
  size?: number
}

const STATE_COLORS = {
  idle:      { core: '139,92,246',  glow: '109,40,217',   speed: 0.015 },
  thinking:  { core: '99,102,241',  glow: '67,56,202',    speed: 0.04  },
  talking:   { core: '59,130,246',  glow: '29,78,216',    speed: 0.03  },
  happy:     { core: '16,185,129',  glow: '5,150,105',    speed: 0.025 },
  concerned: { core: '245,158,11',  glow: '180,83,9',     speed: 0.02  },
}

export default function SageOrb({ state = 'idle', size = 36 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stateRef = useRef(state)
  const frameRef = useRef<number>()

  useEffect(() => { stateRef.current = state }, [state])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Use 2x resolution for crisp rendering
    const dpr = window.devicePixelRatio || 2
    canvas.width = size * dpr
    canvas.height = size * dpr
    canvas.style.width = size + 'px'
    canvas.style.height = size + 'px'
    ctx.scale(dpr, dpr)

    const cx = size / 2
    const cy = size / 2
    const r = size * 0.36
    let t = 0

    const draw = () => {
      t += stateRef.current === 'thinking' ? 0.04
         : stateRef.current === 'talking' ? 0.035
         : 0.015

      ctx.clearRect(0, 0, size, size)

      const cfg = STATE_COLORS[stateRef.current]

      // Outer glow rings — 3 layers
      for (let ring = 3; ring >= 1; ring--) {
        const ringR = r + ring * (size * 0.06) +
          Math.sin(t + ring * 1.2) * (size * 0.025)
        const alpha = stateRef.current === 'thinking'
          ? 0.08 + Math.sin(t * 2 + ring) * 0.05
          : 0.06 - ring * 0.015
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, ringR)
        grad.addColorStop(0, `rgba(${cfg.core},${alpha})`)
        grad.addColorStop(1, `rgba(${cfg.glow},0)`)
        ctx.beginPath()
        ctx.arc(cx, cy, ringR, 0, Math.PI * 2)
        ctx.fillStyle = grad
        ctx.fill()
      }

      // Main orb body
      const breathe = Math.sin(t) * (size * 0.02)
      const orbR = r + breathe
      const bodyGrad = ctx.createRadialGradient(
        cx - orbR * 0.25, cy - orbR * 0.25, orbR * 0.05,
        cx, cy, orbR
      )
      bodyGrad.addColorStop(0, `rgba(255,255,255,0.9)`)
      bodyGrad.addColorStop(0.2, `rgba(${cfg.core},0.95)`)
      bodyGrad.addColorStop(0.7, `rgba(${cfg.glow},0.8)`)
      bodyGrad.addColorStop(1, `rgba(${cfg.glow},0.4)`)
      ctx.beginPath()
      ctx.arc(cx, cy, orbR, 0, Math.PI * 2)
      ctx.fillStyle = bodyGrad
      ctx.fill()

      // Inner plasma swirl — 4 rotating blobs
      const blobCount = stateRef.current === 'thinking' ? 6 : 4
      for (let i = 0; i < blobCount; i++) {
        const angle = t * (i % 2 === 0 ? 1 : -1.3) +
                      (i * Math.PI * 2) / blobCount
        const dist = orbR * 0.35
        const bx = cx + Math.cos(angle) * dist
        const by = cy + Math.sin(angle) * dist
        const blobR = orbR * 0.28
        const blobGrad = ctx.createRadialGradient(bx, by, 0, bx, by, blobR)
        blobGrad.addColorStop(0, `rgba(255,255,255,0.4)`)
        blobGrad.addColorStop(1, `rgba(${cfg.core},0)`)
        ctx.beginPath()
        ctx.arc(bx, by, blobR, 0, Math.PI * 2)
        ctx.fillStyle = blobGrad
        ctx.fill()
      }

      // Specular highlight — top left shine
      const shinGrad = ctx.createRadialGradient(
        cx - orbR * 0.3, cy - orbR * 0.35, 0,
        cx - orbR * 0.3, cy - orbR * 0.35, orbR * 0.45
      )
      shinGrad.addColorStop(0, 'rgba(255,255,255,0.7)')
      shinGrad.addColorStop(1, 'rgba(255,255,255,0)')
      ctx.beginPath()
      ctx.arc(cx, cy, orbR, 0, Math.PI * 2)
      ctx.fillStyle = shinGrad
      ctx.fill()

      // THINKING: orbiting particles
      if (stateRef.current === 'thinking') {
        for (let i = 0; i < 5; i++) {
          const angle = t * 2.5 + (i * Math.PI * 2) / 5
          const dist = orbR * 1.35
          const px = cx + Math.cos(angle) * dist
          const py = cy + Math.sin(angle) * dist
          ctx.beginPath()
          ctx.arc(px, py, size * 0.025, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(${cfg.core},0.8)`
          ctx.shadowColor = `rgba(${cfg.core},1)`
          ctx.shadowBlur = 4
          ctx.fill()
          ctx.shadowBlur = 0
        }
      }

      // TALKING: ripple rings expanding outward
      if (stateRef.current === 'talking') {
        const ripplePhase = (t * 2) % (Math.PI * 2)
        for (let i = 0; i < 2; i++) {
          const rippleR = orbR +
            ((ripplePhase + i * Math.PI) / (Math.PI * 2)) * orbR * 0.8
          const rippleAlpha = 0.3 * (1 - rippleR / (orbR * 1.8))
          ctx.beginPath()
          ctx.arc(cx, cy, rippleR, 0, Math.PI * 2)
          ctx.strokeStyle = `rgba(${cfg.core},${Math.max(0, rippleAlpha)})`
          ctx.lineWidth = 1.5
          ctx.stroke()
        }
      }

      // HAPPY: sparkles bursting outward
      if (stateRef.current === 'happy') {
        for (let i = 0; i < 6; i++) {
          const angle = (i * Math.PI * 2) / 6 + t * 0.5
          const dist = orbR * 1.2 + Math.sin(t * 3 + i) * orbR * 0.2
          const sx = cx + Math.cos(angle) * dist
          const sy = cy + Math.sin(angle) * dist
          ctx.beginPath()
          ctx.arc(sx, sy, size * 0.03, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(16,185,129,${0.6 + Math.sin(t*4+i)*0.3})`
          ctx.fill()
        }
      }

      frameRef.current = requestAnimationFrame(draw)
    }
    draw()

    return () => { if (frameRef.current) cancelAnimationFrame(frameRef.current) }
  }, [size])

  return (
    <canvas
      ref={canvasRef}
      style={{ width: size, height: size, borderRadius: '50%' }}
    />
  )
}
