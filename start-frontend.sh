#!/bin/bash

# Start Frontend Dev Server
# This script starts the Vite development server for the Kanban board UI

set -e

# Check if web dependencies are installed
if [ ! -d "web/node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    cd web && npm install && cd ..
fi

echo "🚀 Starting Vite dev server..."
echo "   URL: http://localhost:5173"
echo "   API: http://localhost:3001"
echo ""

cd web && npm run dev
