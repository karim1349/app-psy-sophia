# Dashboard "Not Found" Error - Debugging Guide

## Problem
Getting `{"detail":"Not found."}` when calling dashboard endpoint.

## Root Cause
Using **guest user ID** instead of **child ID** in the API call.

## Database State (Current)
```
Guest User ID 3 → Child ID 1 ✅ (has data)
Guest User ID 4 → No children ❌
Guest User ID 7 → Does not exist ❌
```

## Correct API Call
```bash
GET /api/children/1/dashboard/?range=7
```

NOT:
```bash
GET /api/children/7/dashboard/?range=7  ❌ (wrong ID)
GET /api/dashboard?guest=7  ❌ (wrong endpoint)
```

## How to Debug in Mobile App

### 1. Check what's stored in AsyncStorage

Add temporary debug code to your home screen:

```typescript
// In app/(authed)/home.tsx
React.useEffect(() => {
  async function debug() {
    const childId = await appStorage.getChildId();
    console.log('🔍 Stored Child ID:', childId);

    if (!childId) {
      console.error('❌ No child ID stored! User needs to complete onboarding.');
    }
  }
  debug();
}, []);
```

### 2. Check the actual API call

In `src/api/client.ts`, add temporary logging:

```typescript
export async function apiFetch<T = any>(
  endpoint: string,
  config: RequestConfig = {}
): Promise<T> {
  // Add this line:
  console.log('📡 API Call:', endpoint);

  // ... rest of function
}
```

### 3. Expected Console Output

When home screen loads, you should see:
```
🔍 Stored Child ID: 1
📡 API Call: /api/children/1/dashboard/?range=7
```

If you see:
```
🔍 Stored Child ID: null
```
→ **Problem:** User hasn't completed onboarding. Child was never created.

If you see:
```
📡 API Call: /api/children/7/dashboard/?range=7
```
→ **Problem:** Wrong child ID stored in AsyncStorage.

## Quick Fix Options

### Option 1: Complete Onboarding Again
1. Clear app data (reinstall or clear storage)
2. Go through onboarding flow completely
3. Verify child ID is stored

### Option 2: Manually Create Child for Current User

If you're on guest user 4 (which has no children):

```bash
cd apps/api
.venv/bin/python manage.py shell
```

```python
from users.models import User
from coaching.models import Child

# Get guest user 4
user = User.objects.get(id=4)

# Create a child for this user
child = Child.objects.create(
    parent=user,
    schooling_stage='6-13',
    diagnosed_adhd='unknown'
)

print(f"Created Child ID: {child.id}")
exit()
```

Then update AsyncStorage in mobile app to use the new child ID.

### Option 3: Use Existing Child

If you want to use the existing Child ID 1 (belongs to guest user 3):

1. **Backend:** Clear tokens and log in as guest user 3, OR
2. **Mobile App:** Clear app data and create new guest session, then complete onboarding

## Test with cURL

To verify the API works:

```bash
# 1. Create a guest session
curl -X POST http://localhost:8000/api/auth/users/guest/ \
  -H "Content-Type: application/json" \
  > /tmp/tokens.json

# Extract access token
ACCESS_TOKEN=$(python3 -c "import json; print(json.load(open('/tmp/tokens.json'))['access'])")

# 2. Create a child
curl -X POST http://localhost:8000/api/children/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{"schooling_stage":"6-13","diagnosed_adhd":"unknown"}' \
  > /tmp/child.json

# Extract child ID
CHILD_ID=$(python3 -c "import json; print(json.load(open('/tmp/child.json'))['id'])")

echo "Child ID: $CHILD_ID"

# 3. Test dashboard (should work now!)
curl -X GET "http://localhost:8000/api/children/$CHILD_ID/dashboard/?range=7" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | python3 -m json.tool
```

Expected output:
```json
{
  "days": [],
  "routine_success": [],
  "mood": []
}
```

## Permanent Fix

The mobile app code is correct. The issue is likely:

1. ✅ **App creates child** during onboarding (age.tsx:44)
2. ✅ **App stores child ID** in AsyncStorage
3. ✅ **App retrieves child ID** on home screen
4. ✅ **App calls dashboard** with correct child ID

**Most likely cause:** You're testing with a guest user that skipped onboarding or the app data was cleared after onboarding.

**Solution:** Always complete the full onboarding flow:
1. Age selection (creates child, stores ID)
2. Screener
3. Priorities
4. Plan
5. Notifications (marks onboarding done)

Only THEN will the home screen work correctly.
