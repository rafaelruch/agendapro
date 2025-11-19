-- =========================================================
-- MIGRAÇÃO: Corrigir duration NULL em agendamentos existentes
-- Data: 19/11/2025
-- Descrição: Recalcula e popula o campo duration para todos
--            os agendamentos que estão com duration=NULL
-- =========================================================

-- IMPORTANTE: Execute este script no Easypanel via painel Master Admin
-- ou diretamente no PostgreSQL

-- Passo 1: Criar função temporária para calcular duration de um agendamento
CREATE OR REPLACE FUNCTION calculate_appointment_duration(appointment_id VARCHAR)
RETURNS INTEGER AS $$
DECLARE
    total_duration INTEGER;
BEGIN
    -- Somar duração de todos os serviços do agendamento
    SELECT COALESCE(SUM(s.duration), 60)
    INTO total_duration
    FROM appointment_services aps
    INNER JOIN services s ON aps.service_id = s.id
    WHERE aps.appointment_id = appointment_id;
    
    -- Se não houver serviços ou soma for 0, retornar 60 (fallback)
    IF total_duration = 0 OR total_duration IS NULL THEN
        total_duration := 60;
    END IF;
    
    RETURN total_duration;
END;
$$ LANGUAGE plpgsql;

-- Passo 2: Atualizar todos os agendamentos com duration NULL
UPDATE appointments
SET duration = calculate_appointment_duration(id)
WHERE duration IS NULL;

-- Passo 3: Verificar quantos agendamentos foram corrigidos
SELECT 
    COUNT(*) as total_agendamentos_corrigidos,
    AVG(duration) as duracao_media_minutos
FROM appointments
WHERE duration IS NOT NULL;

-- Passo 4: Remover função temporária
DROP FUNCTION IF EXISTS calculate_appointment_duration(VARCHAR);

-- =========================================================
-- VERIFICAÇÃO FINAL
-- =========================================================

-- Verificar se ainda há agendamentos com duration NULL
SELECT 
    COUNT(*) as agendamentos_com_duration_null
FROM appointments
WHERE duration IS NULL;

-- Se o resultado for 0, a migração foi bem-sucedida!

-- =========================================================
-- OPCIONAL: Estatísticas de duração por tenant
-- =========================================================
SELECT 
    t.name as tenant_nome,
    COUNT(a.id) as total_agendamentos,
    AVG(a.duration) as duracao_media,
    MIN(a.duration) as duracao_minima,
    MAX(a.duration) as duracao_maxima
FROM appointments a
INNER JOIN tenants t ON a.tenant_id = t.id
GROUP BY t.id, t.name
ORDER BY t.name;
