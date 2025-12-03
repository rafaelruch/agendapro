-- Migration 021: Recursos Avançados do Cardápio Público
-- Data: 2024-12-03
-- Descrição: Adiciona taxas de entrega por bairro, adicionais de produtos,
--            banner promocional, valor mínimo do pedido e produtos em destaque/promoção.

-- =============================================
-- 1. Adicionar campos extras na tabela tenants
-- =============================================

-- Campo para URL do banner promocional
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'tenants' AND column_name = 'menu_banner_url') THEN
        ALTER TABLE tenants ADD COLUMN menu_banner_url TEXT;
    END IF;
END $$;

-- Campo para valor mínimo do pedido
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'tenants' AND column_name = 'min_order_value') THEN
        ALTER TABLE tenants ADD COLUMN min_order_value NUMERIC(10,2);
    END IF;
END $$;

-- =============================================
-- 2. Adicionar campos de destaque/promoção em products
-- =============================================

-- Campo para produto em destaque
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'products' AND column_name = 'is_featured') THEN
        ALTER TABLE products ADD COLUMN is_featured BOOLEAN NOT NULL DEFAULT FALSE;
    END IF;
END $$;

-- Campo para produto em promoção
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'products' AND column_name = 'is_on_sale') THEN
        ALTER TABLE products ADD COLUMN is_on_sale BOOLEAN NOT NULL DEFAULT FALSE;
    END IF;
END $$;

-- Campo para preço promocional
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'products' AND column_name = 'sale_price') THEN
        ALTER TABLE products ADD COLUMN sale_price NUMERIC(10,2);
    END IF;
END $$;

-- =============================================
-- 3. Criar tabela de bairros de entrega
-- =============================================

CREATE TABLE IF NOT EXISTS delivery_neighborhoods (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    tenant_id VARCHAR NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    delivery_fee NUMERIC(10,2) NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Índice para busca por tenant
CREATE INDEX IF NOT EXISTS idx_delivery_neighborhoods_tenant 
ON delivery_neighborhoods(tenant_id);

-- Índice para bairros ativos
CREATE INDEX IF NOT EXISTS idx_delivery_neighborhoods_active 
ON delivery_neighborhoods(tenant_id, is_active);

-- =============================================
-- 4. Criar tabela de adicionais de produtos
-- =============================================

CREATE TABLE IF NOT EXISTS product_addons (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    tenant_id VARCHAR NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    product_id VARCHAR NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    price NUMERIC(10,2) NOT NULL DEFAULT 0,
    is_required BOOLEAN NOT NULL DEFAULT FALSE,
    max_quantity INTEGER NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Índice para busca por produto
CREATE INDEX IF NOT EXISTS idx_product_addons_product 
ON product_addons(product_id);

-- Índice para busca por tenant
CREATE INDEX IF NOT EXISTS idx_product_addons_tenant 
ON product_addons(tenant_id);

-- =============================================
-- 5. Verificação final
-- =============================================

-- Listar estrutura das tabelas alteradas
SELECT 
    'tenants' as table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name = 'tenants' 
AND column_name IN ('menu_banner_url', 'min_order_value')
UNION ALL
SELECT 
    'products' as table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name = 'products' 
AND column_name IN ('is_featured', 'is_on_sale', 'sale_price')
UNION ALL
SELECT 
    'delivery_neighborhoods' as table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name = 'delivery_neighborhoods'
UNION ALL
SELECT 
    'product_addons' as table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name = 'product_addons'
ORDER BY table_name, column_name;
