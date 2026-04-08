import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { GrainGradientBackground } from '@/components/ui/grain-gradient'
import { ArrowRight } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-black">

      {/* ── Animated background ── */}
      <GrainGradientBackground />

      {/* ── Header ── */}
      <header className="relative z-10 flex items-center justify-between px-6 sm:px-10 py-5 border-b border-[#F23B3B]/15 bg-black/20 backdrop-blur-sm">
        <span className="text-lg font-bold tracking-tight text-white">
          Task Tracker
        </span>
        <nav className="flex items-center gap-2">
          <Button
            variant="ghost"
            asChild
            className="text-white/70 hover:text-white hover:bg-white/10"
          >
            <Link to="/login">Login</Link>
          </Button>
          <Button
            asChild
            className="bg-gradient-to-r from-[#8b1f1f] to-[#F23B3B] hover:from-[#F23B3B] hover:to-[#f87878] text-white border-0 gap-1.5 transition-all duration-300"
          >
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
            <span className="h-1.5 w-1.5 rounded-full bg-[#F23B3B]" />
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
            <Button
              asChild
              size="lg"
              className="h-12 px-8 text-base bg-gradient-to-r from-[#8b1f1f] to-[#F23B3B] hover:from-[#F23B3B] hover:to-[#f87878] text-white border-0 gap-2 transition-all duration-300 shadow-lg shadow-[#F23B3B]/20 hover:-translate-y-0.5"
            >
              <Link to="/register">
                Get Started <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="h-12 px-8 text-base border-[#4a1010]/60 text-white/80 bg-white/5 backdrop-blur-sm hover:bg-[#F23B3B]/10 hover:border-[#F23B3B]/40 hover:text-white transition-all duration-200"
            >
              <Link to="/login">Sign in</Link>
            </Button>
          </div>

        </div>
      </main>

    </div>
  )
}
