import type { Metadata } from 'next'
import './globals.css'

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
      <body>{children}</body>
    </html>
  )
}
