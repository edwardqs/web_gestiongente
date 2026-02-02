
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://valzrmcdxvxzgwfzcshz.supabase.co'
const supabaseKey = 'sb_publishable_YCl_ZZzYwOwT63liBv0-tA_PussK-rh'
const supabase = createClient(supabaseUrl, supabaseKey)

async function debugPolicies() {
  console.log('--- Listing Policies ---')
  
  // We can't query pg_policies via API directly unless we expose it via a view or RPC.
  // But we can assume the user executed the previous SQL.
  
  // Let's try to simulate the check locally.
  const email = 'equispe@pauserdistribuciones.com'
  
  // 1. Get Employee ID
  const { data: emp } = await supabase
    .from('employees')
    .select('id')
    .ilike('email', email)
    .single()
    
  console.log('Employee ID:', emp?.id)
  
  // 2. We can't verify the policy itself without being that user.
}

debugPolicies()
