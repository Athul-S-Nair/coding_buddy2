'use client'
import { useRef } from 'react'

interface HoloCardProps {
  children: React.ReactNode
  className?: string
  rarity?: 'common' | 'uncommon' | 'rare'
}

const rarityColors: Record<string, string> = {
  common: '140,140,140', // Easy — silver
  uncommon: '251,191,36', // Medium — gold
  rare: '239,68,68', // Hard — red
}

export default function HoloCard({
  children,
  className = '',
  rarity = 'common',
}: HoloCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const shineRef = useRef<HTMLDivElement>(null)
  const color = rarityColors[rarity] || rarityColors.common

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = cardRef.current
    const shine = shineRef.current
    if (!card || !shine) return
    const rect = card.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const cx = rect.width / 2
    const cy = rect.height / 2
    const rotX = ((y - cy) / cy) * -8
    const rotY = ((x - cx) / cx) * 8

    card.style.transition = 'transform 0.1s ease'
    card.style.transform = `perspective(800px) rotateX(${rotX}deg) rotateY(${rotY}deg) scale(1.02)`

    const angle = (Math.atan2(rotY, rotX) * 180) / Math.PI
    shine.style.opacity = '1'
    shine.style.background =
      `radial-gradient(circle at ${x}px ${y}px, rgba(${color},0.15), transparent 60%), ` +
      `linear-gradient(${angle}deg, rgba(${color},0.15), transparent 70%)`
  }

  const handleMouseLeave = () => {
    const card = cardRef.current
    const shine = shineRef.current
    if (!card || !shine) return
    card.style.transition = 'transform 0.5s cubic-bezier(0.34,1.56,0.64,1)'
    card.style.transform = 'perspective(800px) rotateX(0deg) rotateY(0deg) scale(1)'
    shine.style.opacity = '0'
  }

  return (
    <div
      ref={cardRef}
      className={`relative ${className}`}
      style={{ transformStyle: 'preserve-3d', willChange: 'transform' }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      <div
        ref={shineRef}
        className="absolute inset-0 z-10 pointer-events-none rounded-[inherit]"
        style={{ opacity: 0, transition: 'opacity 0.3s ease' }}
      />
    </div>
  )
}
