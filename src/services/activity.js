import { supabase } from '../lib/supabase'

export const getRecentActivity = async (limit = 5) => {
  const { data, error } = await supabase
    .from('activity_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)
  
  return { data, error }
}

export const subscribeToActivity = (callback) => {
  return supabase
    .channel('custom-all-channel')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'activity_logs' },
      (payload) => {
        callback(payload.new)
      }
    )
    .subscribe()
}
