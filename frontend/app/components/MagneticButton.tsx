'use client'
import { useRef } from 'react'

interface MagneticButtonProps {
  children: React.ReactNode
  className?: string
  onClick?: () => void
  strength?: number
}

export default function MagneticButton({
  children,
  className = '',
  onClick,
  strength = 0.3,
}: MagneticButtonProps) {
  const ref = useRef<HTMLButtonElement>(null)

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    const btn = ref.current
    if (!btn) return
    const rect = btn.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    const dx = e.clientX - centerX
    const dy = e.clientY - centerY
    btn.style.transition = 'transform 0.1s ease'
    btn.style.transform = `translate(${dx * strength}px, ${dy * strength}px)`
  }

  const handleMouseLeave = () => {
    const btn = ref.current
    if (!btn) return
    btn.style.transition = 'transform 0.4s cubic-bezier(0.34,1.56,0.64,1)'
    btn.style.transform = 'translate(0px, 0px)'
  }

  return (
    <button
      ref={ref}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={className}
    >
      {children}
    </button>
  )
}
