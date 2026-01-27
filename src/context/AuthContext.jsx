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
        // Cargar perfil del usuario si hay sesión
        if (session?.user) {
             // Llamar a fetchProfile para asegurar datos frescos y completos
             // Esto actualizará 'user' y pondrá 'loading' en false cuando termine
             fetchProfile(session.user);
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
      let employeeData = null;
      
      // Intentamos traer también la info del rol si existe la relación
       // Usamos try/catch silencioso para la query por si la tabla roles aun no existe o no está vinculada
       try {
           // IMPORTANTE: Primero obtenemos el empleado simple para evitar recursión en RLS si la hay
           const { data: simpleEmployee, error: simpleError } = await supabase
             .from('employees')
             .select('*, role_id') // Solo traemos role_id primero
             .eq('email', authUser.email)
             .maybeSingle();
             
           if (simpleEmployee) {
               employeeData = simpleEmployee;
               
               // Si tiene role_id, hacemos fetch manual del rol (2 pasos) para romper cualquier ciclo de query compleja
               if (simpleEmployee.role_id) {
                   const { data: roleData } = await supabase
                     .from('roles')
                     .select('*')
                     .eq('id', simpleEmployee.role_id)
                     .single();
                   
                   if (roleData) {
                       employeeData.roles = roleData;
                   }
               }
           }
       } catch (e) {
           console.error('Error auth manual:', e);
           // Fallback final
           employeeData = { email: authUser.email };
       }
      
      /* Bloque anterior reemplazado por la lógica de arriba más robusta */

      if (employeeData) {
        // VALIDACIÓN DE ACCESO WEB
        // Si tiene un rol asignado y ese rol tiene web_access = false, denegar acceso
        if (employeeData.roles && employeeData.roles.web_access === false) {
            console.error('Acceso denegado: El rol del usuario no tiene permisos para Web');
            alert('Tu rol actual no tiene permisos para acceder a la plataforma Web.');
            await supabase.auth.signOut();
            setUser(null);
            setSession(null);
            return;
        }

        // Combinar datos de auth y empleado
        const finalUser = {
          ...authUser,
          employee_id: employeeData.id,
          role: employeeData.roles?.name || employeeData.role || employeeData.employee_type, // Priorizar rol relacional
          permissions: employeeData.roles || {}, // Permisos explícitos
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
