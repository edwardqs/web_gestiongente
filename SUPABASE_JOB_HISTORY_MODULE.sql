-- ==============================================================================
-- MÓDULO DE HISTORIAL DE PROMOCIONES (JOB HISTORY)
-- Fecha: 27/02/2026
-- Descripción: Sistema para registrar y auditar cambios de puesto, sede, unidad y área.
-- ==============================================================================

BEGIN;

-- 1. Crear tabla job_history
CREATE TABLE IF NOT EXISTS public.job_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    
    -- Datos Anteriores
    previous_position TEXT,
    previous_sede TEXT,
    previous_business_unit TEXT,
    previous_area TEXT, -- Opcional, si se calcula dinámicamente puede ser redundante pero útil para histórico estático
    
    -- Datos Nuevos
    new_position TEXT,
    new_sede TEXT,
    new_business_unit TEXT,
    new_area TEXT,

    -- Metadatos de Auditoría
    changed_by UUID REFERENCES auth.users(id), -- Usuario que realizó el cambio
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    change_reason TEXT -- Opcional: Promoción, Transferencia, Reestructuración, Corrección
);

-- Índices para búsqueda rápida
CREATE INDEX IF NOT EXISTS idx_job_history_employee_id ON public.job_history(employee_id);
CREATE INDEX IF NOT EXISTS idx_job_history_changed_at ON public.job_history(changed_at DESC);

-- 2. Habilitar RLS
ALTER TABLE public.job_history ENABLE ROW LEVEL SECURITY;

-- 3. Políticas de Seguridad (RLS)

-- LECTURA: 
-- - Admins/RRHH: Ven todo
-- - Jefes: Ven historial de empleados de SU área (requiere lógica recursiva o simplificada)
-- - Supervisores: Ven historial de empleados de SU sede + área
-- - Empleado: Ve su propio historial
CREATE POLICY "Lectura de historial de trabajo" ON public.job_history
FOR SELECT
USING (
    -- 1. Admins y RRHH (Acceso Total)
    (auth.jwt() ->> 'email' = 'admin@pauser.com') OR
    EXISTS (
        SELECT 1 FROM public.employees e
        WHERE e.id = (SELECT id FROM public.employees WHERE email = auth.jwt() ->> 'email')
        AND (
            e.role IN ('ADMIN', 'SUPER ADMIN', 'JEFE_RRHH') OR
            e.position LIKE '%JEFE DE GENTE%' OR
            e.position LIKE '%ANALISTA DE GENTE%' OR
            e.position LIKE '%GERENTE GENERAL%'
        )
    ) OR
    -- 2. El propio empleado
    (employee_id = (SELECT id FROM public.employees WHERE email = auth.jwt() ->> 'email')) OR
    -- 3. Jefes/Supervisores (Delegamos a la lógica de `get_my_employees_v2` o simplificamos)
    -- Simplificación: Si tienes acceso a ver al empleado en la tabla `employees`, tienes acceso a su historial
    -- Esto asume que el frontend ya filtra a qué empleados puedes acceder.
    -- Para RLS estricto, idealmente replicaríamos la lógica de `employees` policy, 
    -- pero por rendimiento y complejidad, a menudo se confía en la visibilidad del padre.
    EXISTS (
        SELECT 1 FROM public.employees e
        WHERE e.id = job_history.employee_id
        -- Aquí podríamos inyectar la lógica de visibilidad, pero por ahora lo dejamos abierto a quien pueda ver el empleado
        -- Ojo: Esto es una simplificación. Si se requiere estricto, usar función RPC.
    )
);

-- ESCRITURA (INSERT):
-- Solo sistema (Trigger) o Admins/RRHH explícitos si se hiciera manual
-- En este diseño, la inserción es AUTOMÁTICA vía Trigger, por lo que el usuario 'postgres' o 'auth' lo hace.
-- Sin embargo, si queremos permitir inserts manuales:
CREATE POLICY "Creación de historial de trabajo" ON public.job_history
FOR INSERT
WITH CHECK (
    -- Solo Admins y RRHH pueden crear registros manualmente (aunque el trigger lo hará automático)
    EXISTS (
        SELECT 1 FROM public.employees e
        WHERE e.email = auth.jwt() ->> 'email'
        AND (
            e.role IN ('ADMIN', 'SUPER ADMIN', 'JEFE_RRHH') OR
            e.position LIKE '%JEFE DE GENTE%' OR
            e.position LIKE '%ANALISTA DE GENTE%'
        )
    )
);

-- 4. Función Trigger para registrar cambios automáticamente
CREATE OR REPLACE FUNCTION public.log_job_changes()
RETURNS TRIGGER AS $$
DECLARE
    v_changed_by UUID;
BEGIN
    -- Detectar cambios en campos clave
    IF (OLD.position IS DISTINCT FROM NEW.position) OR
       (OLD.sede IS DISTINCT FROM NEW.sede) OR
       (OLD.business_unit IS DISTINCT FROM NEW.business_unit) THEN
       
       -- Intentar obtener el ID del usuario que hace el cambio
       v_changed_by := auth.uid();

       INSERT INTO public.job_history (
           employee_id,
           previous_position,
           previous_sede,
           previous_business_unit,
           new_position,
           new_sede,
           new_business_unit,
           changed_by,
           changed_at
       ) VALUES (
           NEW.id,
           OLD.position,
           OLD.sede,
           OLD.business_unit,
           NEW.position,
           NEW.sede,
           NEW.business_unit,
           v_changed_by,
           NOW()
       );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Crear Trigger en tabla employees
DROP TRIGGER IF EXISTS trg_log_job_changes ON public.employees;
CREATE TRIGGER trg_log_job_changes
AFTER UPDATE ON public.employees
FOR EACH ROW
EXECUTE FUNCTION public.log_job_changes();

COMMIT;
