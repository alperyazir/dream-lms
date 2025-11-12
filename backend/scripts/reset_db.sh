#!/bin/bash
# Development Database Reset Utility
# This script drops all tables, runs migrations, and initializes only the admin user
#
# Usage: ./backend/scripts/reset_db.sh
# Note: This should ONLY be used in development environments

set -e  # Exit on error

echo "🗑️  Dropping all database tables..."
# Use Alembic to downgrade to base (removes all tables)
cd backend && alembic downgrade base

echo "📊  Running database migrations..."
# Apply all migrations
alembic upgrade head

echo "👤  Initializing admin user..."
# Initialize database with admin user only
python -c "from app.core.db import init_db, engine; from sqlmodel import Session; init_db(Session(engine))"

echo "✅  Database reset complete! Only admin user exists."
echo "📧  Admin email: Check FIRST_SUPERUSER in .env"
echo "🔑  Admin password: Check FIRST_SUPERUSER_PASSWORD in .env"
