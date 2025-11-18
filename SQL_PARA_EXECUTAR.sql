-- ========================================
-- SQL DE CORREÇÃO - ADICIONAR TODAS AS COLUNAS FALTANTES
-- ========================================
-- Este SQL adiciona TODAS as colunas que estão no código
-- mas faltam no banco de produção
--
-- INSTRUÇÕES:
-- 1. Acesse o painel Master Admin em produção
-- 2. Vá na aba "Migrations"
-- 3. Role até "Executar SQL Customizado"
-- 4. Cole a DATABASE_URL:
--    postgres://postgres:fd2040ea05b8e182e878@server-geral_agenda-pro-db:5432/server-geral?sslmode=disable
-- 5. Cole este SQL completo no campo de texto
-- 6. Clique em "Executar SQL"
-- ========================================

-- 1. Adicionar coluna birthdate à tabela clients
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'clients' AND column_name = 'birthdate'
    ) THEN
        ALTER TABLE clients ADD COLUMN birthdate TEXT;
        RAISE NOTICE '✓ Coluna birthdate adicionada à tabela clients';
    ELSE
        RAISE NOTICE '✓ Coluna birthdate já existe na tabela clients';
    END IF;
END $$;

-- 2. Adicionar coluna duration à tabela services
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'services' AND column_name = 'duration'
    ) THEN
        ALTER TABLE services ADD COLUMN duration INTEGER NOT NULL DEFAULT 60;
        RAISE NOTICE '✓ Coluna duration adicionada à tabela services';
    ELSE
        RAISE NOTICE '✓ Coluna duration já existe na tabela services';
    END IF;
END $$;

-- 3. Adicionar coluna promotional_value à tabela services
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'services' AND column_name = 'promotional_value'
    ) THEN
        ALTER TABLE services ADD COLUMN promotional_value NUMERIC(10, 2);
        RAISE NOTICE '✓ Coluna promotional_value adicionada à tabela services';
    ELSE
        RAISE NOTICE '✓ Coluna promotional_value já existe na tabela services';
    END IF;
END $$;

-- 4. Adicionar coluna promotion_start_date à tabela services
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'services' AND column_name = 'promotion_start_date'
    ) THEN
        ALTER TABLE services ADD COLUMN promotion_start_date TEXT;
        RAISE NOTICE '✓ Coluna promotion_start_date adicionada à tabela services';
    ELSE
        RAISE NOTICE '✓ Coluna promotion_start_date já existe na tabela services';
    END IF;
END $$;

-- 5. Adicionar coluna promotion_end_date à tabela services
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'services' AND column_name = 'promotion_end_date'
    ) THEN
        ALTER TABLE services ADD COLUMN promotion_end_date TEXT;
        RAISE NOTICE '✓ Coluna promotion_end_date adicionada à tabela services';
    ELSE
        RAISE NOTICE '✓ Coluna promotion_end_date já existe na tabela services';
    END IF;
END $$;

-- 6. Verificar se todas as colunas foram criadas
SELECT 
    'RESULTADO:' as status,
    COUNT(*) as total_colunas_verificadas
FROM information_schema.columns 
WHERE (table_name = 'clients' AND column_name = 'birthdate')
   OR (table_name = 'services' AND column_name IN ('duration', 'promotional_value', 'promotion_start_date', 'promotion_end_date'));

-- 7. Listar todas as colunas criadas
SELECT 
    table_name,
    column_name,
    data_type,
    CASE 
        WHEN is_nullable = 'YES' THEN 'NULL'
        ELSE 'NOT NULL'
    END as nullable,
    column_default
FROM information_schema.columns 
WHERE (table_name = 'clients' AND column_name = 'birthdate')
   OR (table_name = 'services' AND column_name IN ('duration', 'promotional_value', 'promotion_start_date', 'promotion_end_date'))
ORDER BY table_name, column_name;
