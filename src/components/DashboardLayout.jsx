import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { LayoutDashboard, CalendarDays, LogOut, UserCircle } from 'lucide-react'
import { GrainGradientBackground } from '@/components/ui/grain-gradient'
import { RippleButton } from '@/components/ui/ripple-button'
import { cn } from '@/lib/utils'

const navItems = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Schedule',  href: '/schedule',  icon: CalendarDays },
  { label: 'Profile',   href: '/profile',   icon: UserCircle },
]

export default function DashboardLayout({ children }) {
  const { logout, user } = useAuth()
  const location = useLocation()

  return (
    <div className="flex flex-col h-screen bg-black text-white overflow-hidden">

      {/* ── Top Nav ── */}
      <header className="relative z-20 h-14 shrink-0 flex items-center justify-between px-6 bg-black/40 border-b border-[#F23B3B]/15 backdrop-blur-md">
        <div className="flex items-center gap-6">
          <span className="text-sm font-bold tracking-tight text-white/90">Task Tracker</span>
          <nav className="flex items-center gap-1">
            {navItems.map(({ label, href, icon: Icon }) => (
              <Link
                key={href}
                to={href}
                className={cn(
                  'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                  location.pathname === href
                    ? 'bg-[#F23B3B]/20 text-[#F23B3B]'
                    : 'text-gray-500 hover:bg-white/5 hover:text-white'
                )}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                {label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {user?.email && (
            <span className="text-xs text-gray-600 hidden sm:block">{user.email}</span>
          )}
          <RippleButton
            onClick={logout}
            rippleColor="#F23B3B"
            className="text-gray-400 hover:text-white border-gray-800/60 bg-transparent hover:bg-white/5 text-xs px-3 py-1.5"
          >
            <LogOut className="h-3.5 w-3.5" />
            Logout
          </RippleButton>
        </div>
      </header>

      {/* ── Main area ── */}
      <div className="relative flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Animated background */}
        <GrainGradientBackground />

        <main className="relative z-10 flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>

    </div>
  )
}
