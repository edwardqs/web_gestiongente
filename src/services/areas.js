import { supabase } from '../lib/supabase'

export async function getAreas() {
  const { data, error } = await supabase
    .from('areas')
    .select('*')
    .order('name')
  
  return { data, error }
}

export async function createArea(name) {
  const { data, error } = await supabase
    .from('areas')
    .insert([{ name: name.toUpperCase() }])
    .select()
    .single()
    
  return { data, error }
}

export async function deleteArea(id) {
  const { error } = await supabase
    .from('areas')
    .delete()
    .eq('id', id)
    
  return { error }
}

export async function updatePositionArea(positionId, areaId) {
  const { data, error } = await supabase
    .from('job_positions')
    .update({ area_id: areaId })
    .eq('id', positionId)
    .select()
    
  return { data, error }
}
