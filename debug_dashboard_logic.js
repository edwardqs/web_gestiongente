
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import fs from 'fs'

// Cargar variables de entorno
const envPath = path.resolve(process.cwd(), '.env.local')
if (fs.existsSync(envPath)) {
    const envConfig = dotenv.parse(fs.readFileSync(envPath))
    for (const k in envConfig) {
        process.env[k] = envConfig[k]
    }
} else {
    const envPath2 = path.resolve(process.cwd(), '.env')
    if (fs.existsSync(envPath2)) {
        const envConfig = dotenv.parse(fs.readFileSync(envPath2))
        for (const k in envConfig) {
            process.env[k] = envConfig[k]
        }
    }
}

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)

async function debugDashboardLogic() {
    const targetEmail = 'asolano@pauserdistribuciones.com' // Email del supervisor
    console.log(`--- DEBUGGING DASHBOARD STATS LOGIC FOR: ${targetEmail} ---`)

    // 1. Obtener datos del usuario como lo hace el RPC
    const { data: user, error: userError } = await supabase
        .from('employees')
        .select(`
            role, 
            position, 
            sede, 
            business_unit, 
            job_position_id,
            job_positions (
                area_id,
                name
            )
        `)
        .eq('email', targetEmail)
        .single()

    if (userError) {
        console.error("Error fetching user:", userError)
        return
    }

    // Normalización de variables
    const v_user_role = (user.role || '').trim().toUpperCase()
    const v_user_position = (user.position || '').trim().toUpperCase()
    const v_user_sede = (user.sede || '').trim().toUpperCase()
    const v_user_business_unit = (user.business_unit || '').trim().toUpperCase()
    
    // Obtener Area ID (Híbrido)
    let v_user_area_id = null
    if (user.job_position_id && user.job_positions) {
        v_user_area_id = user.job_positions.area_id
    } else {
        // Fallback por nombre si no hay ID
        const { data: jp } = await supabase.from('job_positions').select('area_id').eq('name', user.position).single()
        if (jp) v_user_area_id = jp.area_id
    }

    console.log("CONTEXTO DETECTADO:")
    console.log({
        role: v_user_role,
        position: v_user_position,
        sede: v_user_sede,
        business_unit: v_user_business_unit,
        area_id: v_user_area_id
    })

    // 2. Simular Lógica Admin
    let v_is_admin = false
    if (targetEmail === 'admin@pauser.com') v_is_admin = true
    else if (['ADMIN', 'SUPER ADMIN', 'JEFE_RRHH', 'GERENTE GENERAL', 'SISTEMAS'].includes(v_user_role)) v_is_admin = true
    else if (v_user_position.includes('JEFE DE GENTE') || v_user_position.includes('ANALISTA DE GENTE')) v_is_admin = true
    else if (v_user_position.includes('PART TIME') && v_user_sede === 'ADM. CENTRAL' && v_user_business_unit.includes('ADMINISTRACI')) v_is_admin = true

    console.log(`IS ADMIN: ${v_is_admin}`)

    if (v_is_admin) {
        console.log("Usuario es ADMIN. Debería ver TODO (sujeto a filtros UI).")
        return
    }

    // 3. Simular Lógica de Filtrado (CASE)
    console.log("\n--- SIMULANDO FILTROS ---")
    
    let filterDescription = "NO MATCH"
    let query = supabase.from('employees').select('count', { count: 'exact' }).eq('is_active', true)

    // Aplicar lógica CASE del SQL
    if (v_user_area_id !== null) {
        // CASE AREA
        if (v_user_role.includes('JEFE') || v_user_position.includes('JEFE') || v_user_role.includes('GERENTE')) {
             filterDescription = "AREA ID MATCH (ALL SEDES)"
             // Simulamos el join con job_positions para filtrar por area_id
             // Supabase JS no permite filtrar por columna de tabla relacionada directamente en el top level sin !inner
             // Pero para contar podemos hacer:
             const { count } = await supabase.from('employees').select('job_positions!inner(area_id)', { count: 'exact', head: true }).eq('is_active', true).eq('job_positions.area_id', v_user_area_id)
             console.log(`[${filterDescription}] Count: ${count}`)
        } 
        else if (['SUPERVISOR', 'COORDINADOR', 'ANALISTA'].some(r => v_user_role.includes(r)) || 
                 ['SUPERVISOR', 'COORDINADOR', 'ANALISTA'].some(p => v_user_position.includes(p))) {
             filterDescription = "AREA ID MATCH (SOLO SU SEDE)"
             const { count } = await supabase.from('employees')
                .select('job_positions!inner(area_id)', { count: 'exact', head: true })
                .eq('is_active', true)
                .eq('job_positions.area_id', v_user_area_id)
                .eq('sede', v_user_sede) // Usamos la sede normalizada del usuario
             
             console.log(`[${filterDescription}] Sede: ${v_user_sede}, AreaID: ${v_user_area_id}`)
             console.log(`[${filterDescription}] Count: ${count}`)
        }
        else {
             filterDescription = "AREA ID DETECTED BUT NO ROLE MATCH"
        }
    } else if (v_user_business_unit) {
        // CASE BUSINESS UNIT
        filterDescription = "BUSINESS UNIT FALLBACK"
        // ... (lógica similar)
    }

    console.log(`Lógica aplicada: ${filterDescription}`)

    // 4. Verificar qué está devolviendo realmente la base de datos para "Total Empleados" sin filtros
    const { count: totalGlobal } = await supabase.from('employees').select('*', { count: 'exact', head: true }).eq('is_active', true)
    console.log(`Total Global en DB: ${totalGlobal}`)
}

debugDashboardLogic()
