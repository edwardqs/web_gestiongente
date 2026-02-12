import { supabase } from '../lib/supabase'

/**
 * Obtiene métricas del dashboard mensual
 * @param {number} year - Año (ej: 2024)
 * @param {number} month - Mes (1-12)
 * @param {string|null} sede - Filtro opcional por sede
 */
export const getDashboardMetrics = async (year, month, sede = null) => {
    try {
        const { data, error } = await supabase.rpc('get_monthly_dashboard_metrics', {
            p_year: parseInt(year),
            p_month: parseInt(month),
            p_sede: sede === 'all' ? null : sede
        })

        if (error) throw error
        return { data, error: null }
    } catch (error) {
        console.error('Error fetching dashboard metrics:', error)
        return { data: null, error }
    }
}

/**
 * Obtiene estadísticas principales del dashboard (KPIs)
 * @param {string|null} sede 
 * @param {string|null} businessUnit 
 */
export const getDashboardStats = async (sede = null, businessUnit = null) => {
    try {
        const { data, error } = await supabase.rpc('get_main_dashboard_stats', {
            p_sede: sede,
            p_business_unit: businessUnit
        })

        if (error) throw error
        return { data, error: null }
    } catch (error) {
        console.error('Error fetching dashboard stats:', error)
        return { data: null, error }
    }
}
