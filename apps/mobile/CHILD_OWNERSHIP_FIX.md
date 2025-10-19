# Child Ownership Verification Fix

## Problem

After tokens expire and a new guest session is created, the app crashes with a 404 error:

```
Child ID from storage: 1
❌ API Error 404: http://192.168.11.102:8000/api/children/1/dashboard/?range=7
```

### Why This Happens

1. **Guest User 3** completes onboarding → Creates **Child ID 1**
2. App stores **Child ID 1** in AsyncStorage
3. **Tokens expire** (15 minutes)
4. App auto-creates **new guest session** → **Guest User 4**
5. **Child ID 1** still in storage, but belongs to **Guest User 3**
6. API call to dashboard fails with **404** (permission denied)

### The Root Cause

Django's `ChildViewSet` has object-level permissions:

```python
permission_classes = [IsAuthenticated, IsChildOwner]

def get_queryset(self):
    return Child.objects.filter(parent=self.request.user)
```

When Guest User 4 tries to access Child ID 1:
- Django checks: "Does Child 1 belong to User 4?"
- Answer: NO (it belongs to User 3)
- Returns 404 for security (doesn't reveal child exists)

---

## Solution

Added **child ownership verification** on home screen load:

### Before (Broken):
```typescript
React.useEffect(() => {
  const id = await appStorage.getChildId();
  if (id) {
    setChildId(id);  // ❌ Blindly trusts stored ID
  }
}, []);
```

### After (Fixed):
```typescript
React.useEffect(() => {
  const id = await appStorage.getChildId();
  if (id) {
    // Verify ownership
    const children = await getChildren();  // GET /api/children/
    const childExists = children.results.some(c => c.id === id);

    if (childExists) {
      setChildId(id);  // ✅ Child belongs to current user
    } else {
      // ❌ Child belongs to different user
      await appStorage.clearAppData();
      Alert.alert('Session expirée', 'Veuillez recommencer...');
      router.replace('/onboarding/age');
    }
  }
}, []);
```

---

## Console Output Examples

### ✅ Success (Child Belongs to Current User):
```
=== DASHBOARD DEBUG ===
Child ID from storage: 1
🔍 Verifying child ownership...
📡 API GET http://192.168.11.102:8000/api/children/
👤 User has 1 children: [1]
✅ Child ID 1 belongs to current user
✅ Will call: /api/children/1/dashboard/?range=7
📡 API GET http://192.168.11.102:8000/api/children/1/dashboard/?range=7
✅ API 200: ...
```

### ❌ Mismatch (Child Belongs to Different User):
```
=== DASHBOARD DEBUG ===
Child ID from storage: 1
🔍 Verifying child ownership...
📡 API GET http://192.168.11.102:8000/api/children/
👤 User has 0 children: []
❌ Child ID 1 does NOT belong to current user
🔄 Clearing stored child ID and restarting onboarding
[Alert shows: "Session expirée. Veuillez recommencer l'inscription."]
[Redirects to /onboarding/age]
```

### ❌ No Children at All:
```
=== DASHBOARD DEBUG ===
Child ID from storage: null
❌ NO CHILD ID! User must complete onboarding first.
[Alert shows: "Configuration requise..."]
[Redirects to /onboarding/age]
```

---

## How It Works

```mermaid
graph TD
    A[Home Screen Load] --> B{Child ID<br/>in storage?}
    B -->|No| C[❌ No child ID<br/>Alert + Redirect]
    B -->|Yes| D[📡 GET /api/children/]
    D --> E{Child ID in<br/>response?}
    E -->|Yes| F[✅ Load Dashboard]
    E -->|No| G[❌ Ownership mismatch<br/>Clear data + Redirect]
    C --> H[/onboarding/age]
    G --> H
    F --> I[Show Home Screen]
```

---

## Why This Happens in Guest Mode

**Guest sessions are ephemeral:**
- Each guest user gets unique JWT tokens
- Tokens expire after 15 minutes
- New guest session = new user ID = no children

**Storage is persistent:**
- AsyncStorage survives app restarts
- Child ID from old guest session remains
- Creates mismatch with new guest user

**The Fix:**
- Verify ownership on every app launch
- Clear orphaned child IDs
- Force fresh onboarding for new guest users

---

## Database State (Example)

```sql
-- Before token expiration
User ID 3 (guest) → Child ID 1 ✅
AsyncStorage: child_id = 1

-- After token expiration + new session
User ID 3 (guest) → Child ID 1 (old session, expired tokens)
User ID 4 (guest) → No children (new session, active tokens)
AsyncStorage: child_id = 1 (orphaned!)

-- Result: 404 when User 4 tries to access Child 1
```

---

## Testing

### Test 1: Normal Flow (No Issues)
1. Complete onboarding
2. Close and reopen app immediately
3. **Expected:** Dashboard loads (tokens still valid)

### Test 2: Token Expiration
1. Complete onboarding
2. Wait 16+ minutes (or manually clear tokens)
3. Reopen app
4. **Expected:**
   - Alert: "Session expirée"
   - Redirects to onboarding
   - New guest user created
   - New child created

### Test 3: Manual Storage Corruption
1. Complete onboarding
2. Manually set wrong child ID in AsyncStorage
3. Reload app
4. **Expected:**
   - Logs: "Child ID X does NOT belong to current user"
   - Clears data, redirects to onboarding

---

## Alternative Solutions Considered

### ❌ Option 1: Persist Guest User Across Sessions
**Problem:** Requires storing guest user ID + tokens permanently
**Issue:** Security risk, violates guest session concept

### ❌ Option 2: Merge Child to New Guest User
**Problem:** Transfer child from old user to new user
**Issue:** Complex migration, data ownership issues

### ✅ Option 3: Fresh Start (Current Solution)
**Benefit:** Clean slate, simple, secure
**Tradeoff:** User loses onboarding data if tokens expire

For a production app with full accounts, this issue doesn't exist because:
- User signs in with email/password
- Same user ID across sessions
- Children remain accessible

---

## Files Modified

- ✅ `app/(authed)/home.tsx` - Added child ownership verification

---

## Summary

The app now:
1. ✅ Verifies child ownership on load
2. ✅ Detects mismatches (orphaned child IDs)
3. ✅ Clears corrupted data automatically
4. ✅ Guides user to restart onboarding
5. ✅ Logs detailed debug info

This ensures **guest users always see their own children** and never get 404 errors from trying to access children they don't own.
