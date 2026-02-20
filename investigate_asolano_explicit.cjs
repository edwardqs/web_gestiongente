
require('dotenv').config({ path: './.env' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Supabase URL/Key not found in .env')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// Email del usuario reportado
const USER_EMAIL = 'asolano@pauserdistribuciones.com'

async function main() {
  console.log(`--- INVESTIGACIÓN EXPLICITA PARA: ${USER_EMAIL} ---`)

  // 1. Obtener datos del usuario
  const { data: user, error: userError } = await supabase
    .from('employees')
    .select(`
      id, 
      role, 
      position, 
      sede, 
      business_unit, 
      job_position_id,
      job_positions (
        id,
        name,
        area_id
      )
    `)
    .eq('email', USER_EMAIL)
    .single()

  if (userError) {
    console.error('Error fetching user:', userError)
    return
  }

  console.log('DATOS USUARIO:')
  console.log(JSON.stringify(user, null, 2))

  // Normalización para simular PL/PGSQL
  const v_role = (user.role || '').toUpperCase()
  const v_pos = (user.position || '').toUpperCase()
  const v_area_id = user.job_positions?.area_id
  const v_sede = (user.sede || '').toUpperCase()
  
  console.log(`AREA ID: ${v_area_id}`)
  console.log(`SEDE: ${v_sede}`)

  // 2. Simular Lógica "Explicit"
  let v_filter_mode = 'NONE'
  let v_is_admin = false

  // ADMIN CHECK
  if (v_role === 'ADMIN' || v_role === 'SUPER ADMIN') v_is_admin = true
  // ... (otros checks admin omitidos por brevedad, asolano no es admin)

  console.log(`ES ADMIN: ${v_is_admin}`)

  if (!v_is_admin) {
      if (v_area_id) {
          // PRIORIDAD 1: SUPERVISOR
          const isSupervisor = v_role.includes('SUPERVISOR') || v_role.includes('COORDINADOR') || v_role.includes('ANALISTA') ||
                               v_pos.includes('SUPERVISOR') || v_pos.includes('COORDINADOR') || v_pos.includes('ANALISTA')
          
          // PRIORIDAD 2: JEFE
          const isJefe = v_role.includes('JEFE') || v_pos.includes('JEFE') || v_role.includes('GERENTE')

          if (isSupervisor) {
              v_filter_mode = 'AREA_SEDE'
              console.log('DETECTADO: SUPERVISOR (AREA + SEDE)')
          } else if (isJefe) {
              v_filter_mode = 'AREA_GLOBAL'
              console.log('DETECTADO: JEFE (AREA GLOBAL)')
          } else {
              v_filter_mode = 'NONE'
              console.log('DETECTADO: SIN ROL DE LIDERAZGO')
          }
      }
  }

  console.log(`MODO FILTRO: ${v_filter_mode}`)

  // 3. Ejecutar RPC Real y ver debug info
  console.log('\n--- LLAMADA RPC REAL (Simulada via login no es posible en script node simple sin password) ---')
  console.log('Intentando invocar get_dashboard_stats con RPC (puede fallar si RLS bloquea sin sesión auth)...')
  
  // NOTA: No podemos invocar la RPC como el usuario sin su password.
  // Pero podemos simular la consulta que haría la RPC en modo AREA_SEDE
  
  if (v_filter_mode === 'AREA_SEDE') {
      const { count } = await supabase
        .from('employees')
        .select('id, job_positions!inner(area_id)', { count: 'exact', head: true })
        .eq('is_active', true)
        .eq('job_positions.area_id', v_area_id)
        .eq('sede', v_sede)
      
      console.log(`SIMULACION RPC (AREA_SEDE): ${count}`)
  } else if (v_filter_mode === 'AREA_GLOBAL') {
      const { count } = await supabase
        .from('employees')
        .select('id, job_positions!inner(area_id)', { count: 'exact', head: true })
        .eq('is_active', true)
        .eq('job_positions.area_id', v_area_id)
      
      console.log(`SIMULACION RPC (AREA_GLOBAL): ${count}`)
  }

}

main()
