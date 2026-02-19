// analyze_hierarchy.js
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import fs from 'fs'

dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

async function analyzeHierarchy() {
  console.log('Analizando jerarquía y áreas...')

  // 1. Obtener Áreas
  const { data: areas, error: errAreas } = await supabase
    .from('areas')
    .select('*')
  
  if (errAreas) {
      console.error('Error fetching areas:', errAreas)
      // Si falla, tal vez no existe la tabla o está vacía. Continuaremos intentando inferir.
  }

  // 2. Obtener Cargos (Job Positions) con su Área
  const { data: positions, error: errPos } = await supabase
    .from('job_positions')
    .select('id, name, area_id')
  
  if (errPos) console.error('Error fetching positions:', errPos)

  // 3. Obtener los Jefes (reutilizamos lógica anterior)
  const { data: employees, error: errEmp } = await supabase
    .from('employees')
    .select('id, full_name, position, sede, business_unit')
    .eq('is_active', true)
    .or('position.ilike.%JEFE%,position.ilike.%GERENTE%')

  if (errEmp) console.error('Error fetching employees:', errEmp)

  // Mapear Áreas por ID
  const areaMap = {}
  if (areas) {
      areas.forEach(a => areaMap[a.id] = a.name)
  }

  // Mapear Cargos por Área
  const positionsByArea = {}
  if (positions) {
      positions.forEach(p => {
          const areaName = areaMap[p.area_id] || 'SIN_AREA'
          if (!positionsByArea[areaName]) positionsByArea[areaName] = []
          positionsByArea[areaName].push(p.name)
      })
  }

  // Estructura Final
  const hierarchy = {
      jefes_identificados: []
  }

  // Procesar Jefes y asignarles "Cargos a su cargo"
  employees.forEach(jefe => {
      const pos = jefe.position.toUpperCase()
      let assignedArea = null
      let matchedPositions = []

      // Lógica de Asignación (Heurística + Datos Reales)
      
      // A. Si podemos enlazar el cargo del jefe con un área en job_positions
      const jefePositionData = positions?.find(p => p.name === jefe.position)
      if (jefePositionData && jefePositionData.area_id) {
          assignedArea = areaMap[jefePositionData.area_id]
          matchedPositions = positionsByArea[assignedArea] || []
      } 
      // B. Si no, inferimos por nombre
      else {
          if (pos.includes('OPERACIONES')) {
              // Buscar cargos que suenen a operaciones o estén en área de operaciones
              assignedArea = 'OPERACIONES (Inferido)'
              matchedPositions = positions?.filter(p => 
                  p.name.includes('CHOFER') || 
                  p.name.includes('AUXILIAR') || 
                  p.name.includes('OPERACIONES')
              ).map(p => p.name) || []
          } else if (pos.includes('GENTE') || pos.includes('RRHH')) {
              assignedArea = 'GENTE Y GESTION (Inferido)'
              matchedPositions = positions?.filter(p => 
                  p.name.includes('GENTE') || 
                  p.name.includes('RRHH') || 
                  p.name.includes('SOCIAL')
              ).map(p => p.name) || []
          } else if (pos.includes('COMERCIAL') || pos.includes('VENTAS')) {
              assignedArea = 'COMERCIAL (Inferido)'
              matchedPositions = positions?.filter(p => 
                  p.name.includes('VENDEDOR') || 
                  p.name.includes('COMERCIAL') || 
                  p.name.includes('SUPERVISOR DE RUTA')
              ).map(p => p.name) || []
          } else if (pos.includes('FINANZAS') || pos.includes('ADMINISTRACI')) {
              assignedArea = 'ADMINISTRACION Y FINANZAS (Inferido)'
              matchedPositions = positions?.filter(p => 
                  p.name.includes('CONTAD') || 
                  p.name.includes('TESORER') || 
                  p.name.includes('FINANZAS') ||
                  p.name.includes('CAJERO')
              ).map(p => p.name) || []
          } else if (pos.includes('GERENTE GENERAL')) {
              assignedArea = 'GLOBAL'
              matchedPositions = ['TODOS LOS CARGOS']
          }
      }

      hierarchy.jefes_identificados.push({
          jefe: jefe.full_name,
          cargo_jefe: jefe.position,
          area_detectada: assignedArea || 'NO DEFINIDA',
          personal_a_cargo: matchedPositions.filter(p => p !== jefe.position) // Excluirse a sí mismo
      })
  })

  console.log(JSON.stringify(hierarchy, null, 2))
}

analyzeHierarchy()
