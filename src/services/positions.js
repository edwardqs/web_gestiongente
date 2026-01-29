
import { supabase } from '../lib/supabase'

export async function getPositions() {
  // Obtenemos cargos y hacemos un count de empleados relacionados
  // Supabase postgrest soporta count en relaciones
  const { data, error } = await supabase
    .from('job_positions')
    .select('*, employees(count)')
    .order('name')

  if (error) return { data: null, error }

  // Mapeamos para que el count sea un número simple
  const positions = data.map(pos => ({
    ...pos,
    employee_count: pos.employees ? pos.employees[0]?.count : 0 // Ajuste según respuesta de Supabase count
  }))
  
  // Nota: select('*, employees(count)') retorna employees: [{count: N}]
  // Vamos a verificar si 'employees' llega como array o objeto dependiendo de la versión
  
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
