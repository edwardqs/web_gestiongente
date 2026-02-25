
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)

async function checkUpdateAndTrigger() {
  console.log('--- Checking Update and Trigger ---')
  
  // 1. Get a test employee (or just one to test with)
  const { data: employees, error: fetchError } = await supabase
    .from('employees')
    .select('id, full_name, business_unit, sede, location_id, department_id')
    .limit(1)
  
  if (fetchError) {
    console.error('Error fetching employees:', fetchError)
    // Check if error is about missing columns
    if (fetchError.message.includes('column') && fetchError.message.includes('does not exist')) {
        console.log('Confirmed: location_id or department_id do not exist.')
    }
    return
  }

  const emp = employees[0]
  console.log(`Testing with employee: ${emp.full_name} (${emp.id})`)
  console.log(`Current Unit: ${emp.business_unit}, Sede: ${emp.sede}`)
  console.log(`IDs: location_id=${emp.location_id}, department_id=${emp.department_id}`)

  // 2. Update to a temp unit
  const tempUnit = emp.business_unit === 'TEST_UNIT' ? 'OPL' : 'TEST_UNIT'
  console.log(`Updating to: ${tempUnit}`)

  const { data: updated, error: updateError } = await supabase
    .from('employees')
    .update({ business_unit: tempUnit })
    .eq('id', emp.id)
    .select()

  if (updateError) {
    console.error('Error updating employee:', updateError)
    return
  }

  console.log('Update successful:', updated[0].business_unit)

  // 3. Check History
  console.log('Checking history...')
  // Wait a bit for trigger? Triggers are synchronous usually.
  const { data: history, error: historyError } = await supabase
    .from('employee_assignments_history')
    .select('*')
    .eq('employee_id', emp.id)
    .order('created_at', { ascending: false })
    .limit(1)

  if (historyError) {
    console.error('Error fetching history:', historyError)
  } else {
    if (history.length > 0) {
      console.log('Latest History Entry:', history[0])
      if (history[0].business_unit_id) {
          // Check if ID matches name (need to fetch unit name)
          console.log('History has business_unit_id:', history[0].business_unit_id)
      } else {
          console.log('History entry found but might be missing unit ID if not mapped correctly.')
      }
    } else {
      console.log('No history entry found! Trigger might be missing or failed.')
    }
  }

  // 4. Revert
  console.log('Reverting change...')
  await supabase
    .from('employees')
    .update({ business_unit: emp.business_unit })
    .eq('id', emp.id)

  console.log('Reverted.')
}

checkUpdateAndTrigger()
