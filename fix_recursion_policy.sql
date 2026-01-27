-- 1. Eliminar políticas problemáticas (Recursión Infinita)
drop policy if exists "Solo administradores pueden editar roles" on public.roles;
drop policy if exists "Roles visibles para todos los autenticados" on public.roles;

-- 2. Crear políticas simplificadas y seguras
-- Permitir lectura pública a roles (necesario para login y UI básica)
create policy "Roles lectura publica"
  on public.roles for select
  to authenticated
  using (true);

-- Permitir edición solo si el usuario tiene un rol con nombre 'Administrador'
-- IMPORTANTE: Para evitar recursión infinita, NO consultamos la tabla roles dentro de la política de roles de manera directa cruzada.
-- Usamos una subconsulta simple directa a employees, asumiendo que el ID del rol de administrador es conocido o fijo,
-- O mejor aún, rompemos la recursión permitiendo que la tabla employees se lea sin chequear roles.

-- Opción A: Simplificar seguridad por ahora (confiar en la UI + validación backend ligera)
-- Permitir update/insert/delete a usuarios autenticados (temporalmente para desarrollo)
-- create policy "Roles edición autenticados" on public.roles for all to authenticated using (true);

-- Opción B: Política correcta evitando recursión
-- La recursión ocurre porque: al chequear permiso en 'roles', consultamos 'employees', que a su vez (quizás por otra política) consulta 'roles'.
-- Solución: Usar una función de seguridad definer o simplificar la consulta.

create policy "Roles edición admin"
  on public.roles for all
  to authenticated
  using (
    -- Verificamos si el usuario actual tiene el rol 'Administrador' mirando su ID de rol en employees
    -- Y comparando ese ID con el ID del rol 'Administrador' en esta misma tabla.
    exists (
      select 1 from public.employees e
      where e.id = auth.uid() 
      and e.role_id in (select id from public.roles where name = 'Administrador')
    )
  );

-- NOTA IMPORTANTE: Si 'employees' tiene RLS que depende de 'roles', seguirá habiendo recursión.
-- Asegúrate de que la política de lectura de 'employees' sea simple, ej:
-- create policy "Employees lectura propia y admin" on public.employees for select using (auth.uid() = id or ...);
