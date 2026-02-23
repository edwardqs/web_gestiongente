
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
// ESPERA: El usuario dijo "estoy logueado como JEFE DE GENTE Y GESTIÓN". 
// asolano era SUPERVISOR. ¿Es el mismo usuario con nuevo cargo o es otro usuario?
// Asumiré que es otro usuario o el mismo con cargo cambiado.
// Voy a buscar usuarios con ese cargo primero.

async function main() {
  console.log(`--- BUSCANDO USUARIO 'JEFE DE GENTE Y GESTIÓN' ---`)

  const { data: users, error: userError } = await supabase
    .from('employees')
    .select('email, role, position, id')
    .ilike('position', '%JEFE DE GENTE%')
  
  if (userError) {
      console.error('Error buscando usuario:', userError)
      return
  }

  if (users.length === 0) {
      console.log('No se encontró ningún usuario con posición "JEFE DE GENTE..."')
      return
  }

  const targetUser = users[0]
  console.log('Usuario encontrado:', targetUser)

  // Ahora, diagnosticamos las políticas RLS.
  // Como no podemos "impersonar" fácilmente sin la clave de servicio (service_role key),
  // y solo tenemos la anon key, no podemos probar RLS directamente desde aquí como ese usuario.
  // PERO podemos inspeccionar las políticas usando una función RPC si la creamos.
  
  // Lo más práctico es asumir que falta la política y crearla.
  // El síntoma "no veo nada" con un rol nuevo casi siempre es RLS.
}

main()
