-- ==============================================================================
-- TRIGGER PARA HISTORIAL AUTOMÁTICO DE ASIGNACIONES
-- ==============================================================================
-- Este script crea un trigger en la tabla 'employees' que detecta cambios
-- en 'sede' o 'business_unit' y actualiza automáticamente la tabla
-- 'employee_assignments_history'.

-- 1. Asegurar que la tabla de historial existe
CREATE TABLE IF NOT EXISTS public.employee_assignments_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE,
    sede_id UUID REFERENCES public.sedes(id),
    business_unit_id UUID REFERENCES public.business_units(id),
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    end_date DATE, -- NULL indica que es la asignación actual
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Función que maneja la lógica del cambio
CREATE OR REPLACE FUNCTION public.handle_employee_assignment_change()
RETURNS TRIGGER AS $$
DECLARE
    v_sede_id UUID;
    v_unit_id UUID;
BEGIN
    -- Detectar si hubo cambios en Sede o Unidad
    -- (Funciona tanto para UPDATE como para INSERT)
    IF (TG_OP = 'INSERT') OR 
       (OLD.sede IS DISTINCT FROM NEW.sede) OR 
       (OLD.business_unit IS DISTINCT FROM NEW.business_unit) THEN
        
        -- A. Cerrar la asignación anterior (solo en UPDATE)
        -- Busca la asignación activa actual para este empleado y ponle fecha fin de hoy
        IF TG_OP = 'UPDATE' THEN
            UPDATE public.employee_assignments_history
            SET end_date = CURRENT_DATE
            WHERE employee_id = NEW.id 
              AND end_date IS NULL;
        END IF;
        
        -- B. Buscar los IDs correspondientes a los nombres de texto
        -- Intentamos hacer match por nombre exacto en las tablas maestras
        SELECT id INTO v_sede_id FROM public.sedes WHERE name = NEW.sede LIMIT 1;
        SELECT id INTO v_unit_id FROM public.business_units WHERE name = NEW.business_unit LIMIT 1;
        
        -- C. Insertar la nueva asignación vigente
        INSERT INTO public.employee_assignments_history (
            employee_id,
            sede_id,
            business_unit_id,
            start_date,
            reason
        ) VALUES (
            NEW.id,
            v_sede_id,
            v_unit_id,
            CURRENT_DATE,
            CASE 
                WHEN TG_OP = 'INSERT' THEN 'Asignación inicial (Nuevo ingreso)'
                ELSE 'Cambio detectado en ficha de empleado'
            END
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Crear (o recrear) el Trigger
DROP TRIGGER IF EXISTS trigger_employee_assignment_change ON public.employees;

CREATE TRIGGER trigger_employee_assignment_change
AFTER INSERT OR UPDATE ON public.employees
FOR EACH ROW
EXECUTE FUNCTION public.handle_employee_assignment_change();
