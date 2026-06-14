'use client'
import { useEffect, useRef, useState } from 'react'

const CHARS =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%&'

interface ScrambleTextProps {
  text: string
  className?: string
  triggerOnHover?: boolean
  initialDelay?: number
}

export default function ScrambleText({
  text,
  className = '',
  triggerOnHover = false,
  initialDelay = 0,
}: ScrambleTextProps) {
  const [display, setDisplay] = useState(text)
  const intervalRef = useRef<ReturnType<typeof setInterval>>()

  const scramble = () => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    let iteration = 0
    intervalRef.current = setInterval(() => {
      setDisplay(
        text
          .split('')
          .map((char, i) => {
            if (char === ' ') return ' '
            if (i < iteration) return text[i]
            return CHARS[Math.floor(Math.random() * CHARS.length)]
          })
          .join('')
      )

      if (iteration >= text.length) {
        if (intervalRef.current) clearInterval(intervalRef.current)
        setDisplay(text)
      }

      iteration += 0.4
    }, 30)
  }

  useEffect(() => {
    if (triggerOnHover) {
      setDisplay(text)
      return
    }
    const timeout = setTimeout(() => scramble(), initialDelay)
    return () => {
      clearTimeout(timeout)
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, triggerOnHover, initialDelay])

  return (
    <span
      className={`font-mono ${className}`}
      onMouseEnter={triggerOnHover ? scramble : undefined}
    >
      {display}
    </span>
  )
}
