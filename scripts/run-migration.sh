#!/bin/bash

# Community Deck Sharing Migration Script
# This script will guide you through running the database migration

echo "🚀 Community Deck Sharing & Marketplace - Migration Script"
echo "=========================================================="
echo ""

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "❌ Error: .env file not found"
    echo "Please create a .env file with your Supabase credentials"
    exit 1
fi

# Load environment variables
source .env

if [ -z "$VITE_SUPABASE_URL" ] || [ -z "$VITE_SUPABASE_ANON_KEY" ]; then
    echo "❌ Error: Supabase credentials not found in .env"
    echo "Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY"
    exit 1
fi

echo "✅ Supabase credentials found"
echo "   URL: $VITE_SUPABASE_URL"
echo ""

echo "📋 Migration Steps:"
echo "1. Open Supabase SQL Editor: $VITE_SUPABASE_URL/project/_/sql"
echo "2. Copy the contents of 'supabase-community-sharing.sql'"
echo "3. Paste into SQL Editor and click 'Run'"
echo "4. Verify all tables were created successfully"
echo ""

echo "📁 Migration file location:"
echo "   $(pwd)/supabase-community-sharing.sql"
echo ""

read -p "Press Enter to open the migration file..."

# Try to open the file with default editor
if command -v code &> /dev/null; then
    code supabase-community-sharing.sql
elif command -v nano &> /dev/null; then
    nano supabase-community-sharing.sql
elif command -v vim &> /dev/null; then
    vim supabase-community-sharing.sql
else
    cat supabase-community-sharing.sql
fi

echo ""
echo "✅ Migration file opened"
echo ""
echo "Next steps:"
echo "1. Copy the SQL content"
echo "2. Open Supabase SQL Editor"
echo "3. Paste and run the migration"
echo "4. Run 'npm run test:migration' to verify"
echo ""
