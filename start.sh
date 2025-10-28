#!/bin/sh
set -e  # Exit on error

# Script de startup para produção
# Roda migrations automaticamente antes de iniciar a aplicação

echo "🚀 AgendaPro - Starting..."

# Verificar se DATABASE_URL está configurado
if [ -z "$DATABASE_URL" ]; then
  echo "❌ ERROR: DATABASE_URL environment variable is not set!"
  exit 1
fi

echo "✅ DATABASE_URL is configured"

# Rodar migrations do banco de dados
echo "📊 Running database migrations..."
if npm run db:push; then
  echo "✅ Database migrations completed successfully"
else
  echo "❌ ERROR: Database migrations failed!"
  exit 1
fi

# Iniciar aplicação
echo "✅ Starting application..."
exec node dist/index.js
