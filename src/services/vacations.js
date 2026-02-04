import { supabase } from '../lib/supabase'

/**
 * Obtiene el resumen de vacaciones (Kardex)
 * @param {string} [sede] - Filtrar por sede
 * @param {string} [search] - Filtrar por nombre o DNI
 * @returns {Promise<{data: any[], error: any}>}
 */
export const getVacationOverview = async (sede, search) => {
    const { data, error } = await supabase.rpc('get_vacation_overview', {
        p_sede: sede || null,
        p_search: search || null
    })
    return { data, error }
}

/**
 * Carga masiva de datos históricos de vacaciones
 * @param {Array<{dni: string, entry_date: string, legacy_days: number}>} data - Datos del Excel
 * @returns {Promise<{data: any, error: any}>}
 */
export const bulkUpdateVacations = async (data) => {
    const { data: result, error } = await supabase.rpc('bulk_update_vacations', {
        p_data: data
    })
    return { data: result, error }
}
