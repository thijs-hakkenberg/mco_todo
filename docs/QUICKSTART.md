# Quick Start Guide

## Running the Kanban Board

### Prerequisites
1. Node.js 20+ installed
2. Git installed
3. Dependencies installed (run `npm install` in root and `cd web && npm install`)

### Step 1: Set Environment Variables

Create a `.env` file or export these variables:

```bash
export TODO_REPO_PATH="/Users/yourusername/my-todos"
export GIT_USER_NAME="Your Name"
export GIT_USER_EMAIL="your.email@example.com"
```

Or copy and edit the example file:
```bash
cp .env.example .env
# Edit .env with your values
```

### Step 2: Build the MCP Server

```bash
npm run build
```

### Step 3: Start the Backend (Terminal 1)

```bash
./start-backend.sh
```

Or manually:
```bash
export TODO_REPO_PATH="/Users/yourusername/my-todos"
export GIT_USER_NAME="Your Name"
export GIT_USER_EMAIL="your.email@example.com"
node dist/api/server.js
```

### Step 4: Start the Frontend (Terminal 2)

```bash
./start-frontend.sh
```

Or manually:
```bash
cd web
npm run dev
```

### Step 5: Open the Browser

Navigate to: **http://localhost:5173**

## Troubleshooting

### Backend Issues

**"Cannot find module 'dist/index.js'"**
- Run `npm run build` first

**"Port 3001 is already in use"**
- Kill the process: `lsof -ti:3001 | xargs kill -9`

**"mcpConnected: false"**
- Check that `dist/index.js` exists
- Verify `TODO_REPO_PATH` is set correctly
- Check logs for MCP server errors

### Frontend Issues

**"Connection refused" or "Network Error"**
- Make sure the backend is running on port 3001
- Check `curl http://localhost:3001/api/health`

**CSS not loading / styling issues**
- **If using Tailwind v4**: Make sure `web/src/app.css` uses `@import "tailwindcss"` not `@tailwind` directives
- Run `npm install` in the `web` directory
- Restart Vite dev server (Ctrl+C and restart)
- Hard refresh browser (Cmd+Shift+R on Mac, Ctrl+Shift+R on Windows)
- Check browser console for errors

**Blank page**
- Check browser console for JavaScript errors
- Verify API server is responding: `curl http://localhost:3001/api/todos`

### Git Repository Issues

**"Initial sync failed: There is no tracking information"**
- This is just a warning, not an error
- The server will work fine without remote sync
- To fix: Add a remote with `git remote add origin <URL>` in your TODO_REPO_PATH

## Verification

Once both servers are running:

1. Check API health: `curl http://localhost:3001/api/health`
   - Should return: `{"status":"healthy","mcpConnected":true}`

2. Check todos endpoint: `curl http://localhost:3001/api/todos`
   - Should return: `{"success":true,"todos":[],"count":0}`

3. Open browser to http://localhost:5173
   - Should see the Kanban board with 4 columns
   - Should see filter bar at the top
   - Should see statistics

## Next Steps

- Create a todo by clicking the "+" button
- Drag todos between columns
- Use filters to narrow down todos
- All changes are automatically saved to Git!
