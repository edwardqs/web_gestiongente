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
      console.log('Buscando perfil para:', authUser.email);
      
      // INTENTO 1: Consulta Directa a tabla employees
      // Esto suele ser más robusto si RLS está bien configurado
      let employeeData = null;
      
      const { data: directData, error: directError } = await supabase
        .from('employees')
        .select('*')
        .eq('email', authUser.email)
        .maybeSingle(); // Usamos maybeSingle para no lanzar error si no existe

      if (!directError && directData) {
        console.log('Perfil encontrado (Directo):', directData);
        employeeData = directData;
      } else {
        console.warn('Fallo búsqueda directa:', directError);
        
        // INTENTO 2: Fallback a RPC si la directa falla
        const { data: rpcData, error: rpcError } = await supabase.rpc('get_user_employee_profile', {
          p_email: authUser.email
        })
        
        if (!rpcError && rpcData) {
           console.log('Perfil encontrado (RPC):', rpcData);
           employeeData = rpcData;
        }
      }

      if (employeeData) {
        // Combinar datos de auth y empleado
        const finalUser = {
          ...authUser,
          employee_id: employeeData.id,
          role: employeeData.role || employeeData.employee_type, // Priorizar role, fallback a tipo
          full_name: employeeData.full_name,
          position: employeeData.position,
          sede: employeeData.sede,
          profile: employeeData
        };
        console.log('Usuario Final Configurado:', finalUser);
        setUser(finalUser)
      } else {
        console.warn('Perfil NO encontrado en ninguna búsqueda');
        // Fallback rápido
        setUser({
            ...authUser,
            employee_id: authUser.id,
            role: 'ADMIN', // Fallback temporal
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
