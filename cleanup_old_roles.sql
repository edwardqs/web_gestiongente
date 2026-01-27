-- LIMPIEZA DE ROLES ANTIGUOS
-- Este script elimina todos los roles excepto 'Administrador'
-- Útil para limpiar los roles de prueba antes de importar los cargos reales.

-- 1. Desvincular usuarios de los roles que vamos a borrar
-- (Para evitar errores de llave foránea)
UPDATE public.employees
SET role_id = NULL
WHERE role_id IN (
    SELECT id FROM public.roles 
    WHERE name != 'Administrador'
);

-- 2. Eliminar todos los roles excepto 'Administrador'
DELETE FROM public.roles
WHERE name != 'Administrador';

-- 3. (Opcional) Si borraste accidentalmente 'Administrador', recréalo:
INSERT INTO public.roles (name, web_access, mobile_access)
VALUES ('Administrador', true, true)
ON CONFLICT (name) DO NOTHING;
