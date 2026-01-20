-- Script para agregar la columna started_at a la tabla proposals
-- Ejecuta esto si ya tienes la tabla proposals creada

-- Agregar columna started_at si no existe
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'proposals' 
        AND column_name = 'started_at'
    ) THEN
        ALTER TABLE proposals ADD COLUMN started_at TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;
