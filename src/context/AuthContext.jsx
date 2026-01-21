import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})

export const useAuth = () => useContext(AuthContext)

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null)
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true;

    // 1. Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      
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
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth State Change:', event)
      if (!mounted) return;

      if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
        // Limpieza inmediata
        setSession(null)
        setUser(null)
        setLoading(false)
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        setSession(session)
        // Solo llamar a fetchProfile si NO estamos cargando ya o si no hay usuario
        // Evitamos llamar fetchProfile en SIGNED_IN si getSession ya lo inició
        if (session?.user) {
             // Pequeña optimización: Verificar si ya tenemos este usuario cargado en memoria
             // para evitar doble fetch al inicio (getSession + onAuthStateChange suelen dispararse juntos)
             setUser(prev => {
                 if (prev && prev.id === session.user.id) return prev; 
                 fetchProfile(session.user); // Si es nuevo o null, buscar perfil
                 return prev;
             });
        }
      } 
    })

    return () => {
        mounted = false;
        subscription.unsubscribe()
    }
  }, [])

  const fetchProfile = async (authUser) => {
    try {
      // Optimización: Si ya estamos cargando o tenemos datos recientes, evitar re-llamadas innecesarias
      // Pero como fetchProfile se llama desde useEffect, mejor dejarlo simple.
      
      const { data, error } = await supabase.rpc('get_user_employee_profile', {
        p_email: authUser.email
      })

      if (data && !error) {
        // Combinar datos de auth y empleado
        setUser({
          ...authUser,
          employee_id: data.id,
          role: data.role,
          full_name: data.full_name,
          position: data.position,
          profile: data
        })
      } else {
        // Fallback rápido
        setUser({
            ...authUser,
            employee_id: authUser.id,
            role: 'ADMIN',
            full_name: authUser.email.split('@')[0],
            profile: null
        })
      }
    } catch (err) {
      console.error('Error fetching profile:', err)
      // Asegurar que el usuario pueda entrar aunque falle el perfil
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
