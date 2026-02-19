
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

async function checkGerentes() {
  console.log('--- Checking GERENTE positions ---')
  
  const { data: positions, error } = await supabase
    .from('employees') // Check actual employees, not just job_positions definitions
    .select('position, role')
    .ilike('position', '%GERENTE%')
    
  if (error) {
    console.error('Error fetching positions:', error)
    return
  }

  // Unique positions
  const uniquePositions = [...new Set(positions.map(p => p.position))]
  console.log(`Found ${uniquePositions.length} unique GERENTE positions used by employees:`)
  uniquePositions.forEach(p => console.log(`- ${p}`))
}

checkGerentes()
