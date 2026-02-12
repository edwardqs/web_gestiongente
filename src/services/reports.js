import { supabase } from '../lib/supabase'

/**
 * Obtiene el reporte maestro de empleados
 * @param {string|null} sede - Filtro opcional por sede
 * @param {string|null} businessUnit - Filtro opcional por unidad de negocio
 */
export const getEmployeesReport = async (sede = null, businessUnit = null) => {
    try {
        // 1. Obtener empleados
        let query = supabase
            .from('employees')
            .select(`*`)
            .order('full_name')

        if (sede && sede !== 'all') {
            query = query.eq('sede', sede)
        }

        if (businessUnit && businessUnit !== 'all') {
            query = query.eq('business_unit', businessUnit)
        }

        const { data: employees, error: empError } = await query
        if (empError) throw empError

        // 2. Obtener cargos (job_positions) con su área relacionada
        const { data: positions, error: posError } = await supabase
            .from('job_positions')
            .select('name, areas(name)') // Relación correcta con tabla 'areas'
        
        if (posError) {
            console.warn('Error fetching job_positions for report:', posError)
        }

        // Crear mapa de Cargo -> Área
        const positionAreaMap = {}
        if (positions) {
            positions.forEach(pos => {
                if (pos.name) {
                    // Acceder al nombre del área a través de la relación
                    positionAreaMap[pos.name] = pos.areas?.name || 'Sin Área'
                }
            })
        }

        // 3. Cruzar datos
        const enrichedData = employees.map(emp => ({
            ...emp,
            area_name: { area_name: positionAreaMap[emp.position] || 'Sin Área' } // Estructura compatible con el frontend existente
        }))

        return { data: enrichedData, error: null }
    } catch (error) {
        console.error('Error fetching employees report:', error)
        return { data: null, error }
    }
}

/**
 * Obtiene el reporte de asistencias en un rango de fechas
 * @param {string} startDate - Fecha inicio YYYY-MM-DD
 * @param {string} endDate - Fecha fin YYYY-MM-DD
 * @param {string|null} sede - Filtro opcional por sede
 */
export const getAttendanceReport = async (startDate, endDate, sede = null) => {
    try {
        // Usamos la función RPC existente si es posible, o consulta directa
        // Consulta directa para mayor flexibilidad en el reporte
        let query = supabase
            .from('attendance')
            .select(`
                *,
                employees!inner(
                    full_name,
                    dni,
                    position,
                    sede,
                    business_unit
                )
            `)
            .gte('work_date', startDate)
            .lte('work_date', endDate)
            .order('work_date', { ascending: false })
            .order('check_in', { ascending: true })

        if (sede && sede !== 'all') {
            query = query.eq('employees.sede', sede)
        }

        const { data, error } = await query

        if (error) throw error
        return { data, error: null }
    } catch (error) {
        console.error('Error fetching attendance report:', error)
        return { data: null, error }
    }
}

/**
 * Obtiene el reporte de nuevos ingresos (Wrapper)
 */
export const getNewHiresReport = async (year, month, sede = null) => {
    try {
        const { data, error } = await supabase.rpc('get_monthly_dashboard_metrics', {
            p_year: parseInt(year),
            p_month: parseInt(month),
            p_sede: sede === 'all' ? null : sede
        })

        if (error) throw error
        
        // Extraer solo la lista de nuevos ingresos
        return { data: data?.new_hires?.list || [], error: null }
    } catch (error) {
        console.error('Error fetching new hires report:', error)
        return { data: null, error }
    }
}

/**
 * Obtiene reporte consolidado de vacaciones
 */
export const getVacationBalanceReport = async (sede = null) => {
    try {
        // Reutilizamos la RPC de overview que ya calcula saldos
        let query = supabase.rpc('get_vacation_overview', {
            p_sede: sede === 'all' ? null : sede,
            p_search: null
        })

        const { data, error } = await query

        if (error) throw error
        return { data, error: null }
    } catch (error) {
        console.error('Error fetching vacation balance report:', error)
        return { data: null, error }
    }
}
