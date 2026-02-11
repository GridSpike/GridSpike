#!/bin/bash
# Railway Migration Script
# This script runs database migrations on Railway

set -e

echo "🔄 Running Prisma migrations..."
cd apps/server
npx prisma migrate deploy

echo "✅ Migrations completed successfully!"
