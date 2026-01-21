import { supabase } from '../lib/supabase'

export const getRecentActivity = async (limit = 10) => {
  const { data, error } = await supabase
    .from('attendance')
    .select(`
      *,
      employees:employee_id (
        full_name,
        profile_picture_url
      )
    `)
    .order('created_at', { ascending: false })
    .limit(limit)
  
  return { data, error }
}

export const subscribeToActivity = (callback) => {
  return supabase
    .channel('dashboard-attendance')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'attendance' },
      async (payload) => {
        // Fetch employee details for the new record
        const { data } = await supabase
          .from('employees')
          .select('full_name, profile_picture_url')
          .eq('id', payload.new.employee_id)
          .single()
        
        const enrichedActivity = {
          ...payload.new,
          employees: data
        }
        callback(enrichedActivity)
      }
    )
    .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'attendance' },
        async (payload) => {
            // También escuchar actualizaciones (ej. validaciones, salidas)
            const { data } = await supabase
            .from('employees')
            .select('full_name, profile_picture_url')
            .eq('id', payload.new.employee_id)
            .single()
            
            const enrichedActivity = {
            ...payload.new,
            employees: data
            }
            callback(enrichedActivity)
        }
    )
    .subscribe()
}
