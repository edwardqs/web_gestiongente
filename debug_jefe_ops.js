
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

async function debugJefeOperaciones() {
  console.log('--- Debugging JEFE DE OPERACIONES Access ---')

  // 1. Find a user with this position
  const { data: users, error: uError } = await supabase
    .from('employees')
    .select('*')
    .eq('position', 'JEFE DE OPERACIONES')
    .limit(1)

  if (uError || !users || users.length === 0) {
      console.log('No user found with position JEFE DE OPERACIONES')
      return
  }

  const user = users[0]
  console.log(`User Found: ${user.full_name} (${user.email})`)
  console.log(`Role: ${user.role}`)
  console.log(`Sede: ${user.sede}`)
  console.log(`Business Unit: ${user.business_unit}`)

  // 2. Check Area ID for this position
  const { data: posData } = await supabase
    .from('job_positions')
    .select('area_id, areas(name)')
    .eq('name', 'JEFE DE OPERACIONES')
    .single()
    
  console.log(`Position Linked to Area: ${posData?.areas?.name} (ID: ${posData?.area_id})`)

  if (!posData?.area_id) {
      console.log('CRITICAL: Position not linked to any area!')
      return
  }

  // 3. Count employees in this area (Direct SQL check)
  const { count: totalInArea } = await supabase
    .from('employees')
    .select('id', { count: 'exact', head: true })
    // We need to join with job_positions to filter by area_id
    // But since supabase-js doesn't support deep join filtering easily on count without setup,
    // we'll fetch list and count.
    
  // Let's try to mimic get_employees_by_user_area logic via client (approximated)
  const { data: employeesInArea } = await supabase
    .from('employees')
    .select(`
        id, 
        full_name,
        position,
        job_positions!inner (area_id)
    `)
    .eq('job_positions.area_id', posData.area_id)
    
  console.log(`Employees found in Area ${posData.area_id} via direct query: ${employeesInArea?.length || 0}`)
  
  // 4. Check what the RPC returns (Simulating)
  // We can't easily impersonate the user for the RPC without their JWT.
  // But we can check the logic.
  
  if (employeesInArea?.length === 4) {
      console.log('CONFIRMED: Only 4 employees are linked to this Area via job_positions.')
      console.log('Hypothesis: Most employees are NOT linked to job_positions correctly or their position name does not match exactly.')
      
      // Check for discrepancies
      const { data: sampleEmployees } = await supabase
        .from('employees')
        .select('position')
        .limit(20)
        
      console.log('Sample Employee Positions:', sampleEmployees.map(e => e.position))
  }
}

debugJefeOperaciones()
