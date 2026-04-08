import axios from 'axios'
import { supabase } from '../supabaseClient'

const api = axios.create({
  baseURL: '/api',
})

// Inject the Supabase JWT into every outgoing request
api.interceptors.request.use(async (config) => {
  const { data: { session } } = await supabase.auth.getSession()
  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`
  }
  return config
})

export default api
