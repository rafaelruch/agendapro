-- Migration 020: Sistema de Cardápio Público
-- Data: 2024-12-03
-- Descrição: Adiciona suporte para cardápio público com categorias de produtos,
--            imagens de produtos, logo e cor da marca personalizada.

-- =============================================
-- 1. Adicionar campos de cardápio na tabela tenants
-- =============================================

-- Campo para slug único do cardápio (URL pública)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'tenants' AND column_name = 'menu_slug') THEN
        ALTER TABLE tenants ADD COLUMN menu_slug TEXT UNIQUE;
    END IF;
END $$;

-- Campo para URL do logo do cardápio
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'tenants' AND column_name = 'menu_logo_url') THEN
        ALTER TABLE tenants ADD COLUMN menu_logo_url TEXT;
    END IF;
END $$;

-- Campo para cor da marca do cardápio
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'tenants' AND column_name = 'menu_brand_color') THEN
        ALTER TABLE tenants ADD COLUMN menu_brand_color TEXT DEFAULT '#ea7c3f';
    END IF;
END $$;

-- =============================================
-- 2. Criar tabela de categorias de produtos
-- =============================================

CREATE TABLE IF NOT EXISTS product_categories (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    tenant_id VARCHAR NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Índice para busca por tenant
CREATE INDEX IF NOT EXISTS idx_product_categories_tenant 
ON product_categories(tenant_id);

-- =============================================
-- 3. Adicionar campos na tabela products
-- =============================================

-- Campo para URL da imagem do produto
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'products' AND column_name = 'image_url') THEN
        ALTER TABLE products ADD COLUMN image_url TEXT;
    END IF;
END $$;

-- Campo para categoria do produto
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'products' AND column_name = 'category_id') THEN
        ALTER TABLE products ADD COLUMN category_id VARCHAR REFERENCES product_categories(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Índice para busca por categoria
CREATE INDEX IF NOT EXISTS idx_products_category 
ON products(category_id);

-- =============================================
-- 4. Verificação final
-- =============================================

-- Listar estrutura das tabelas alteradas
SELECT 
    'tenants' as table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name = 'tenants' 
AND column_name IN ('menu_slug', 'menu_logo_url', 'menu_brand_color')
UNION ALL
SELECT 
    'products' as table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name = 'products' 
AND column_name IN ('image_url', 'category_id')
UNION ALL
SELECT 
    'product_categories' as table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name = 'product_categories'
ORDER BY table_name, column_name;
