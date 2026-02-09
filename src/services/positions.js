
import { supabase } from '../lib/supabase'

export async function getPositions() {
  // Obtenemos cargos, count de empleados y el área asignada
  const { data, error } = await supabase
    .from('job_positions')
    .select('*, employees(count), areas(id, name)')
    .order('name')

  if (error) return { data: null, error }

  // Mapeamos para que el count sea un número simple y aplanamos area
  const positions = data.map(pos => ({
    ...pos,
    employee_count: pos.employees ? pos.employees[0]?.count : 0,
    area_name: pos.areas?.name || 'Sin Área Asignada',
    area_id: pos.areas?.id || null
  }))
  
  return { data: positions, error: null }
}

export async function createPosition(position) {
  const { data, error } = await supabase
    .from('job_positions')
    .insert([position])
    .select()
    .single()

  return { data, error }
}

export async function updatePosition(id, updates) {
  const { data, error } = await supabase
    .from('job_positions')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  return { data, error }
}

export async function deletePosition(id) {
  const { error } = await supabase
    .from('job_positions')
    .delete()
    .eq('id', id)

  return { error }
}
