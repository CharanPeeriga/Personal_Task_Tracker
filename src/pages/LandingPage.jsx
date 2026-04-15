import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { StarsBackground } from '@/components/ui/stars-background'
import { ArrowRight } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-black">

      {/* ── Stars background at 100% opacity ── */}
      <StarsBackground className="absolute inset-0" />

      {/* ── Header ── */}
      <header className="relative z-10 flex items-center justify-between px-6 sm:px-10 py-5 border-b border-white/8 bg-black/20 backdrop-blur-sm">
        <span
          className="text-lg font-bold tracking-tight text-white"
          style={{ fontFamily: "'Noto Serif', Georgia, serif", fontStyle: 'italic' }}
        >
          Personal Task Tracker
        </span>
        <nav className="flex items-center gap-2">
          <Button variant="ghost" asChild neon={false}>
            <Link to="/login">Login</Link>
          </Button>
          <Button variant="solid" asChild>
            <Link to="/register">
              Get Started
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </nav>
      </header>

      {/* ── Hero ── */}
      <main className="relative z-10 flex flex-col items-center justify-center min-h-[calc(100vh-73px)] px-4 text-center">
        <div className="max-w-3xl flex flex-col items-center gap-6">

          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 backdrop-blur-sm px-4 py-1.5 text-xs font-medium text-white/80">
            <span className="h-1.5 w-1.5 rounded-full bg-white/60" />
            Smart scheduling powered by algorithms
          </div>

          {/* Headline */}
          <h1
            className="text-5xl sm:text-6xl lg:text-7xl leading-[1.05] text-white"
            style={{ fontFamily: "'Noto Serif', Georgia, serif", fontWeight: 700, fontStyle: 'italic' }}
          >
            Personal Task App
          </h1>

          {/* Sub-headline */}
          <p className="max-w-lg text-base sm:text-lg text-white/60 leading-relaxed">
            Organize projects, schedule time blocks, and let our smart algorithm
            fill your day with the highest-value tasks automatically.
          </p>

          {/* CTAs */}
          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <Button asChild size="lg" variant="solid">
              <Link to="/register">
                Get Started <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="ghost" neon={false}>
              <Link to="/login">Sign in</Link>
            </Button>
          </div>

        </div>
      </main>

    </div>
  )
}
