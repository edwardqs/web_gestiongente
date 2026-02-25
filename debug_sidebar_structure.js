
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing env vars')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkStructure() {
  console.log('--- Checking Org Structure ---')
  const { data: structure, error } = await supabase
    .from('org_structure')
    .select(`
      id,
      is_active,
      sedes ( name ),
      business_units ( name )
    `)
  
  if (error) {
    console.error('Error fetching structure:', error)
    return
  }

  console.log('Total structure records:', structure.length)
  structure.forEach(item => {
    console.log(`- Sede: ${item.sedes?.name}, Unit: ${item.business_units?.name}, Active: ${item.is_active}`)
  })

  console.log('\n--- Checking Business Units Table ---')
  const { data: units } = await supabase.from('business_units').select('*')
  console.log('Units found:', units.map(u => u.name).join(', '))
}

checkStructure()
