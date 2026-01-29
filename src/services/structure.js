import { supabase } from '../lib/supabase'

export async function getLocations() {
  return await supabase
    .from('locations')
    .select('id, name')
    .order('name')
}

export async function getDepartmentsByLocation(locationId) {
  const { data, error } = await supabase
    .from('org_structure')
    .select('department_id, departments (id, name)')
    .eq('location_id', locationId)

  if (error) return { data: null, error }

  const uniqueDepts = []
  const seen = new Set()

  data?.forEach(item => {
    if (item.departments && !seen.has(item.departments.id)) {
      seen.add(item.departments.id)
      uniqueDepts.push(item.departments)
    }
  })

  return { data: uniqueDepts.sort((a, b) => a.name.localeCompare(b.name)), error: null }
}

export async function getPositionsByLocationAndDept(locationId, departmentId) {
  const { data, error } = await supabase
    .from('org_structure')
    .select('job_position_id, job_positions (id, name, default_role_id)')
    .eq('location_id', locationId)
    .eq('department_id', departmentId)

  if (error) return { data: null, error }

  const uniquePos = []
  const seen = new Set()

  data?.forEach(item => {
    if (item.job_positions && !seen.has(item.job_positions.id)) {
      seen.add(item.job_positions.id)
      uniquePos.push(item.job_positions)
    }
  })

  return { data: uniquePos.sort((a, b) => a.name.localeCompare(b.name)), error: null }
}
