#!/bin/bash

# Start Backend API Server
# This script starts the API server that connects the web UI to the MCP server

set -e

# Check if environment variables are set
if [ -z "$TODO_REPO_PATH" ]; then
    echo "⚠️  TODO_REPO_PATH not set, using default: $HOME/my-todos"
    export TODO_REPO_PATH="$HOME/my-todos"
fi

if [ -z "$GIT_USER_NAME" ]; then
    echo "⚠️  GIT_USER_NAME not set, using default: MCP Todo User"
    export GIT_USER_NAME="MCP Todo User"
fi

if [ -z "$GIT_USER_EMAIL" ]; then
    echo "⚠️  GIT_USER_EMAIL not set, using default: mcp-todo@example.com"
    export GIT_USER_EMAIL="mcp-todo@example.com"
fi

# Check if dist/index.js exists
if [ ! -f "dist/index.js" ]; then
    echo "❌ MCP server not built. Running npm run build..."
    npm run build
fi

# Check if dist/api/server.js exists
if [ ! -f "dist/api/server.js" ]; then
    echo "❌ API server not built. Running npm run build..."
    npm run build
fi

echo "🚀 Starting API server..."
echo "   Repository: $TODO_REPO_PATH"
echo "   Git User: $GIT_USER_NAME <$GIT_USER_EMAIL>"
echo "   Port: ${PORT:-3001}"
echo ""

node dist/api/server.js
