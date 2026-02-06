import { supabase } from '../lib/supabase'

export const getDashboardStats = async () => {
  try {
    const { data, error } = await supabase
      .rpc('get_dashboard_stats')

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
