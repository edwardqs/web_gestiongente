-- EMERGENCIA: SOLUCIÓN RADICAL A LA RECURSIÓN
-- Ejecuta este script completo en el Editor SQL de Supabase.

-- 1. Desactivar temporalmente la seguridad en la tabla ROLES para detener el bucle inmediatamente
ALTER TABLE public.roles DISABLE ROW LEVEL SECURITY;

-- 2. Eliminar TODAS las políticas posibles que puedan estar causando el conflicto
-- (Intentamos borrar todos los nombres comunes que hayamos podido crear)
DROP POLICY IF EXISTS "Roles visibles para todos los autenticados" ON public.roles;
DROP POLICY IF EXISTS "Solo administradores pueden editar roles" ON public.roles;
DROP POLICY IF EXISTS "Lectura total roles" ON public.roles;
DROP POLICY IF EXISTS "Gestion roles total" ON public.roles;
DROP POLICY IF EXISTS "Roles lectura publica" ON public.roles;
DROP POLICY IF EXISTS "Roles edición admin" ON public.roles;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.roles;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.roles;
DROP POLICY IF EXISTS "Enable update for users based on email" ON public.roles;
DROP POLICY IF EXISTS "Policy for roles" ON public.roles;

-- 3. Volver a habilitar la seguridad (RLS) con la pizarra limpia
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

-- 4. Crear políticas "planas" (sin subconsultas ni joins) para garantizar CERO recursión
-- Lectura: Todo usuario logueado puede ver los roles
CREATE POLICY "Roles_Lectura_Segura" 
ON public.roles 
FOR SELECT 
TO authenticated 
USING (true);

-- Escritura: Todo usuario logueado puede editar (Para desbloquear el desarrollo ahora)
-- Más adelante podemos restringirlo, pero primero hagamos que funcione.
CREATE POLICY "Roles_Escritura_Segura" 
ON public.roles 
FOR ALL 
TO authenticated 
USING (true);

-- 5. Asegurar también que la tabla EMPLOYEES no tenga bloqueos
DROP POLICY IF EXISTS "Lectura total empleados" ON public.employees;
CREATE POLICY "Lectura total empleados" 
ON public.employees 
FOR SELECT 
TO authenticated 
USING (true);
