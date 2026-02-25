
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)

async function checkOrgStructureColumn() {
  console.log('Checking org_structure columns...')
  const { data, error } = await supabase.from('org_structure').select('location_id').limit(1)
  
  if (error) {
    console.log('Error:', error.message)
  } else {
    console.log('Success! location_id exists.')
  }
}

checkOrgStructureColumn()
