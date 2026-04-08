import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent } from '@/components/ui/card'
import { Mail, Lock, ArrowLeft } from 'lucide-react'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

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
    <div className="min-h-screen flex items-center justify-center bg-black px-4">
      <div className="w-full max-w-md flex flex-col gap-6">

        {/* Back to home */}
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-white transition-colors self-start"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>

        {/* Brand */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white tracking-tight">Task Tracker</h1>
          <p className="text-gray-400 mt-2 text-sm">Sign in to manage your projects</p>
        </div>

        <Card className="rounded-2xl border-gray-800 bg-gray-900 shadow-xl">
          <CardContent className="p-8 flex flex-col gap-5">
            <h2 className="text-xl font-semibold text-white">Welcome back</h2>

            <form onSubmit={handleSubmit} className="flex flex-col gap-5">

              {/* Email */}
              <div className="flex flex-col gap-2">
                <Label htmlFor="email" className="text-gray-400">Email address</Label>
                <div className="flex items-center gap-2 border border-gray-700 rounded-lg px-3 h-12 bg-gray-800 focus-within:ring-2 focus-within:ring-violet-500 focus-within:border-transparent transition">
                  <Mail className="h-5 w-5 text-gray-500 shrink-0" />
                  <Input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="border-0 shadow-none focus-visible:ring-0 bg-transparent text-white placeholder:text-gray-500"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="flex flex-col gap-2">
                <Label htmlFor="password" className="text-gray-400">Password</Label>
                <div className="flex items-center gap-2 border border-gray-700 rounded-lg px-3 h-12 bg-gray-800 focus-within:ring-2 focus-within:ring-violet-500 focus-within:border-transparent transition">
                  <Lock className="h-5 w-5 text-gray-500 shrink-0" />
                  <Input
                    id="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="border-0 shadow-none focus-visible:ring-0 bg-transparent text-white placeholder:text-gray-500"
                  />
                </div>
              </div>

              {/* Remember me & Forgot */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox id="remember" />
                  <Label htmlFor="remember" className="text-sm font-normal text-gray-400">
                    Remember me
                  </Label>
                </div>
                <button
                  type="button"
                  className="text-sm text-violet-400 hover:text-violet-300 transition"
                >
                  Forgot password?
                </button>
              </div>

              {/* Error */}
              {error && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-4 py-3">
                  {error}
                </div>
              )}

              {/* Submit */}
              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 text-base font-medium rounded-lg bg-violet-600 hover:bg-violet-500"
              >
                {loading ? 'Signing in…' : 'Sign in'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-gray-500 text-sm">
          Don&apos;t have an account?{' '}
          <Link to="/register" className="text-violet-400 hover:text-violet-300 transition">
            Create one
          </Link>
        </p>
      </div>
    </div>
  )
}
