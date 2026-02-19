-- ==============================================================================
-- GENERADOR DE JSON PARA JEFATURAS ESPECÍFICAS
-- ==============================================================================
-- Este script consulta la base de datos y genera un objeto JSON con los empleados
-- que coinciden con los criterios solicitados:
-- 1. JEFE DE OPERACIONES
-- 2. FINANZAS (Cualquier cargo que contenga FINANZAS)
-- 3. GENTE Y GESTION (Jefes o Encargados de esta área)
-- 4. COMERCIAL (Jefes o Gerentes Comerciales)
-- 5. GERENTE (Cualquier cargo que contenga GERENTE)

WITH target_employees AS (
    SELECT 
        e.id,
        e.full_name,
        e.dni,
        e.email,
        e.position,
        e.sede,
        e.business_unit,
        CASE 
            WHEN e.position ILIKE '%JEFE DE OPERACIONES%' THEN 'OPERACIONES'
            WHEN e.position ILIKE '%FINANZAS%' THEN 'FINANZAS'
            WHEN e.position ILIKE '%GENTE Y GESTION%' AND (e.position ILIKE '%JEFE%' OR e.position ILIKE '%GERENTE%') THEN 'GENTE_Y_GESTION'
            WHEN e.position ILIKE '%COMERCIAL%' AND (e.position ILIKE '%JEFE%' OR e.position ILIKE '%GERENTE%') THEN 'COMERCIAL'
            WHEN e.position ILIKE '%GERENTE%' THEN 'GERENCIA_GENERAL'
            ELSE 'OTRO'
        END as category
    FROM public.employees e
    WHERE 
        e.is_active = true AND (
            e.position ILIKE '%JEFE DE OPERACIONES%'
            OR e.position ILIKE '%FINANZAS%'
            OR (e.position ILIKE '%GENTE Y GESTION%' AND (e.position ILIKE '%JEFE%' OR e.position ILIKE '%GERENTE%'))
            OR (e.position ILIKE '%COMERCIAL%' AND (e.position ILIKE '%JEFE%' OR e.position ILIKE '%GERENTE%'))
            OR e.position ILIKE '%GERENTE%'
        )
)
SELECT json_build_object(
    'generated_at', NOW(),
    'jefes_operaciones', (SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM target_employees t WHERE category = 'OPERACIONES'),
    'finanzas', (SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM target_employees t WHERE category = 'FINANZAS'),
    'gente_y_gestion', (SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM target_employees t WHERE category = 'GENTE_Y_GESTION'),
    'comercial', (SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM target_employees t WHERE category = 'COMERCIAL'),
    'gerencia', (SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM target_employees t WHERE category = 'GERENCIA_GENERAL')
);
