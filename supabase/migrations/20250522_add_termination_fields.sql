-- Script para agregar columnas de baja a la tabla employees
-- Ejecuta este script en el Editor SQL de Supabase

ALTER TABLE public.employees 
ADD COLUMN IF NOT EXISTS termination_date DATE,
ADD COLUMN IF NOT EXISTS termination_reason TEXT,
ADD COLUMN IF NOT EXISTS termination_document_url TEXT;

-- Opcional: Crear índice para búsquedas rápidas por fecha de baja
CREATE INDEX IF NOT EXISTS idx_employees_termination_date ON public.employees(termination_date);
