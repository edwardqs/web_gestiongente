// fetch_jefes.js
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import fs from 'fs'

// Cargar variables de entorno
dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Faltan variables de entorno. Asegúrate de tener un archivo .env válido.')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function fetchJefes() {
  console.log('Consultando cargos de JEFATURA...')

  // Definir los filtros
  const filters = [
    'position.ilike.%JEFE DE OPERACIONES%',
    'position.ilike.%FINANZAS%',
    'and(position.ilike.%GENTE Y GESTION%,or(position.ilike.%JEFE%,position.ilike.%GERENTE%))',
    'and(position.ilike.%COMERCIAL%,or(position.ilike.%JEFE%,position.ilike.%GERENTE%))',
    'position.ilike.%GERENTE%'
  ]

  // Como Supabase JS client no soporta ORs complejos anidados fácilmente en una sola llamada .or(),
  // haremos la consulta un poco más manual o traeremos los datos y filtraremos en JS si son pocos,
  // pero intentaremos usar la sintaxis de filtros avanzada.
  
  // Opción segura: Traer todos los empleados activos y filtrar en JS para precisión total
  // dado que la lógica "GENTE Y GESTION AND (JEFE OR GERENTE)" es compleja para URL params simples.
  
  const { data: employees, error } = await supabase
    .from('employees')
    .select('id, full_name, dni, email, position, sede, business_unit, is_active')
    .eq('is_active', true)
  
  if (error) {
    console.error('Error al consultar Supabase:', error)
    return
  }

  // Filtrado en memoria
  const jefes = {
    operaciones: [],
    finanzas: [],
    gente_y_gestion: [],
    comercial: [],
    gerencia: [],
    otros_jefes: [] // Por si acaso
  }

  employees.forEach(emp => {
    const pos = (emp.position || '').toUpperCase()
    
    // 1. JEFE DE OPERACIONES
    if (pos.includes('JEFE DE OPERACIONES')) {
      jefes.operaciones.push(emp)
      return
    }

    // 2. FINANZAS
    if (pos.includes('FINANZAS')) {
      jefes.finanzas.push(emp)
      return
    }

    // 3. GENTE Y GESTION (Jefe o Gerente)
    // NOTA: En BD aparece como "JEFE DE GENTE Y GESTIÓN" (con tilde)
    if (pos.includes('GENTE') && pos.includes('GESTI') && (pos.includes('JEFE') || pos.includes('GERENTE'))) {
      jefes.gente_y_gestion.push(emp)
      return
    }

    // 4. COMERCIAL (Jefe o Gerente)
    if (pos.includes('COMERCIAL') && (pos.includes('JEFE') || pos.includes('GERENTE'))) {
      jefes.comercial.push(emp)
      return
    }

    // 5. GERENTE (General u otros no capturados arriba)
    if (pos.includes('GERENTE')) {
      jefes.gerencia.push(emp)
      return
    }
  })

  // Generar JSON
  const jsonOutput = JSON.stringify(jefes, null, 2)
  
  console.log('--- JSON GENERADO ---')
  console.log(jsonOutput)
  
  // Guardar en archivo
  fs.writeFileSync('jefes_data.json', jsonOutput)
  console.log('--- Archivo guardado: jefes_data.json ---')
}

fetchJefes()
