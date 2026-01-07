-- =============================================================================
-- AGENDAPRO - SCRIPT DE MIGRACAO SEGURA PARA PRODUCAO
-- Este script verifica se tabelas/colunas existem antes de criar/alterar
-- Executar no painel Master Admin -> SQL Migration
-- =============================================================================

-- ========== EXTENSOES ==========
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- ========== FUNCAO IMMUTABLE PARA UNACCENT ==========
-- Wrapper IMMUTABLE para permitir uso em índices
CREATE OR REPLACE FUNCTION f_unaccent(text)
  RETURNS text
  LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT
  SET search_path = public, pg_temp
AS $func$
  SELECT unaccent('unaccent', $1)
$func$;

-- ========== TABELA: tenants ==========
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
    menu_type TEXT DEFAULT 'delivery',
    min_order_value NUMERIC(10, 2),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Adicionar colunas que podem nao existir em tenants
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenants' AND column_name = 'menu_slug') THEN
        ALTER TABLE tenants ADD COLUMN menu_slug TEXT UNIQUE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenants' AND column_name = 'menu_logo_url') THEN
        ALTER TABLE tenants ADD COLUMN menu_logo_url TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenants' AND column_name = 'menu_brand_color') THEN
        ALTER TABLE tenants ADD COLUMN menu_brand_color TEXT DEFAULT '#ea7c3f';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenants' AND column_name = 'menu_banner_url') THEN
        ALTER TABLE tenants ADD COLUMN menu_banner_url TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenants' AND column_name = 'menu_type') THEN
        ALTER TABLE tenants ADD COLUMN menu_type TEXT DEFAULT 'delivery';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenants' AND column_name = 'min_order_value') THEN
        ALTER TABLE tenants ADD COLUMN min_order_value NUMERIC(10, 2);
    END IF;
    -- Colunas para integração com Supabase (Analytics IA)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenants' AND column_name = 'supabase_url') THEN
        ALTER TABLE tenants ADD COLUMN supabase_url TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenants' AND column_name = 'supabase_database') THEN
        ALTER TABLE tenants ADD COLUMN supabase_database TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenants' AND column_name = 'supabase_anon_key') THEN
        ALTER TABLE tenants ADD COLUMN supabase_anon_key TEXT;
    END IF;
END $$;

-- ========== TABELA: users ==========
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

-- ========== TABELA: clients ==========
CREATE TABLE IF NOT EXISTS clients (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    birthdate TEXT
);

-- Adicionar constraint unica se nao existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'clients' 
        AND constraint_type = 'UNIQUE' 
        AND constraint_name = 'clients_tenant_id_phone_unique'
    ) THEN
        ALTER TABLE clients ADD CONSTRAINT clients_tenant_id_phone_unique UNIQUE (tenant_id, phone);
    END IF;
EXCEPTION WHEN duplicate_object THEN
    NULL;
END $$;

-- ========== TABELA: client_addresses ==========
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

-- ========== TABELA: services ==========
CREATE TABLE IF NOT EXISTS services (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    category TEXT NOT NULL,
    value NUMERIC(10, 2) NOT NULL,
    duration INTEGER NOT NULL DEFAULT 60,
    promotional_value NUMERIC(10, 2),
    promotion_start_date TEXT,
    promotion_end_date TEXT,
    is_featured BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true
);

-- Adicionar colunas que podem nao existir em services
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'services' AND column_name = 'description') THEN
        ALTER TABLE services ADD COLUMN description TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'services' AND column_name = 'image_url') THEN
        ALTER TABLE services ADD COLUMN image_url TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'services' AND column_name = 'promotional_value') THEN
        ALTER TABLE services ADD COLUMN promotional_value NUMERIC(10, 2);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'services' AND column_name = 'promotion_start_date') THEN
        ALTER TABLE services ADD COLUMN promotion_start_date TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'services' AND column_name = 'promotion_end_date') THEN
        ALTER TABLE services ADD COLUMN promotion_end_date TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'services' AND column_name = 'is_featured') THEN
        ALTER TABLE services ADD COLUMN is_featured BOOLEAN NOT NULL DEFAULT false;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'services' AND column_name = 'is_active') THEN
        ALTER TABLE services ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true;
    END IF;
END $$;

-- ========== TABELA: appointments ==========
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

-- Adicionar colunas de pagamento se nao existirem
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'payment_method') THEN
        ALTER TABLE appointments ADD COLUMN payment_method TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'payment_amount') THEN
        ALTER TABLE appointments ADD COLUMN payment_amount NUMERIC(10, 2);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'payment_discount') THEN
        ALTER TABLE appointments ADD COLUMN payment_discount NUMERIC(10, 2);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'payment_discount_type') THEN
        ALTER TABLE appointments ADD COLUMN payment_discount_type TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'payment_registered_at') THEN
        ALTER TABLE appointments ADD COLUMN payment_registered_at TIMESTAMP;
    END IF;
