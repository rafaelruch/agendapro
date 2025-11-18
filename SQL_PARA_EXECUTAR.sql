-- ========================================
-- SQL DE CORREÇÃO - ADICIONAR COLUNAS FALTANTES
-- ========================================
-- Este SQL adiciona as colunas birthdate e duration
-- que estão no código mas faltam no banco de produção
--
-- INSTRUÇÕES:
-- 1. Acesse o painel Master Admin
-- 2. Vá na aba "Migrations"
-- 3. Role até "Executar SQL Customizado"
-- 4. Cole a DATABASE_URL:
--    postgres://postgres:fd2040ea05b8e182e878@server-geral_agenda-pro-db:5432/server-geral?sslmode=disable
-- 5. Cole este SQL completo no campo de texto
-- 6. Clique em "Executar SQL"
-- ========================================

-- Adicionar coluna birthdate à tabela clients
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

-- Adicionar coluna duration à tabela services
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
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE (table_name = 'clients' AND column_name = 'birthdate')
   OR (table_name = 'services' AND column_name = 'duration')
ORDER BY table_name, column_name;
