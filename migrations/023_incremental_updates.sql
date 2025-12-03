-- ==================== MIGRAÇÃO INCREMENTAL - AgendaPro ====================
-- Data: 2025-12-03
-- Descrição: Atualizações incrementais para bancos já existentes
-- Use este script se seu banco já possui as tabelas básicas

-- ==================== 1. ADICIONAR CAMPOS DO MENU PÚBLICO ====================
-- Campos na tabela tenants
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS menu_slug TEXT UNIQUE;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS menu_logo_url TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS menu_brand_color TEXT DEFAULT '#ea7c3f';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS menu_banner_url TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS min_order_value NUMERIC(10, 2);

-- ==================== 2. TABELA PRODUCT_CATEGORIES ====================
CREATE TABLE IF NOT EXISTS product_categories (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    display_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ==================== 3. TABELA DELIVERY_NEIGHBORHOODS ====================
CREATE TABLE IF NOT EXISTS delivery_neighborhoods (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    delivery_fee NUMERIC(10, 2) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ==================== 4. CAMPOS DE PRODUTOS ====================
-- Adicionar campos de destaque e promoção
ALTER TABLE products ADD COLUMN IF NOT EXISTS category_id VARCHAR REFERENCES product_categories(id) ON DELETE SET NULL;
ALTER TABLE products ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_on_sale BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS sale_price NUMERIC(10, 2);

-- ==================== 5. TABELA PRODUCT_ADDONS ====================
CREATE TABLE IF NOT EXISTS product_addons (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    product_id VARCHAR NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    price NUMERIC(10, 2) NOT NULL,
    is_required BOOLEAN NOT NULL DEFAULT false,
    max_quantity INTEGER NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ==================== 6. TABELA CLIENT_ADDRESSES ====================
CREATE TABLE IF NOT EXISTS client_addresses (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    client_id VARCHAR NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    label TEXT NOT NULL DEFAULT 'Casa',
    street TEXT,
    number TEXT,
    complement TEXT,
    neighborhood TEXT,
    city TEXT,
    zip_code TEXT,
    reference TEXT,
    is_default BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ==================== 7. CAMPOS DE PEDIDOS ====================
-- Adicionar campos de endereço de entrega e pagamento
ALTER TABLE orders ADD COLUMN IF NOT EXISTS client_address_id VARCHAR REFERENCES client_addresses(id) ON DELETE SET NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method VARCHAR DEFAULT 'cash';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS change_for NUMERIC(10, 2);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_street TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_number TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_complement TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_neighborhood TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_city TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_zip_code TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_reference TEXT;

-- ==================== 8. TABELA TENANT_MODULE_PERMISSIONS ====================
CREATE TABLE IF NOT EXISTS tenant_module_permissions (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    module_id TEXT NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT true,
    UNIQUE(tenant_id, module_id)
);

-- ==================== 9. TABELAS FINANCEIRAS ====================
CREATE TABLE IF NOT EXISTS finance_categories (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    is_default BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS financial_transactions (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    source TEXT NOT NULL,
    source_id VARCHAR,
    category_id VARCHAR REFERENCES finance_categories(id) ON DELETE SET NULL,
    category_name TEXT,
    title TEXT NOT NULL,
    description TEXT,
    amount NUMERIC(10, 2) NOT NULL,
    payment_method TEXT,
    date TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'posted',
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(tenant_id, source, source_id)
);

-- ==================== 10. CAMPOS DE PAGAMENTO EM APPOINTMENTS ====================
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS payment_method TEXT;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS payment_amount NUMERIC(10, 2);
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS payment_discount NUMERIC(10, 2);
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS payment_discount_type TEXT;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS payment_registered_at TIMESTAMP;

-- ==================== 11. ÍNDICES PARA PERFORMANCE ====================
CREATE INDEX IF NOT EXISTS idx_clients_tenant_phone ON clients(tenant_id, phone);
CREATE INDEX IF NOT EXISTS idx_orders_tenant_status ON orders(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_client ON orders(client_id);
CREATE INDEX IF NOT EXISTS idx_appointments_tenant_date ON appointments(tenant_id, date);
CREATE INDEX IF NOT EXISTS idx_products_tenant_category ON products(tenant_id, category_id);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_tenant_date ON financial_transactions(tenant_id, date);

-- ==================== FIM DO SCRIPT ====================
