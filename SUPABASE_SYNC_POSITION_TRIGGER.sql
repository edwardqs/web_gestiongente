-- ==============================================================================
-- TRIGGER DE SINCRONIZACIÓN: job_position_id -> position
-- Fecha: 27/02/2026
-- Descripción: Mantiene actualizado el campo de texto 'position' cuando cambia el 'job_position_id'
-- ==============================================================================

BEGIN;

-- Función Trigger para sincronizar nombre del cargo
CREATE OR REPLACE FUNCTION public.sync_position_name()
RETURNS TRIGGER AS $$
DECLARE
    v_position_name TEXT;
BEGIN
    -- Si job_position_id ha cambiado y no es nulo
    IF NEW.job_position_id IS DISTINCT FROM OLD.job_position_id AND NEW.job_position_id IS NOT NULL THEN
        
        -- Obtener el nombre del cargo desde la tabla job_positions
        SELECT name INTO v_position_name
        FROM public.job_positions
        WHERE id = NEW.job_position_id;

        -- Si encontramos el cargo, actualizamos el campo de texto 'position'
        IF v_position_name IS NOT NULL THEN
            NEW.position := v_position_name;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear Trigger en tabla employees
DROP TRIGGER IF EXISTS trg_sync_position_name ON public.employees;
CREATE TRIGGER trg_sync_position_name
BEFORE INSERT OR UPDATE ON public.employees
FOR EACH ROW
EXECUTE FUNCTION public.sync_position_name();

COMMIT;
