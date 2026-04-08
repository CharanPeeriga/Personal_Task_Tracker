import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { GrainGradientBackground } from '@/components/ui/grain-gradient'
import { ShineBorder } from '@/components/ui/shine-border'
import { ArrowLeft } from 'lucide-react'

export default function Register() {
  const { register } = useAuth()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [error, setError]       = useState('')
  const [success, setSuccess]   = useState('')
  const [loading, setLoading]   = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSuccess('')
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    setLoading(true)
    const { error } = await register(email, password)
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setSuccess('Account created! Check your email to confirm, then sign in.')
      setLoading(false)
    }
  }

  const inputCls = "w-full bg-white/5 border border-[#4a1010] text-white rounded-lg px-4 py-2.5 text-sm placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-[#F23B3B] focus:border-[#F23B3B] transition-colors"

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-black px-4 overflow-hidden">

      {/* Background */}
      <GrainGradientBackground />

      <div className="relative z-10 w-full max-w-md flex flex-col gap-6">

        {/* Back */}
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
          <p className="text-white/50 mt-2 text-sm">Create your free account</p>
        </div>

        {/* Card */}
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md shadow-2xl p-8">
          <ShineBorder shineColor="#F23B3B" duration={10} borderWidth={1} />

          <h2 className="relative z-10 text-xl font-semibold text-white mb-6">Get started</h2>

          <form onSubmit={handleSubmit} className="relative z-10 space-y-5">

            <div className="flex flex-col gap-1.5">
              <Label className="text-white/60 text-sm">Email address</Label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className={inputCls}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-white/60 text-sm">Password</Label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 6 characters"
                className={inputCls}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-white/60 text-sm">Confirm password</Label>
              <input
                type="password"
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="••••••••"
                className={inputCls}
              />
            </div>

            {error && (
              <div className="bg-[#F23B3B]/10 border border-red-500/30 text-[#F23B3B] text-sm rounded-lg px-4 py-3">
                {error}
              </div>
            )}

            {success && (
              <div className="bg-green-500/10 border border-green-500/30 text-green-400 text-sm rounded-lg px-4 py-3">
                {success}
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-gradient-to-r from-[#8b1f1f] to-[#F23B3B] hover:from-[#F23B3B] hover:to-[#f87878] disabled:opacity-50 text-white font-medium rounded-lg text-sm border-0 transition-all duration-300 shadow-lg shadow-[#F23B3B]/20"
            >
              {loading ? 'Creating account…' : 'Create account'}
            </Button>
          </form>
        </div>

        <p className="text-center text-white/40 text-sm">
          Already have an account?{' '}
          <Link to="/login" className="text-[#F23B3B] hover:text-[#f87878] transition">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
