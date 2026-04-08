import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { GrainGradientBackground } from '@/components/ui/grain-gradient'
import { ShineBorder } from '@/components/ui/shine-border'
import { Mail, Lock, ArrowLeft } from 'lucide-react'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await login(email, password)
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      navigate('/')
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-black px-4 overflow-hidden">

      {/* Background */}
      <GrainGradientBackground />

      <div className="relative z-10 w-full max-w-md flex flex-col gap-6">

        {/* Back to home */}
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white transition-colors self-start"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>

        {/* Brand */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white tracking-tight">Task Tracker</h1>
          <p className="text-white/50 mt-2 text-sm">Sign in to manage your projects</p>
        </div>

        {/* Card */}
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md shadow-2xl p-8 flex flex-col gap-5">
          <ShineBorder shineColor="#F23B3B" duration={10} borderWidth={1} />

          <h2 className="relative z-10 text-xl font-semibold text-white">Welcome back</h2>

          <form onSubmit={handleSubmit} className="relative z-10 flex flex-col gap-5">

            {/* Email */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="email" className="text-white/60 text-sm">Email address</Label>
              <div className="flex items-center gap-2 border border-white/10 rounded-lg px-3 h-12 bg-white/5 focus-within:ring-2 focus-within:ring-[#F23B3B]/60 focus-within:border-transparent transition">
                <Mail className="h-5 w-5 text-white/30 shrink-0" />
                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="border-0 shadow-none focus-visible:ring-0 bg-transparent text-white placeholder:text-white/30"
                />
              </div>
            </div>

            {/* Password */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="password" className="text-white/60 text-sm">Password</Label>
              <div className="flex items-center gap-2 border border-white/10 rounded-lg px-3 h-12 bg-white/5 focus-within:ring-2 focus-within:ring-[#F23B3B]/60 focus-within:border-transparent transition">
                <Lock className="h-5 w-5 text-white/30 shrink-0" />
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="border-0 shadow-none focus-visible:ring-0 bg-transparent text-white placeholder:text-white/30"
                />
              </div>
            </div>

            {/* Remember me */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Checkbox id="remember" />
                <Label htmlFor="remember" className="text-sm font-normal text-white/50">
                  Remember me
                </Label>
              </div>
              <button type="button" className="text-sm text-[#F23B3B] hover:text-[#f87878] transition">
                Forgot password?
              </button>
            </div>

            {/* Error */}
            {error && (
              <div className="bg-[#F23B3B]/10 border border-red-500/30 text-[#F23B3B] text-sm rounded-lg px-4 py-3">
                {error}
              </div>
            )}

            {/* Submit */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 text-base font-medium rounded-lg bg-gradient-to-r from-[#8b1f1f] to-[#F23B3B] hover:from-[#F23B3B] hover:to-[#f87878] text-white border-0 transition-all duration-300 shadow-lg shadow-[#F23B3B]/20"
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>
        </div>

        <p className="text-center text-white/40 text-sm">
          Don&apos;t have an account?{' '}
          <Link to="/register" className="text-[#F23B3B] hover:text-[#f87878] transition">
            Create one
          </Link>
        </p>
      </div>
    </div>
  )
}
