
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import fs from 'fs'

const envPath = path.resolve(process.cwd(), '.env.local')
if (fs.existsSync(envPath)) {
    const envConfig = dotenv.parse(fs.readFileSync(envPath))
    for (const k in envConfig) process.env[k] = envConfig[k]
}

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)

async function runDebug() {
    const email = 'asolano@pauserdistribuciones.com'
    console.log(`Running SQL debug for ${email}...`)
    
    // Call the RPC we just created (assuming the user will run the SQL first)
    // But since I can't force the user to run SQL first, I will output the SQL content for them
    // and ALSO try to run it if I had privileges, but I don't via JS client usually (unless admin key).
    // Wait, I can use the same logic in JS to simulate again with the exact same clauses.
    
    // But better: I will print the SQL needed to fix the issue directly, 
    // because I suspect the issue is simply that SUPERVISOR_OPERACIONES is not in the IN list
    // and the LIKE clause might be failing due to some subtle reason or precedence.
    
    // Let's refine the RPC fix directly.
    // The previous RPC used:
    // v_user_role IN ('SUPERVISOR', 'COORDINADOR', 'ANALISTA')
    // OR v_user_position LIKE '%SUPERVISOR%' ...
    
    // If v_user_role is 'SUPERVISOR_OPERACIONES', it fails the IN check.
    // If v_user_position is 'SUPERVISOR DE OPERACIONES', it matches LIKE '%SUPERVISOR%'.
    
    // Wait! In the previous file I used:
    // v_user_role := UPPER(TRIM(COALESCE(v_user_role, '')));
    // And in the CASE:
    // WHEN (v_user_role IN ('SUPERVISOR', 'COORDINADOR', 'ANALISTA') OR v_user_position LIKE '%SUPERVISOR%' ...)
    
    // If this returned 318, it means it probably matched the JEFE clause?
    // WHEN (v_user_role LIKE '%JEFE%' OR v_user_position LIKE '%JEFE%' OR v_user_role LIKE '%GERENTE%')
    
    // Does 'SUPERVISOR_OPERACIONES' match '%JEFE%'? No.
    // Does 'SUPERVISOR DE OPERACIONES' match '%JEFE%'? No.
    
    // What if v_user_area_id IS NULL?
    // Then it goes to Business Unit.
    // Logic path: v_user_business_unit IS NOT NULL -> TRUE
    // Checks JEFE... Checks SUPERVISOR...
    
    // HYPOTHESIS: The user has a role that I am not seeing correctly or logic is falling through.
    
    // Let's look at the result 318.
    // If Total is 485.
    // 318 is a specific subset.
    
    // Let's try to query what subset gives 318.
    // Maybe all employees in CHIMBOTE?
    const { count: chimboteCount } = await supabase.from('employees').select('*', { count: 'exact', head: true }).eq('sede', 'CHIMBOTE').eq('is_active', true)
    console.log(`Total Chimbote: ${chimboteCount}`)
    
    // Maybe all employees in BEBIDAS?
    const { count: bebidasCount } = await supabase.from('employees').select('*', { count: 'exact', head: true }).eq('business_unit', 'BEBIDAS').eq('is_active', true)
    console.log(`Total Bebidas: ${bebidasCount}`)

    // Maybe all employees in OPL?
    const { count: oplCount } = await supabase.from('employees').select('*', { count: 'exact', head: true }).eq('business_unit', 'OPL').eq('is_active', true)
    console.log(`Total OPL: ${oplCount}`)
    
}

runDebug()
