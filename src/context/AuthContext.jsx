import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})

export const useAuth = () => useContext(AuthContext)

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null)
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 1. Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session?.user) {
        fetchProfile(session.user)
      } else {
        setUser(null)
        setLoading(false)
      }
    })

    // 2. Listen for changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session?.user) {
        fetchProfile(session.user)
      } else {
        setUser(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const fetchProfile = async (authUser) => {
    try {
      // Usar la función RPC segura para buscar el perfil
      // Esto evita problemas de RLS y lógica compleja en el cliente
      const { data, error } = await supabase.rpc('get_user_employee_profile', {
        p_email: authUser.email
      })

      if (data && !error) {
        // Combinar datos de auth y empleado
        setUser({
          ...authUser,
          employee_id: data.id, // ID crítico para operaciones
          role: data.role,
          full_name: data.full_name,
          position: data.position,
          profile: data
        })
        console.log('Perfil de empleado cargado:', data.full_name)
      } else {
        console.warn('No se encontró perfil de empleado vinculado. Usando modo compatibilidad Auth ID.')
        // MODO COMPATIBILIDAD:
        // Si no hay perfil de empleado, asumimos que el usuario Auth PUEDE actuar
        // y pasamos su ID de Auth como employee_id temporal.
        // Esto permite que el flujo continúe como antes.
        setUser({
            ...authUser,
            employee_id: authUser.id, // Fallback al ID de Auth
            role: 'ADMIN', // Asumimos rol alto para pruebas si no hay perfil
            full_name: authUser.email.split('@')[0],
            profile: null
        })
      }
    } catch (err) {
      console.error('Error fetching profile:', err)
      setUser(authUser)
    } finally {
      setLoading(false)
    }
  }

  const value = {
    session,
    user,
    loading,
    signOut: async () => {
      setUser(null)
      setSession(null)
      return await supabase.auth.signOut()
    },
    // Exponer función para recargar perfil manualmente si es necesario
    refreshProfile: () => {
        if (session?.user) fetchProfile(session.user)
    }
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
