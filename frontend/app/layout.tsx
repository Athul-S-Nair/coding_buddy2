import type { Metadata } from 'next'
import './globals.css'
import CursorTrail from './components/CursorTrail'

export const metadata: Metadata = {
  title: "Coding Buddy — Learn to code with an AI tutor",
  description: "Practice coding problems with Sage, your personal AI tutor that guides you without giving away the answer.",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <CursorTrail />
        {children}
      </body>
    </html>
  )
}
