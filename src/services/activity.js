import { supabase } from '../lib/supabase'

export const getRecentActivity = async (limit = 10, sede = null, businessUnit = null) => {
  try {
    // 1. Obtener Asistencias recientes
    let attQuery = supabase
      .from('attendance')
      .select(`
        *,
        employees!attendance_employee_id_fkey!inner (
          full_name,
          profile_picture_url,
          position,
          sede,
          business_unit
        )
      `)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (sede) {
        attQuery = attQuery.eq('employees.sede', sede)
    }
    if (businessUnit) {
        attQuery = attQuery.eq('employees.business_unit', businessUnit)
    }

    const { data: attendanceData, error: attendanceError } = await attQuery

    if (attendanceError) throw attendanceError

    // 2. Obtener Solicitudes recientes
    let reqQuery = supabase
      .from('vacation_requests')
      .select(`
        *,
        employees!vacation_requests_employee_id_fkey!inner (
          full_name,
          profile_picture_url,
          position,
          sede,
          business_unit
        )
      `)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (sede) {
        reqQuery = reqQuery.eq('employees.sede', sede)
    }
    if (businessUnit) {
        reqQuery = reqQuery.eq('employees.business_unit', businessUnit)
    }

    const { data: requestsData, error: requestsError } = await reqQuery

    if (requestsError) throw requestsError

    // 3. Normalizar datos de Solicitudes para que parezcan actividades
    const normalizedRequests = (requestsData || []).map(req => ({
      id: req.id,
      created_at: req.created_at,
      employee_id: req.employee_id,
      record_type: req.request_type, // Mapeamos request_type a record_type
      notes: `${req.start_date} al ${req.end_date}`, // Usamos fechas como notas/subtexto
      status: req.status, // PENDIENTE, APROBADO, etc.
      employees: req.employees,
      is_request: true // Flag para identificar
    }))

    // 4. Normalizar datos de Asistencia
    const normalizedAttendance = (attendanceData || []).map(att => ({
      ...att,
      is_request: false
    }))

    // 5. Combinar y Ordenar
    const combined = [...normalizedAttendance, ...normalizedRequests]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, limit)

    return { data: combined, error: null }

  } catch (error) {
    console.error('Error fetching combined activity:', error)
    return { data: [], error }
  }
}

export const subscribeToActivity = (callback, filters = {}) => {
  // Canal para Asistencias
  const attendanceSub = supabase
    .channel('dashboard-attendance')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'attendance' },
      async (payload) => {
        if (payload.eventType === 'DELETE') {
             callback({ id: payload.old.id, deleted: true })
             return
        }
        await fetchAndCallback(payload.new, callback, false, filters)
      }
    )
    .subscribe()

  // Canal para Solicitudes
  const requestsSub = supabase
    .channel('dashboard-requests')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'vacation_requests' },
      async (payload) => {
        if (payload.eventType === 'DELETE') {
             callback({ id: payload.old.id, deleted: true })
             return
        }
        // Normalizar payload de solicitud antes de enviarlo
        const normalizedPayload = {
            ...payload.new,
            record_type: payload.new.request_type,
            notes: `${payload.new.start_date} al ${payload.new.end_date}`,
            is_request: true
        }
        await fetchAndCallback(normalizedPayload, callback, true, filters)
      }
    )
    .subscribe()

  return {
    unsubscribe: () => {
      attendanceSub.unsubscribe()
      requestsSub.unsubscribe()
    }
  }
}

// Helper para obtener datos del empleado y enriquecer el evento
const fetchAndCallback = async (record, callback, isRequest, filters = {}) => {
    try {
        const { data: employeeData, error } = await supabase
        .from('employees')
        .select('full_name, profile_picture_url, position, email, sede, business_unit')
        .eq('id', record.employee_id)
        .single()
        
        if (error) {
            console.error('Error fetching employee details:', error)
            return
        }

        // --- FILTRADO REALTIME ---
        if (filters.sede && employeeData.sede !== filters.sede) return
        if (filters.businessUnit && employeeData.business_unit !== filters.businessUnit) return

        const enrichedActivity = {
            ...record,
            employees: employeeData
        }
        callback(enrichedActivity)
    } catch (e) {
        console.error('Error processing realtime activity:', e)
    }
}
