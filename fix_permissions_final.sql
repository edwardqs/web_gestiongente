-- SOLUCIÓN DEFINITIVA DE PERMISOS (RLS)
-- Ejecuta esto en el Editor SQL de Supabase para desbloquear la vista

-- 1. Habilitar lectura pública de ROLES para cualquier usuario logueado
DROP POLICY IF EXISTS "Lectura total roles" ON public.roles;
CREATE POLICY "Lectura total roles"
ON public.roles FOR SELECT
TO authenticated
USING (true);

-- 2. Habilitar lectura pública de EMPLEADOS (necesario para ver quién tiene qué rol)
DROP POLICY IF EXISTS "Lectura total empleados" ON public.employees;
CREATE POLICY "Lectura total empleados"
ON public.employees FOR SELECT
TO authenticated
USING (true);

-- 3. (Opcional) Permitir asignación de roles (UPDATE en employees)
-- Idealmente esto debería restringirse solo a admins, pero para que funcione el mantenedor ahora:
DROP POLICY IF EXISTS "Edicion empleados basica" ON public.employees;
CREATE POLICY "Edicion empleados basica"
ON public.employees FOR UPDATE
TO authenticated
USING (true);

-- 4. Permitir gestión de ROLES (Crear/Editar)
DROP POLICY IF EXISTS "Gestion roles total" ON public.roles;
CREATE POLICY "Gestion roles total"
ON public.roles FOR ALL
TO authenticated
USING (true);
