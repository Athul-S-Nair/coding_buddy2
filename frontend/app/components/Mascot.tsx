import { Player } from '@lottiefiles/react-lottie-player'
import { useRef, useState } from 'react'

export default function Mascot() {
  const playerRef = useRef<any>(null)
  const [speed, setSpeed] = useState(1)

  return (
    <div
      className="cursor-pointer select-none"
      onMouseEnter={() => {
        setSpeed(2)
        playerRef.current?.play()
      }}
      onMouseLeave={() => {
        setSpeed(1)
      }}
      onClick={() => {
        playerRef.current?.stop()
        setTimeout(() => playerRef.current?.play(), 50)
      }}
      style={{ width: 120, height: 120 }}
    >
      <Player
        ref={playerRef}
        autoplay
        loop
        speed={speed}
        src="/mascot.json"
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  )
}
