import type { Config } from 'tailwindcss'
const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      animation: {
        'fade-in': 'fadeIn 0.5s ease forwards',
        'fade-in-up': 'fadeInUp 0.6s cubic-bezier(0.16,1,0.3,1) forwards',
        'scale-in': 'scaleIn 0.3s cubic-bezier(0.34,1.56,0.64,1) forwards',
        'glow-pulse': 'glowPulse 2s ease-in-out infinite',
        'float': 'float 6s ease-in-out infinite',
        'stagger-1': 'fadeInUp 0.6s 0.05s cubic-bezier(0.16,1,0.3,1) both',
        'stagger-2': 'fadeInUp 0.6s 0.10s cubic-bezier(0.16,1,0.3,1) both',
        'stagger-3': 'fadeInUp 0.6s 0.15s cubic-bezier(0.16,1,0.3,1) both',
        'stagger-4': 'fadeInUp 0.6s 0.20s cubic-bezier(0.16,1,0.3,1) both',
        'stagger-5': 'fadeInUp 0.6s 0.25s cubic-bezier(0.16,1,0.3,1) both',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        fadeInUp: {
          from: { opacity: '0', transform: 'translateY(20px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          from: { opacity: '0', transform: 'scale(0.8)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        glowPulse: {
          '0%,100%': { boxShadow: '0 0 10px rgba(139,92,246,0.3)' },
          '50%': { boxShadow: '0 0 25px rgba(139,92,246,0.6)' },
        },
        float: {
          '0%,100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
    },
  },
  plugins: [],
}
export default config
