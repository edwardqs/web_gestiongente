-- Corrección de Unidad de Negocio: MULTIMARCAS -> MULTIMARCA
-- Fecha: 27/02/2026

BEGIN;

-- 1. Actualizar registros para unificar bajo "MULTIMARCA"
-- Los registros que actualmente tienen "MULTIMARCAS" (con S al final) deben pasar a "MULTIMARCA" (sin S)
UPDATE public.employees
SET business_unit = 'MULTIMARCA'
WHERE sede = 'TRUJILLO' 
  AND business_unit = 'MULTIMARCAS';

COMMIT;
