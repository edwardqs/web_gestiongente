
-- Add termination_type column to employees table
ALTER TABLE public.employees 
ADD COLUMN IF NOT EXISTS termination_type TEXT;

-- Optional: Add comment or constraint check if needed, but text is flexible for now.
-- We will use values: 'RENUNCIA', 'FIN_CONTRATO', 'DESPIDO'
