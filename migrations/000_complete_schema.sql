-- ==================== MIGRAÇÃO COMPLETA - AgendaPro ====================
-- Data: 2025-12-03
-- Descrição: Script completo para criação de todas as tabelas do sistema
-- ATENÇÃO: Execute este script apenas em um banco de dados LIMPO

-- ==================== 1. TABELA TENANTS ====================
CREATE TABLE IF NOT EXISTS tenants (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    active BOOLEAN NOT NULL DEFAULT true,
    menu_slug TEXT UNIQUE,
    menu_logo_url TEXT,
    menu_brand_color TEXT DEFAULT '#ea7c3f',
    menu_banner_url TEXT,
    min_order_value NUMERIC(10, 2),
    created_at TIMESTAMP DEFAULT NOW()
);

-- ==================== 2. TABELA USERS ====================
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR REFERENCES tenants(id) ON DELETE CASCADE,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ==================== 3. TABELA CLIENTS ====================
CREATE TABLE IF NOT EXISTS clients (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    birthdate TEXT,
    UNIQUE(tenant_id, phone)
);

-- ==================== 4. TABELA CLIENT_ADDRESSES ====================
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

-- ==================== 5. TABELA SERVICES ====================
CREATE TABLE IF NOT EXISTS services (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    value NUMERIC(10, 2) NOT NULL,
    duration INTEGER NOT NULL DEFAULT 60,
    promotional_value NUMERIC(10, 2),
    promotion_start_date TEXT,
    promotion_end_date TEXT
);

-- ==================== 6. TABELA PROFESSIONALS ====================
CREATE TABLE IF NOT EXISTS professionals (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ==================== 7. TABELA PROFESSIONAL_SERVICES ====================
CREATE TABLE IF NOT EXISTS professional_services (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    professional_id VARCHAR NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
    service_id VARCHAR NOT NULL REFERENCES services(id) ON DELETE CASCADE
);

-- ==================== 8. TABELA PROFESSIONAL_SCHEDULES ====================
CREATE TABLE IF NOT EXISTS professional_schedules (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    professional_id VARCHAR NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL
);

-- ==================== 9. TABELA APPOINTMENTS ====================
CREATE TABLE IF NOT EXISTS appointments (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    client_id VARCHAR NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    professional_id VARCHAR,
    date TEXT NOT NULL,
    time TEXT NOT NULL,
    duration INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'scheduled',
    notes TEXT,
    payment_method TEXT,
    payment_amount NUMERIC(10, 2),
    payment_discount NUMERIC(10, 2),
    payment_discount_type TEXT,
    payment_registered_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ==================== 10. TABELA APPOINTMENT_SERVICES ====================
CREATE TABLE IF NOT EXISTS appointment_services (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id VARCHAR NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
    service_id VARCHAR NOT NULL REFERENCES services(id) ON DELETE CASCADE
);

-- ==================== 11. TABELA BUSINESS_HOURS ====================
CREATE TABLE IF NOT EXISTS business_hours (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ==================== 12. TABELA TENANT_API_TOKENS ====================
CREATE TABLE IF NOT EXISTS tenant_api_tokens (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    label TEXT NOT NULL,
    created_by VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    last_used_at TIMESTAMP,
    revoked_at TIMESTAMP
);

-- ==================== 13. TABELA TENANT_MODULE_PERMISSIONS ====================
CREATE TABLE IF NOT EXISTS tenant_module_permissions (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    module_id TEXT NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT true,
    UNIQUE(tenant_id, module_id)
);

-- ==================== 14. TABELA PRODUCT_CATEGORIES (ANTES DE PRODUCTS!) ====================
CREATE TABLE IF NOT EXISTS product_categories (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    display_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ==================== 15. TABELA DELIVERY_NEIGHBORHOODS ====================
CREATE TABLE IF NOT EXISTS delivery_neighborhoods (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    delivery_fee NUMERIC(10, 2) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ==================== 16. TABELA PRODUCTS (DEPOIS DE PRODUCT_CATEGORIES!) ====================
CREATE TABLE IF NOT EXISTS products (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    category_id VARCHAR REFERENCES product_categories(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    price NUMERIC(10, 2) NOT NULL,
    manage_stock BOOLEAN NOT NULL DEFAULT false,
    quantity INTEGER,
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_featured BOOLEAN NOT NULL DEFAULT false,
    is_on_sale BOOLEAN NOT NULL DEFAULT false,
    sale_price NUMERIC(10, 2),
    created_at TIMESTAMP DEFAULT NOW()
);

-- ==================== 17. TABELA PRODUCT_ADDONS ====================
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

-- ==================== 18. TABELA ORDERS ====================
CREATE TABLE IF NOT EXISTS orders (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    client_id VARCHAR NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    client_address_id VARCHAR REFERENCES client_addresses(id) ON DELETE SET NULL,
    order_number INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    total NUMERIC(10, 2) NOT NULL,
    notes TEXT,
    payment_method TEXT NOT NULL DEFAULT 'cash',
    change_for NUMERIC(10, 2),
    delivery_street TEXT,
    delivery_number TEXT,
    delivery_complement TEXT,
    delivery_neighborhood TEXT,
    delivery_city TEXT,
    delivery_zip_code TEXT,
    delivery_reference TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ==================== 19. TABELA ORDER_ITEMS ====================
CREATE TABLE IF NOT EXISTS order_items (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id VARCHAR NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id VARCHAR NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL,
    unit_price NUMERIC(10, 2) NOT NULL
);

-- ==================== 20. TABELA FINANCE_CATEGORIES ====================
CREATE TABLE IF NOT EXISTS finance_categories (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    is_default BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ==================== 21. TABELA FINANCIAL_TRANSACTIONS ====================
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

-- ==================== ÍNDICES PARA PERFORMANCE ====================
CREATE INDEX IF NOT EXISTS idx_clients_tenant_phone ON clients(tenant_id, phone);
CREATE INDEX IF NOT EXISTS idx_orders_tenant_status ON orders(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_client ON orders(client_id);
CREATE INDEX IF NOT EXISTS idx_appointments_tenant_date ON appointments(tenant_id, date);
CREATE INDEX IF NOT EXISTS idx_products_tenant_category ON products(tenant_id, category_id);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_tenant_date ON financial_transactions(tenant_id, date);

-- ==================== FIM DO SCRIPT ====================
