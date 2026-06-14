'use client'
import { useEffect, useRef } from 'react'

export default function CursorTrail() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    const dots: { x: number; y: number; age: number; size: number; hue: number }[] = []
    let hue = 260

    const handleMove = (e: MouseEvent) => {
      hue += 4
      if (hue > 360) hue = 260
      dots.push({ x: e.clientX, y: e.clientY, age: 0, size: 4, hue })
      if (dots.length > 40) dots.shift()
    }
    window.addEventListener('mousemove', handleMove)

    let animId: number
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      for (let i = 0; i < dots.length; i++) {
        const dot = dots[i]
        dot.age += 1
        const life = 1 - dot.age / 40
        if (life <= 0) continue
        ctx.beginPath()
        ctx.arc(dot.x, dot.y, dot.size * life, 0, Math.PI * 2)
        ctx.fillStyle = `hsla(${dot.hue}, 80%, 70%, ${life * 0.6})`
        ctx.shadowColor = `hsla(${dot.hue}, 80%, 70%, ${life * 0.8})`
        ctx.shadowBlur = dot.size * 3
        ctx.fill()
      }
      ctx.shadowBlur = 0
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
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none z-50"
    />
  )
}
