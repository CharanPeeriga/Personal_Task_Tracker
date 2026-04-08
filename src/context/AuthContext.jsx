import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import LoadingScreen from '../components/LoadingScreen'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Hydrate with the existing session on first load
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    // Keep session in sync with Supabase auth events
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  const login = (email, password) =>
    supabase.auth.signInWithPassword({ email, password })

  const register = (email, password) =>
    supabase.auth.signUp({ email, password })

  const logout = () => supabase.auth.signOut()

  const value = {
    session,
    user: session?.user ?? null,
    login,
    register,
    logout,
    loading,
  }

  // Show animated loading screen until the initial session check is done
  if (loading) return <LoadingScreen />

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within an AuthProvider')
  return context
}
