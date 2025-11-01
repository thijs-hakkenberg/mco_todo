# Testing Guide - Edit Functionality & UI Improvements

## Starting the Servers

### Terminal 1: Start API Server
```bash
cd /Users/thijshakkenberg/our_todo
npm run dev:api
```

### Terminal 2: Start Web Dev Server
```bash
cd /Users/thijshakkenberg/our_todo/web
npm run dev
```

The web UI will be available at: **http://localhost:5173**

## What's New - Features to Test

### 1. ✅ Add Button at Top of Lane
- **Location**: Now at the top of each column (right below the header)
- **Test**: Click "Add Todo" button in any column
- **Expected**: Modal opens with the status pre-selected for that column

### 2. ✅ Double-Click to View Details
- **Previous**: Single-click opened detail modal (conflicted with drag)
- **New**: Double-click to view details
- **Test**:
  - Single-click and drag a card → should drag smoothly
  - Double-click a card → detail modal opens
  - Hover over card → tooltip shows "Double-click to view details"

### 3. ✅ Edit Functionality (NEW!)
- **Test Flow**:
  1. Double-click any todo card to view details
  2. Click the blue "Edit" button in the detail modal
  3. Edit modal opens with all fields pre-populated
  4. Modify any fields:
     - Title (required)
     - Description
     - Status (dropdown)
     - Priority (dropdown)
     - Project (required)
     - Tags (comma-separated)
     - Assignee
  5. Click "Save Changes" → card updates in real-time
  6. Or click "Cancel" → changes discarded

### 4. ✅ Drag and Drop Still Works
- **Test**: Drag any card to a different column
- **Expected**: Status updates, card moves smoothly
- **Note**: No longer conflicts with clicking!

## Quick Test Scenario

1. **Create a new todo**:
   - Click "+ Add Todo" at top of "To Do" column
   - Fill in: Title="Test Edit Feature", Project="testing"
   - Click "Add Todo"

2. **Edit the todo**:
   - Double-click the new card
   - Click "Edit" button
   - Change priority to "High"
   - Add description: "Testing the new edit modal"
   - Add tags: "test, ui"
   - Click "Save Changes"

3. **Move it**:
   - Drag the card to "In Progress" column
   - Verify it moves and status updates

4. **Edit again**:
   - Double-click the card
   - Click "Edit"
   - Change status to "Done"
   - Click "Save Changes"
   - Card should move to "Done" column

## Known Improvements

- ✅ Reactivity warnings fixed (using `$state()`)
- ✅ Add button more accessible (top of lane)
- ✅ No drag/click conflict (double-click)
- ✅ Full CRUD operations working
- ✅ Optimistic updates with error rollback
- ✅ Double-submission prevention (with loading states)
- ✅ Form buttons show "Adding..." / "Saving..." during submission

## Troubleshooting

**If you don't see the changes:**
1. Hard refresh the browser (Cmd+Shift+R on Mac, Ctrl+Shift+R on Windows)
2. Check both servers are running
3. Check browser console for errors

**If API calls fail:**
- Verify API server is running on port 3001
- Check environment variables are set (TODO_REPO_PATH, GIT_USER_NAME, GIT_USER_EMAIL)

**If drag-and-drop doesn't work:**
- Make sure you're doing a single click + drag (not double-clicking)
- Try in Chrome/Firefox (better HTML5 drag support)
