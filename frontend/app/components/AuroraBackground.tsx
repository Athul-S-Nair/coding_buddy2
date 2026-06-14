'use client'
import { useEffect, useRef } from 'react'

export default function AuroraBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    // 5 aurora orb colors (rgb prefixes — alpha appended per gradient stop)
    const colors = [
      'rgba(139,92,246', // violet
      'rgba(99,102,241', // indigo
      'rgba(16,185,129', // emerald
      'rgba(168,85,247', // purple
      'rgba(59,130,246', // blue
    ]

    const orbs = colors.map((color, i) => ({
      color,
      phase: (i / colors.length) * Math.PI * 2,
      ampX: canvas.width * (0.16 + Math.random() * 0.12),
      ampY: canvas.height * (0.16 + Math.random() * 0.12),
      baseX: canvas.width * (0.15 + (i / colors.length) * 0.7),
      baseY: canvas.height * (0.3 + Math.random() * 0.4),
      radius: Math.max(canvas.width, canvas.height) * (0.28 + Math.random() * 0.12),
      x: canvas.width / 2,
      y: canvas.height / 2,
    }))

    const mouse = { x: canvas.width / 2, y: canvas.height / 2 }
    const handleMouse = (e: MouseEvent) => {
      mouse.x = e.clientX
      mouse.y = e.clientY
    }
    window.addEventListener('mousemove', handleMouse)

    let animId: number
    let frame = 0
    let t = 0

    const animate = () => {
      frame++
      t += 0.004
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.globalCompositeOperation = 'lighter'

      orbs.forEach((orb) => {
        // Slow figure-8 (Lissajous) drift: x on the fundamental, y on the 2nd harmonic
        const angle = t + orb.phase
        const driftX = orb.baseX + Math.sin(angle) * orb.ampX
        const driftY = orb.baseY + Math.cos(2 * angle) * orb.ampY
        // Subtle mouse attraction — max 4% influence
        orb.x = driftX + (mouse.x - driftX) * 0.04
        orb.y = driftY + (mouse.y - driftY) * 0.04

        const grad = ctx.createRadialGradient(orb.x, orb.y, 0, orb.x, orb.y, orb.radius)
        grad.addColorStop(0, `${orb.color},0.22)`)
        grad.addColorStop(0.5, `${orb.color},0.07)`)
        grad.addColorStop(1, `${orb.color},0)`)
        ctx.fillStyle = grad
        ctx.beginPath()
        ctx.arc(orb.x, orb.y, orb.radius, 0, Math.PI * 2)
        ctx.fill()
      })

      ctx.globalCompositeOperation = 'source-over'

      // Organic film-grain noise: 80 tiny dots every 3 frames
      if (frame % 3 === 0) {
        ctx.fillStyle = 'rgba(255,255,255,0.015)'
        for (let i = 0; i < 80; i++) {
          ctx.fillRect(
            Math.random() * canvas.width,
            Math.random() * canvas.height,
            1,
            1
          )
        }
      }

      animId = requestAnimationFrame(animate)
    }
    animate()

    const handleResize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    window.addEventListener('resize', handleResize)

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('mousemove', handleMouse)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none z-0"
    />
  )
}
