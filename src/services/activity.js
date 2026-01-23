import { supabase } from '../lib/supabase'

export const getRecentActivity = async (limit = 10) => {
  // Usamos la nueva RPC para obtener datos consistentes y rápidos
  const { data, error } = await supabase.rpc('get_dashboard_activity', {
    p_limit: limit
  })
  
  // Mapeamos para mantener compatibilidad con el formato esperado por el componente
  if (data) {
    const formattedData = data.map(item => ({
      ...item,
      employees: {
        full_name: item.full_name,
        profile_picture_url: item.profile_picture_url,
        position: item.position
      }
    }))
    return { data: formattedData, error }
  }

  return { data, error }
}

export const subscribeToActivity = (callback) => {
  return supabase
    .channel('dashboard-attendance')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'attendance' }, // Escuchar TODO (Insert, Update, Delete)
      async (payload) => {
        // En lugar de intentar construir el objeto parcialmente,
        // invocamos la RPC nuevamente para obtener el item actualizado completo con datos del empleado.
        // O mejor aún, solo hacemos fetch del empleado si es INSERT/UPDATE.
        
        if (payload.eventType === 'DELETE') {
             // Si se borra, podríamos pasar solo el ID para que el frontend lo quite
             callback({ id: payload.old.id, deleted: true })
             return
        }

        try {
            // Obtenemos los datos frescos del empleado para este registro
            const { data: employeeData, error } = await supabase
            .from('employees')
            .select('full_name, profile_picture_url, position')
            .eq('id', payload.new.employee_id)
            .single()
            
            if (error) {
                console.error('Error fetching employee details for realtime:', error)
                return
            }

            const enrichedActivity = {
                ...payload.new,
                employees: employeeData
            }
            callback(enrichedActivity)
        } catch (e) {
            console.error('Error processing realtime activity:', e)
        }
      }
    )
    .subscribe()
}