END $$;

-- ========== TABELA: appointment_services ==========
CREATE TABLE IF NOT EXISTS appointment_services (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id VARCHAR NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
    service_id VARCHAR NOT NULL REFERENCES services(id) ON DELETE CASCADE
);

-- ========== TABELA: tenant_api_tokens ==========
CREATE TABLE IF NOT EXISTS tenant_api_tokens (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    label TEXT NOT NULL,
    created_by VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_by_master BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    last_used_at TIMESTAMP,
    revoked_at TIMESTAMP
);

-- Adicionar coluna created_by_master se nao existir
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenant_api_tokens' AND column_name = 'created_by_master') THEN
        ALTER TABLE tenant_api_tokens ADD COLUMN created_by_master BOOLEAN NOT NULL DEFAULT false;
    END IF;
END $$;

-- ========== TABELA: business_hours ==========
CREATE TABLE IF NOT EXISTS business_hours (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ========== TABELA: professionals ==========
CREATE TABLE IF NOT EXISTS professionals (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ========== TABELA: professional_services ==========
CREATE TABLE IF NOT EXISTS professional_services (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    professional_id VARCHAR NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
    service_id VARCHAR NOT NULL REFERENCES services(id) ON DELETE CASCADE
);

-- ========== TABELA: professional_schedules ==========
CREATE TABLE IF NOT EXISTS professional_schedules (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    professional_id VARCHAR NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL
);

-- ========== TABELA: tenant_module_permissions ==========
CREATE TABLE IF NOT EXISTS tenant_module_permissions (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    module_id TEXT NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT true
);

-- Adicionar constraint unica se nao existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'tenant_module_permissions' 
        AND constraint_type = 'UNIQUE' 
        AND constraint_name = 'tenant_module_permissions_tenant_id_module_id_unique'
    ) THEN
        ALTER TABLE tenant_module_permissions ADD CONSTRAINT tenant_module_permissions_tenant_id_module_id_unique UNIQUE (tenant_id, module_id);
    END IF;
EXCEPTION WHEN duplicate_object THEN
    NULL;
END $$;

-- ========== TABELA: product_categories ==========
CREATE TABLE IF NOT EXISTS product_categories (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    icon TEXT DEFAULT 'Package',
    display_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Adicionar coluna icon em product_categories se nao existir
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'product_categories' AND column_name = 'icon') THEN
        ALTER TABLE product_categories ADD COLUMN icon TEXT DEFAULT 'Package';
    END IF;
END $$;

-- ========== TABELA: delivery_neighborhoods ==========
CREATE TABLE IF NOT EXISTS delivery_neighborhoods (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    delivery_fee NUMERIC(10, 2) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ========== TABELA: products ==========
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

-- Adicionar colunas que podem nao existir em products
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'category_id') THEN
        ALTER TABLE products ADD COLUMN category_id VARCHAR REFERENCES product_categories(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'image_url') THEN
        ALTER TABLE products ADD COLUMN image_url TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'is_featured') THEN
        ALTER TABLE products ADD COLUMN is_featured BOOLEAN NOT NULL DEFAULT false;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'is_on_sale') THEN
        ALTER TABLE products ADD COLUMN is_on_sale BOOLEAN NOT NULL DEFAULT false;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'sale_price') THEN
        ALTER TABLE products ADD COLUMN sale_price NUMERIC(10, 2);
    END IF;
END $$;

-- ========== TABELA: product_addons ==========
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

-- ========== TABELA: orders ==========
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

-- Adicionar colunas que podem nao existir em orders
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'client_address_id') THEN
        ALTER TABLE orders ADD COLUMN client_address_id VARCHAR REFERENCES client_addresses(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'payment_method') THEN
        ALTER TABLE orders ADD COLUMN payment_method TEXT NOT NULL DEFAULT 'cash';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'change_for') THEN
        ALTER TABLE orders ADD COLUMN change_for NUMERIC(10, 2);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'delivery_street') THEN
        ALTER TABLE orders ADD COLUMN delivery_street TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'delivery_number') THEN
        ALTER TABLE orders ADD COLUMN delivery_number TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'delivery_complement') THEN
        ALTER TABLE orders ADD COLUMN delivery_complement TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'delivery_neighborhood') THEN
        ALTER TABLE orders ADD COLUMN delivery_neighborhood TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'delivery_city') THEN
        ALTER TABLE orders ADD COLUMN delivery_city TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'delivery_zip_code') THEN
        ALTER TABLE orders ADD COLUMN delivery_zip_code TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'delivery_reference') THEN
        ALTER TABLE orders ADD COLUMN delivery_reference TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'updated_at') THEN
        ALTER TABLE orders ADD COLUMN updated_at TIMESTAMP DEFAULT NOW();
    END IF;
