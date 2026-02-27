import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY son requeridos en .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function migrateTrujilloSnacks() {
  console.log('Iniciando migración de TRUJILLO SNACKS a MULTIMARCAS...');

  // 1. Verificar empleados afectados
  const { data: employees, error: fetchError } = await supabase
    .from('employees')
    .select('id, full_name, sede, business_unit')
    .eq('sede', 'TRUJILLO')
    .eq('business_unit', 'SNACKS');

  if (fetchError) {
    console.error('Error al buscar empleados:', fetchError);
    return;
  }

  console.log(`Se encontraron ${employees.length} empleados en TRUJILLO con unidad SNACKS.`);

  if (employees.length === 0) {
    console.log('No hay empleados para actualizar.');
    return;
  }

  // 2. Actualizar empleados
  const idsToUpdate = employees.map(emp => emp.id);
  
  const { data: updatedData, error: updateError } = await supabase
    .from('employees')
    .update({ business_unit: 'MULTIMARCAS' })
    .in('id', idsToUpdate)
    .select();

  if (updateError) {
    console.error('Error al actualizar empleados:', updateError);
    return;
  }

  console.log(`¡Éxito! Se actualizaron ${updatedData.length} empleados a la unidad MULTIMARCAS.`);
  
  // Mostrar muestra de cambios
  if (updatedData.length > 0) {
    console.log('Muestra de empleados actualizados:');
    updatedData.slice(0, 5).forEach(emp => {
      console.log(`- ${emp.full_name}: ${emp.sede} - ${emp.business_unit}`);
    });
  }
}

migrateTrujilloSnacks();
