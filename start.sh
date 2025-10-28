#!/bin/sh

# Script de startup para produção
# Roda migrations automaticamente antes de iniciar a aplicação

echo "🚀 AgendaPro - Starting..."

# Rodar migrations do banco de dados
echo "📊 Running database migrations..."
npm run db:push

# Iniciar aplicação
echo "✅ Starting application..."
node dist/index.js
