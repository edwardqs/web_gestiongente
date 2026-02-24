import { supabase } from '../lib/supabase'

// -----------------------------------------------------------------------------
// SEDES (HEADQUARTERS)
// -----------------------------------------------------------------------------

export const getSedes = async () => {
  const { data, error } = await supabase
    .from('sedes')
    .select('*')
    .order('name', { ascending: true })
  
  return { data, error }
}

export const createSede = async (name, address) => {
  const { data, error } = await supabase
    .from('sedes')
    .insert([{ name, address }])
    .select()
  
  return { data, error }
}

export const updateSede = async (id, updates) => {
  const { data, error } = await supabase
    .from('sedes')
    .update(updates)
    .eq('id', id)
    .select()
  
  return { data, error }
}

export const deleteSede = async (id) => {
  // Eliminación lógica (soft delete) preferiblemente
  const { data, error } = await supabase
    .from('sedes')
    .update({ is_active: false })
    .eq('id', id)
  
  return { data, error }
}

// -----------------------------------------------------------------------------
// BUSINESS UNITS
// -----------------------------------------------------------------------------

export const getBusinessUnits = async () => {
  const { data, error } = await supabase
    .from('business_units')
    .select('*')
    .order('name', { ascending: true })
  
  return { data, error }
}

export const createBusinessUnit = async (name) => {
  const { data, error } = await supabase
    .from('business_units')
    .insert([{ name }])
    .select()
  
  return { data, error }
}

export const updateBusinessUnit = async (id, updates) => {
  const { data, error } = await supabase
    .from('business_units')
    .update(updates)
    .eq('id', id)
    .select()
  
  return { data, error }
}

export const deleteBusinessUnit = async (id) => {
  const { data, error } = await supabase
    .from('business_units')
    .update({ is_active: false })
    .eq('id', id)
  
  return { data, error }
}

// -----------------------------------------------------------------------------
// ORGANIZATION STRUCTURE (RELATIONS)
// -----------------------------------------------------------------------------

// Obtener estructura completa (Sedes con sus Unidades)
export const getOrganizationStructure = async () => {
  // Supabase no soporta joins anidados profundos fácilmente en una sola query plana,
  // pero podemos traer la estructura y hacer el join.
  
  // Opción A: Traer tabla pivote con joins
  const { data, error } = await supabase
    .from('org_structure')
    .select(`
      id,
      valid_from,
      valid_to,
      is_active,
      sedes ( id, name ),
      business_units ( id, name )
    `)
    .eq('is_active', true)
    .is('valid_to', null) // Solo vigentes
  
  return { data, error }
}

// Asignar Unidad a Sede
export const assignUnitToSede = async (sedeId, unitId) => {
  const { data, error } = await supabase
    .from('org_structure')
    .insert([{ 
      sede_id: sedeId, 
      business_unit_id: unitId,
      valid_from: new Date().toISOString()
    }])
    .select()

  return { data, error }
}

// Remover Unidad de Sede (Soft Delete / Cerrar vigencia)
export const removeUnitFromSede = async (structureId) => {
  // Cerramos la vigencia poniendo valid_to = ayer
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  
  const { data, error } = await supabase
    .from('org_structure')
    .update({ 
      valid_to: yesterday.toISOString(),
      is_active: false 
    })
    .eq('id', structureId)

  return { data, error }
}
