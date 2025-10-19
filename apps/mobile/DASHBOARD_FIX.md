# Dashboard "Not Found" Error - Frontend Fix

## Changes Made

### 1. Enhanced Debugging in Home Screen (`app/(authed)/home.tsx`)

Added comprehensive debug logging and error handling:

#### Before:
```typescript
React.useEffect(() => {
  appStorage.getChildId().then(setChildId);
}, []);
```

#### After:
```typescript
React.useEffect(() => {
  async function loadChildId() {
    console.log('=== DASHBOARD DEBUG ===');
    const id = await appStorage.getChildId();
    console.log('Child ID from storage:', id);

    if (id) {
      console.log('✅ Will call: /api/children/' + id + '/dashboard/?range=7');
      setChildId(id);
    } else {
      console.error('❌ NO CHILD ID! User must complete onboarding first.');
      Alert.alert(
        'Configuration requise',
        'Veuillez compléter le processus d\'inscription pour accéder au tableau de bord.',
        [{ text: 'OK', onPress: () => router.replace('/(public)/onboarding/age') }]
      );
    }
    setIsLoadingChild(false);
  }
  loadChildId();
}, []);
```

**Benefits:**
- ✅ Shows exactly which child ID is being used
- ✅ Alerts user if no child ID found
- ✅ Auto-redirects to onboarding if setup incomplete

---

### 2. Better Error Handling in Dashboard Query

Added 404 error detection and recovery:

```typescript
const { data: dashboardData, error: dashboardError, isLoading: isDashboardLoading } = useQuery({
  queryKey: ['dashboard', childId],
  queryFn: () => {
    console.log('🔄 Fetching dashboard for child ID:', childId);
    return getDashboard(childId!, 7);
  },
  enabled: !!childId,
  retry: 2,
  onError: (error: any) => {
    console.error('❌ Dashboard API error:', error);
    if (error.status === 404) {
      Alert.alert(
        'Erreur',
        'Enfant introuvable. Veuillez recommencer l\'inscription.',
        [{
          text: 'OK',
          onPress: () => {
            appStorage.clearAppData();
            router.replace('/(public)/onboarding/age');
          }
        }]
      );
    }
  }
});
```

**Benefits:**
- ✅ Detects 404 errors (child not found)
- ✅ Clears corrupted data
- ✅ Guides user back to onboarding

---

### 3. Loading & Error UI States

Added dedicated screens for loading and error states:

#### Loading State:
```typescript
if (isLoadingChild) {
  return (
    <View style={styles.loading}>
      <ActivityIndicator size="large" color="#5B4BCC" />
      <Text style={styles.loadingText}>Chargement...</Text>
    </View>
  );
}
```

#### Error State:
```typescript
if (!childId) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.errorContainer}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorTitle}>Configuration requise</Text>
        <Text style={styles.errorText}>
          Veuillez compléter le processus d'inscription pour continuer.
        </Text>
        <Button
          title="Commencer"
          onPress={() => router.replace('/(public)/onboarding/age')}
          size="large"
        />
      </View>
    </SafeAreaView>
  );
}
```

**Benefits:**
- ✅ Better UX - no blank screen
- ✅ Clear call-to-action
- ✅ Professional error handling

---

### 4. Enhanced API Client Logging (`src/api/client.ts`)

Added detailed request/response logging:

```typescript
// Log API calls in development
console.log(`📡 API ${fetchConfig.method || 'GET'} ${url}`);

// ... after response ...

if (!response.ok) {
  console.error(`❌ API Error ${response.status}: ${url}`);
  console.error('Response:', data);
  // ...
}

console.log(`✅ API ${response.status}: ${url}`);
```

**Benefits:**
- ✅ See exact URLs being called
- ✅ Track request success/failure
- ✅ Debug API issues instantly

---

## Console Output Examples

### ✅ Success Case:
```
=== DASHBOARD DEBUG ===
Child ID from storage: 1
✅ Will call: /api/children/1/dashboard/?range=7
📡 API GET http://192.168.11.102:8000/api/children/1/dashboard/?range=7
🔄 Fetching dashboard for child ID: 1
✅ API 200: http://192.168.11.102:8000/api/children/1/dashboard/?range=7
```

### ❌ Missing Child ID:
```
=== DASHBOARD DEBUG ===
Child ID from storage: null
❌ NO CHILD ID! User must complete onboarding first.
[Shows alert and redirects to onboarding]
```

### ❌ Invalid Child ID (404):
```
=== DASHBOARD DEBUG ===
Child ID from storage: 7
✅ Will call: /api/children/7/dashboard/?range=7
📡 API GET http://192.168.11.102:8000/api/children/7/dashboard/?range=7
🔄 Fetching dashboard for child ID: 7
❌ API Error 404: http://192.168.11.102:8000/api/children/7/dashboard/?range=7
Response: {"detail":"Not found."}
[Shows alert, clears data, redirects to onboarding]
```

---

## How to Debug Your Issue

### Step 1: Check Console Output

When you navigate to the home screen, look for:

```
=== DASHBOARD DEBUG ===
Child ID from storage: ?
```

### Scenario A: `Child ID from storage: null`
**Problem:** User hasn't completed onboarding or data was cleared.

**Solution:**
- User will see an alert automatically
- Click "OK" to restart onboarding
- Complete all 5 steps (Age → Screener → Priorities → Plan → Notifications)

### Scenario B: `Child ID from storage: 7` (or any number)
**Problem:** Child ID exists in storage but may not exist in database.

**Check database:**
```bash
cd apps/api
.venv/bin/python manage.py shell
>>> from coaching.models import Child
>>> Child.objects.all().values_list('id', 'parent_id')
[(1, 3)]  # Only Child ID 1 exists for Guest User 3
```

**If Child ID 7 doesn't exist:**
- API returns 404
- App shows alert and clears data
- User is redirected to onboarding

---

## Testing the Fix

### Test 1: Fresh Install
1. Clear app data (reinstall or clear storage)
2. Open app
3. Expected: Auto-creates guest session, shows onboarding
4. Complete onboarding
5. Expected: Home screen loads with Child ID logged

### Test 2: Corrupted Data
1. Manually set wrong child ID in AsyncStorage
2. Navigate to home screen
3. Expected:
   - Console shows: `Child ID from storage: X`
   - API returns 404
   - Alert appears
   - Data clears, redirects to onboarding

### Test 3: Normal Flow
1. Complete onboarding fully
2. Home screen should load
3. Console should show:
   ```
   Child ID from storage: 1
   📡 API GET /api/children/1/dashboard/?range=7
   ✅ API 200: ...
   ```

---

## Files Modified

1. ✅ `app/(authed)/home.tsx` - Added debug logging, error handling, loading/error UI
2. ✅ `src/api/client.ts` - Added request/response logging

---

## Summary

The frontend now:

1. **Logs** exact child ID and API calls
2. **Detects** missing or invalid child IDs
3. **Alerts** users with clear messages
4. **Redirects** to onboarding when needed
5. **Clears** corrupted data automatically

**Next steps:**
- Run the app
- Check console for debug output
- Report what you see in `=== DASHBOARD DEBUG ===`
- This will pinpoint the exact issue
