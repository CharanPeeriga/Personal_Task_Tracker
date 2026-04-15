import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { LayoutDashboard, CalendarDays, LogOut, UserCircle } from 'lucide-react'
import { StarsBackground } from '@/components/ui/stars-background'
import { Button } from '@/components/ui/button'
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
      <header className="relative z-20 h-14 shrink-0 flex items-center justify-between px-6 bg-black/60 border-b border-white/8 backdrop-blur-md">
        <div className="flex items-center gap-6">
          <span className="text-sm font-bold tracking-tight text-white/90">Personal Task Tracker</span>
          <nav className="flex items-center gap-1">
            {navItems.map(({ label, href, icon: Icon }) => (
              <Link
                key={href}
                to={href}
                className={cn(
                  'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                  location.pathname === href
                    ? 'bg-white/10 text-white'
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
          <Button
            onClick={logout}
            variant="ghost"
            size="sm"
            className="text-gray-400 hover:text-white text-xs gap-1.5"
            neon={false}
          >
            <LogOut className="h-3.5 w-3.5" />
            Logout
          </Button>
        </div>
      </header>

      {/* ── Main area ── */}
      <div className="relative flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Animated stars background at 50% opacity */}
        <div className="absolute inset-0 z-0 opacity-50">
          <StarsBackground className="absolute inset-0" />
        </div>

        <main className="relative z-10 flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>

    </div>
  )
}
