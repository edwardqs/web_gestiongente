import { supabase } from '../lib/supabase'

export const getPapeletaById = async (id) => {
  try {
    const { data, error } = await supabase
      .from('vacation_requests')
      .select(`
        *,
        employees!vacation_requests_employee_id_fkey (
          full_name,
          dni,
          position,
          sede,
          email
        )
      `)
      .eq('id', id)
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Error fetching papeleta:', error)
    return { data: null, error }
  }
}

export const getRequests = async () => {
  try {
    console.log('Fetching requests...')
    
    // 1. Intentar traer todo con Join explícito
    const { data, error } = await supabase
      .from('vacation_requests')
      .select(`
        *,
        employees!vacation_requests_employee_id_fkey (
          full_name,
          dni,
          position,
          sede,
          profile_picture_url,
          email
        )
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Supabase error fetching requests:', error)
      throw error
    }

    console.log('Requests fetched:', data?.length)
    return { data, error: null }
  } catch (error) {
    console.error('Error fetching requests:', error)
    return { data: [], error }
  }
}
