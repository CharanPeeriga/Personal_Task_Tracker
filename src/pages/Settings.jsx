import { useState } from 'react'
import { toast } from 'react-toastify'
import { supabase } from '@/supabaseClient'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Loader2, AlertCircle } from 'lucide-react'

export default function Settings() {
  const [pwForm, setPwForm]       = useState({ newPassword: '', confirmPassword: '' })
  const [pwLoading, setPwLoading] = useState(false)
  const [pwError, setPwError]     = useState('')

  async function handleChangePassword(e) {
    e.preventDefault()
    setPwError('')
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      setPwError('Passwords do not match.')
      return
    }
    setPwLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: pwForm.newPassword })
      if (error) throw error
      toast.success('Password updated')
      setPwForm({ newPassword: '', confirmPassword: '' })
    } catch (err) {
      const msg = err?.message ?? 'Failed to update password.'
      setPwError(msg)
      toast.error(msg)
    } finally {
      setPwLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
      </div>

      {/* Account */}
      <div className="rounded-2xl border border-gray-800/50 bg-gray-950/60 backdrop-blur-sm p-6 flex flex-col gap-5">
        <h2 className="text-sm font-semibold text-white">Account</h2>

        <form onSubmit={handleChangePassword} className="flex flex-col gap-4">
          <p className="text-xs text-gray-400 font-medium">Change Password</p>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="new-password" className="text-gray-400 text-xs">New Password</Label>
            <Input
              id="new-password"
              type="password"
              value={pwForm.newPassword}
              onChange={e => setPwForm(p => ({ ...p, newPassword: e.target.value }))}
              required
              className="bg-black border-gray-800 text-white placeholder:text-white/30 focus-visible:ring-1 focus-visible:ring-white/30 focus-visible:border-white/30"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="confirm-password" className="text-gray-400 text-xs">Confirm Password</Label>
            <Input
              id="confirm-password"
              type="password"
              value={pwForm.confirmPassword}
              onChange={e => setPwForm(p => ({ ...p, confirmPassword: e.target.value }))}
              required
              className="bg-black border-gray-800 text-white placeholder:text-white/30 focus-visible:ring-1 focus-visible:ring-white/30 focus-visible:border-white/30"
            />
          </div>

          {pwError && (
            <div className="flex items-center gap-2 text-sm text-red-400 bg-red-950/30 border border-red-900/40 rounded-lg px-3 py-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {pwError}
            </div>
          )}

          <div className="flex justify-end">
            <Button type="submit" variant="solid" size="sm" disabled={pwLoading}>
              {pwLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              {pwLoading ? 'Updating…' : 'Update Password'}
            </Button>
          </div>
        </form>
      </div>

      {/* Connections */}
      <div className="rounded-2xl border border-gray-800/50 bg-gray-950/60 backdrop-blur-sm p-6 flex flex-col gap-5">
        <h2 className="text-sm font-semibold text-white">Connections</h2>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm text-white">Google Calendar</span>
            <span className="text-xs text-gray-500 bg-gray-800/60 border border-gray-700/40 rounded-full px-2.5 py-0.5">
              Not connected
            </span>
          </div>
          <Button variant="ghost" size="sm" neon={false} disabled>
            Coming soon
          </Button>
        </div>
      </div>
    </div>
  )
}
