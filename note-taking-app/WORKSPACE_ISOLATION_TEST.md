# Workspace Isolation Testing Guide

## How to Test Workspace Isolation

### Test 1: Create Two Workspaces
1. Open the app
2. Create workspace "Work"
3. New browser tab opens with `?workspace=ws_xxx`
4. Create a note called "Work Note 1"
5. Go back to original tab
6. Create workspace "Personal"
7. New browser tab opens with `?workspace=ws_yyy`
8. Create a note called "Personal Note 1"

### Test 2: Verify Isolation
1. In "Work" tab: Should only see "Work Note 1"
2. In "Personal" tab: Should only see "Personal Note 1"
3. Notes should NOT appear in both tabs

### Test 3: Refresh Test
1. In "Work" tab: Refresh the page
2. Should still only see "Work Note 1"
3. In "Personal" tab: Refresh the page
4. Should still only see "Personal Note 1"

### Test 4: LocalStorage Check
Open DevTools Console and run:
```javascript
// See all localStorage keys
for (let i = 0; i < localStorage.length; i++) {
  console.log(localStorage.key(i));
}
```

You should see keys like:
- `workspace_ws_xxx_notes` (Work workspace notes)
- `workspace_ws_yyy_notes` (Personal workspace notes)
- `app.workspaces` (shared workspace list)
- `app.currentWorkspace` (shared current workspace)

### Expected Behavior

**Isolated Keys (per workspace):**
- `notes` → `workspace_{id}_notes`
- `folders` → `workspace_{id}_folders`
- `state` → `workspace_{id}_state`
- `autoRecovery` → `workspace_{id}_autoRecovery`

**Shared Keys (across all workspaces):**
- `app.workspaces` (list of all workspaces)
- `app.currentWorkspace` (current workspace ID)
- `selectedTheme` (theme preference)

### Troubleshooting

**Problem:** Notes appear in all workspaces
**Solution:** Check console for "✓ Workspace storage isolated" message

**Problem:** Notes disappear after refresh
**Solution:** Check if workspace ID is in URL (`?workspace=ws_xxx`)

**Problem:** Can't create notes
**Solution:** Check console for storage errors

### Console Messages to Look For

✅ Good messages:
```
🔧 Setting up workspace storage for: ws_xxx
✓ Workspace storage isolated: ws_xxx
💾 SET [notes] to workspace storage
📖 GET [notes] from workspace storage: found
```

❌ Bad messages:
```
Error: localStorage is not defined
Warning: Workspace ID not found in URL
```

## How It Works

1. **URL Parameter**: Each workspace tab has `?workspace={id}` in URL
2. **Storage Wrapper**: Custom localStorage wrapper intercepts all get/set calls
3. **Key Prefixing**: All keys are prefixed with `workspace_{id}_`
4. **Isolation**: Each workspace only sees its own prefixed keys
5. **Shared Data**: Workspace list and theme are NOT prefixed

## Architecture

```
Browser Tab 1: ?workspace=ws_abc123
├── localStorage wrapper active
├── notes → workspace_ws_abc123_notes
├── folders → workspace_ws_abc123_folders
└── Only sees its own data

Browser Tab 2: ?workspace=ws_def456
├── localStorage wrapper active
├── notes → workspace_ws_def456_notes
├── folders → workspace_ws_def456_folders
└── Only sees its own data

Shared Across All Tabs:
├── app.workspaces (list of all workspaces)
├── app.currentWorkspace (current workspace ID)
└── selectedTheme (theme preference)
```
