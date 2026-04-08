import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { FallingPattern } from '@/components/ui/falling-pattern'
import { ArrowRight, LayoutDashboard, CalendarDays, Zap, Tag } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-hidden" style={{ backgroundColor: 'var(--background)' }}>

      {/* ── Animated background ── */}
      <FallingPattern
        color="var(--primary)"
        backgroundColor="var(--background)"
        blurIntensity="0.5em"
        className="absolute inset-0 h-full w-full [mask-image:radial-gradient(ellipse_80%_60%_at_50%_0%,transparent_30%,var(--background)_80%)]"
      />

      {/* ── Header ── */}
      <header className="relative z-10 flex items-center justify-between px-6 sm:px-10 py-5 border-b border-white/5">
        <span className="text-lg font-bold tracking-tight text-white">
          Task Tracker
        </span>
        <nav className="flex items-center gap-2">
          <Button
            variant="ghost"
            asChild
            className="text-gray-300 hover:text-white hover:bg-white/5"
          >
            <Link to="/login">Login</Link>
          </Button>
          <Button
            asChild
            className="bg-violet-600 hover:bg-violet-500 text-white gap-1.5"
          >
            <Link to="/register">
              Get Started
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </nav>
      </header>

      {/* ── Hero ── */}
      <main className="relative z-10 flex flex-col items-center px-4">

        {/* Hero section */}
        <section className="flex flex-col items-center justify-center text-center min-h-[calc(100vh-73px)] py-20">

          {/* Badge */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-4 py-1.5 text-xs font-medium text-violet-300">
            <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
            Smart scheduling powered by algorithms
          </div>

          {/* Headline */}
          <h1 className="max-w-3xl text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tighter leading-[1.05] mb-6 bg-gradient-to-b from-white via-white to-gray-500 bg-clip-text text-transparent">
            Personal Task App
          </h1>

          {/* Sub-headline */}
          <p className="max-w-lg text-base sm:text-lg text-gray-400 mb-10 leading-relaxed">
            Organize projects, schedule time blocks, and let our smart algorithm
            fill your day with the highest-value tasks automatically.
          </p>

          {/* CTAs */}
          <div className="flex flex-wrap justify-center gap-3">
            <Button
              asChild
              size="lg"
              className="h-12 px-8 text-base bg-violet-600 hover:bg-violet-500 text-white gap-2"
            >
              <Link to="/register">
                Get Started <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="h-12 px-8 text-base border-white/10 text-gray-300 bg-transparent hover:bg-white/5 hover:text-white"
            >
              <Link to="/login">Sign in</Link>
            </Button>
          </div>
        </section>

        {/* Features section */}
        <section className="w-full max-w-5xl pb-28">
          <p className="text-center text-xs font-semibold uppercase tracking-widest text-gray-500 mb-10">
            Everything you need to stay on top
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                icon: LayoutDashboard,
                title: 'Projects & Tasks',
                desc: 'Group tasks into projects, set priorities, and track completion at a glance.',
              },
              {
                icon: Zap,
                title: 'Smart Scheduling',
                desc: 'Our knapsack algorithm auto-fills time blocks with your highest-value tasks.',
              },
              {
                icon: CalendarDays,
                title: 'Time Blocks',
                desc: 'Define focused work sessions and let the app decide what fits best.',
              },
              {
                icon: Tag,
                title: 'Tags & Resources',
                desc: 'Label tasks with color-coded tags and attach links, docs, or references.',
              },
            ].map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="flex flex-col gap-3 rounded-xl border border-white/5 bg-white/[0.03] p-5 hover:border-violet-500/20 hover:bg-white/[0.05] transition-colors"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-500/10 border border-violet-500/20">
                  <Icon className="h-4 w-4 text-violet-400" />
                </div>
                <h3 className="text-sm font-semibold text-white">{title}</h3>
                <p className="text-xs text-gray-400 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </section>

      </main>

    </div>
  )
}
