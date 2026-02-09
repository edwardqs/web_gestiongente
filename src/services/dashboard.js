import { supabase } from '../lib/supabase'

export const getDashboardStats = async (sede = null, businessUnit = null) => {
  try {
    const params = {}
    if (sede) params.p_sede = sede
    if (businessUnit) params.p_business_unit = businessUnit

    const { data, error } = await supabase
      .rpc('get_dashboard_stats', params)

    if (error) {
      console.error('Error fetching dashboard stats:', error)
      return { data: null, error }
    }

    return { data, error: null }
  } catch (error) {
    console.error('Error in getDashboardStats:', error)
    return { data: null, error }
  }
}
