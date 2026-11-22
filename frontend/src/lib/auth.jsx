import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { api } from './api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined) // undefined = loading, null = signed out
  const [meta, setMeta] = useState(null)

  const refresh = useCallback(async () => {
    const r = await api.get('/auth/me')
    setUser(r.ok ? r.user : null)
    return r.user
  }, [])

  useEffect(() => {
    refresh()
    api.get('/marketplace/meta').then((r) => r.ok && setMeta(r))
  }, [refresh])

  const logout = useCallback(async () => {
    await api.post('/auth/logout')
    setUser(null)
  }, [])

  return <AuthContext.Provider value={{ user, setUser, refresh, logout, meta }}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)

// Small data-loading hook: returns [data, { loading, error, reload }].
export function useApi(url, deps = []) {
  const [state, setState] = useState({ data: null, loading: true, error: '' })
  const load = useCallback(async () => {
    if (!url) return
    setState((s) => ({ ...s, loading: true }))
    const r = await api.get(url)
    setState({ data: r.ok ? r : null, loading: false, error: r.ok ? '' : r.error })
  }, [url]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    load()
  }, [load, ...deps]) // eslint-disable-line react-hooks/exhaustive-deps
  return [state.data, { loading: state.loading, error: state.error, reload: load }]
}
