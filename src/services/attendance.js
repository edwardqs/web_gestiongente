import { supabase } from '../lib/supabase'

export const getAttendanceRecords = async (limit = 50) => {
  const { data, error } = await supabase
    .from('attendance')
    .select(`
      *,
      employees (
        first_name,
        last_name,
        position,
        sede
      )
    `)
    .order('created_at', { ascending: false })
    .limit(limit)

  return { data, error }
}
