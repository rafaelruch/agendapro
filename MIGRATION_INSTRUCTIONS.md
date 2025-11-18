# 🔧 CORREÇÃO URGENTE - Adicionar Colunas Faltantes em Produção

## ❌ Problema Identificado

Os logs de produção mostram erros claros:
```
- column "duration" does not exist (tabela services)
- column "birthdate" does not exist (tabela clients)
```

**Causa:** O código foi atualizado com novas colunas, mas as migrations não foram executadas em produção.

## ✅ Solução: Executar Migration SQL

### Opção 1: Via Painel Master Admin (RECOMENDADO)

1. **Acesse** o painel Master Admin em produção
2. **Vá** para a aba **"Migrations"**
3. **Cole** o seguinte SQL completo:

```sql
-- Adicionar coluna birthdate à tabela clients
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'clients' AND column_name = 'birthdate'
    ) THEN
        ALTER TABLE clients ADD COLUMN birthdate TEXT;
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
    END IF;
END $$;

-- Verificar se funcionou
SELECT 
    table_name,
    column_name,
    data_type
FROM information_schema.columns 
WHERE (table_name = 'clients' AND column_name = 'birthdate')
   OR (table_name = 'services' AND column_name = 'duration')
ORDER BY table_name, column_name;
```

4. **Clique** em "Executar"
5. **Verifique** que a query de verificação retorna 2 linhas:
   - `clients | birthdate | text`
   - `services | duration | integer`

### Opção 2: Via psql Direto (se preferir)

```bash
# Conectar ao banco
psql "postgres://postgres:senha@host:5432/database"

# Executar o SQL acima
```

## 📊 Após a Migration

1. **Recarregue** as páginas de Serviços, Clientes e Agendamentos
2. **Verifique** que os dados aparecem normalmente:
   - 65 serviços ✅
   - 33 clientes ✅  
   - 30 agendamentos ✅

## 🔍 Como Verificar se Funcionou

Execute esta query para confirmar:

```sql
SELECT COUNT(*) FROM services;   -- Deve retornar 65
SELECT COUNT(*) FROM clients;     -- Deve retornar 33
SELECT COUNT(*) FROM appointments; -- Deve retornar 30
```

## ⚠️ IMPORTANTE

Este script é **IDEMPOTENTE** - pode ser executado múltiplas vezes sem causar problemas. Ele verifica se a coluna já existe antes de adicionar.

**Não apaga dados existentes!** Apenas adiciona as colunas faltantes.
