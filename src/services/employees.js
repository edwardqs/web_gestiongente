import { supabase } from '../lib/supabase'

export const createEmployee = async (employeeData) => {
  const { data, error } = await supabase
    .from('employees')
    .insert([employeeData])
    .select()

  if (error) {
    console.error("Error creating employee in Supabase:", error)
    throw error // Re-lanzar para que el catch del componente lo atrape
  }
  
  return { data, error: null }
}

export const getEmployees = async () => {
  const { data, error } = await supabase
    .from('employees')
    .select('*')
    .order('created_at', { ascending: false })
  
  return { data, error }
}

// Obtener un solo empleado por ID
export const getEmployeeById = async (id) => {
  const { data, error } = await supabase
    .from('employees')
    .select('*')
    .eq('id', id)
    .single()
  
  return { data, error }
}

// Actualizar empleado
export const updateEmployee = async (id, employeeData) => {
  const { data, error } = await supabase
    .from('employees')
    .update(employeeData)
    .eq('id', id)
    .select()
  
  return { data, error }
}

// Eliminar empleado
export const deleteEmployee = async (id) => {
  const { error } = await supabase
    .from('employees')
    .delete()
    .eq('id', id)
  
  return { error }
}