END $$;

-- ========== TABELA: order_items ==========
CREATE TABLE IF NOT EXISTS order_items (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id VARCHAR NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id VARCHAR NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL,
    unit_price NUMERIC(10, 2) NOT NULL
);

-- ========== TABELA: finance_categories ==========
CREATE TABLE IF NOT EXISTS finance_categories (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    is_default BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ========== TABELA: financial_transactions ==========
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
    created_at TIMESTAMP DEFAULT NOW()
);

-- Adicionar constraint unica se nao existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'financial_transactions' 
        AND constraint_type = 'UNIQUE' 
        AND constraint_name = 'financial_transactions_tenant_id_source_source_id_unique'
    ) THEN
        ALTER TABLE financial_transactions ADD CONSTRAINT financial_transactions_tenant_id_source_source_id_unique UNIQUE (tenant_id, source, source_id);
    END IF;
EXCEPTION WHEN duplicate_object THEN
    NULL;
END $$;

-- ========== TABELA: webhooks ==========
CREATE TABLE IF NOT EXISTS webhooks (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    target_url TEXT NOT NULL,
    secret TEXT,
    modules TEXT[] NOT NULL,
    events TEXT[] NOT NULL,
    active BOOLEAN NOT NULL DEFAULT true,
    headers TEXT,
    retry_count INTEGER NOT NULL DEFAULT 3,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ========== TABELA: webhook_deliveries ==========
CREATE TABLE IF NOT EXISTS webhook_deliveries (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    webhook_id VARCHAR NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
    tenant_id VARCHAR NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    module TEXT NOT NULL,
    event TEXT NOT NULL,
    payload TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    attempt_count INTEGER NOT NULL DEFAULT 0,
    last_attempt_at TIMESTAMP,
    response_status INTEGER,
    response_body TEXT,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ========== INDICES PARA PERFORMANCE ==========
CREATE INDEX IF NOT EXISTS idx_clients_tenant_id ON clients(tenant_id);
CREATE INDEX IF NOT EXISTS idx_clients_phone ON clients(phone);
CREATE INDEX IF NOT EXISTS idx_services_tenant_id ON services(tenant_id);
CREATE INDEX IF NOT EXISTS idx_appointments_tenant_id ON appointments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(date);
CREATE INDEX IF NOT EXISTS idx_appointments_client_id ON appointments(client_id);
CREATE INDEX IF NOT EXISTS idx_orders_tenant_id ON orders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_orders_client_id ON orders(client_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_products_tenant_id ON products(tenant_id);
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_tenant_id ON financial_transactions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_date ON financial_transactions(date);
CREATE INDEX IF NOT EXISTS idx_tenant_module_permissions_tenant_id ON tenant_module_permissions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_tenant_id ON webhooks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_tenant_id ON webhook_deliveries(tenant_id);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_webhook_id ON webhook_deliveries(webhook_id);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_status ON webhook_deliveries(status);

-- ========== INDICE CASE-INSENSITIVE PARA MENU SLUG ==========
-- Necessário para busca de cardápio público funcionar independente de maiúsculas/minúsculas
CREATE INDEX IF NOT EXISTS idx_tenants_menu_slug_lower ON tenants (lower(menu_slug));

-- ========== NORMALIZAÇÃO DE DADOS ==========
-- Converter todos os menu_slug existentes para minúsculas
UPDATE tenants SET menu_slug = lower(menu_slug) WHERE menu_slug IS NOT NULL AND menu_slug != lower(menu_slug);

-- ========== INDICES PARA BUSCA ACCENT-INSENSITIVE ==========
-- Índices funcionais usando f_unaccent (wrapper IMMUTABLE)
CREATE INDEX IF NOT EXISTS idx_clients_name_unaccent ON clients (lower(f_unaccent(name)));
CREATE INDEX IF NOT EXISTS idx_clients_phone_unaccent ON clients (lower(f_unaccent(phone)));
CREATE INDEX IF NOT EXISTS idx_services_name_unaccent ON services (lower(f_unaccent(name)));
CREATE INDEX IF NOT EXISTS idx_services_category_unaccent ON services (lower(f_unaccent(category)));
CREATE INDEX IF NOT EXISTS idx_products_name_unaccent ON products (lower(f_unaccent(name)));
CREATE INDEX IF NOT EXISTS idx_products_description_unaccent ON products (lower(f_unaccent(COALESCE(description, ''))));

-- ========== FIM DA MIGRACAO ==========
-- Script executado com sucesso!
