
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://valzrmcdxvxzgwfzcshz.supabase.co'
const supabaseKey = 'sb_publishable_YCl_ZZzYwOwT63liBv0-tA_PussK-rh'
const supabase = createClient(supabaseUrl, supabaseKey)

async function debug() {
  console.log('--- Checking Employee Data ---')
  
  // 1. Check by specific email (from screenshot)
  const email = 'equispe@pauserdistribuciones.com'
  const { data: byEmail, error: errEmail } = await supabase
    .from('employees')
    .select('id, email, full_name')
    .ilike('email', email)
  
  console.log(`Searching for email '${email}':`, byEmail)

  // 2. Check by name
  const { data: byName, error: errName } = await supabase
    .from('employees')
    .select('id, email, full_name')
    .ilike('full_name', '%QUISPE SANCHEZ%')
    
  console.log(`Searching for name 'QUISPE SANCHEZ':`, byName)

  console.log('--- Checking Triggers ---')
  // Note: We can't easily check triggers via JS client on information_schema usually, 
  // but we can try an RPC if one exists, or just skip.
  
  // 3. Test the get_my_employee_id function via RPC if possible?
  // We can't easily test it because we are not authenticated as the user.
}

debug()
