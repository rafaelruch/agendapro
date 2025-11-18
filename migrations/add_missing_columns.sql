-- Migration: Adicionar colunas faltantes
-- Data: 2025-11-18
-- Descrição: Adiciona colunas birthdate e duration que existem no código mas não no banco

-- Adicionar coluna birthdate à tabela clients (se não existir)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'clients' AND column_name = 'birthdate'
    ) THEN
        ALTER TABLE clients ADD COLUMN birthdate TEXT;
        RAISE NOTICE 'Coluna birthdate adicionada à tabela clients';
    ELSE
        RAISE NOTICE 'Coluna birthdate já existe na tabela clients';
    END IF;
END $$;

-- Adicionar coluna duration à tabela services (se não existir)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'services' AND column_name = 'duration'
    ) THEN
        ALTER TABLE services ADD COLUMN duration INTEGER NOT NULL DEFAULT 60;
        RAISE NOTICE 'Coluna duration adicionada à tabela services';
    ELSE
        RAISE NOTICE 'Coluna duration já existe na tabela services';
    END IF;
END $$;

-- Verificar se as colunas foram criadas
SELECT 
    'clients' as tabela,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_name = 'clients' AND column_name = 'birthdate'
UNION ALL
SELECT 
    'services' as tabela,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_name = 'services' AND column_name = 'duration';
