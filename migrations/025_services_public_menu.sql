-- ==================== MIGRAÇÃO: Serviços no Cardápio Público ====================
-- Data: 2025-12-03
-- Descrição: Adiciona campos para exibir serviços no cardápio público

-- 1. CAMPO menu_type NA TABELA TENANTS
-- Define se o menu público mostra delivery ou serviços
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS menu_type TEXT DEFAULT 'delivery';

-- 2. NOVOS CAMPOS NA TABELA SERVICES
-- Descrição do serviço
ALTER TABLE services ADD COLUMN IF NOT EXISTS description TEXT;

-- Imagem do serviço para cardápio público
ALTER TABLE services ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Destaque no cardápio
ALTER TABLE services ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT false;

-- Ativo no cardápio público
ALTER TABLE services ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- ==================== FIM DO SCRIPT ====================
