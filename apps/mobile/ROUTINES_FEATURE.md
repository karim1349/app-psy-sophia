# Daily Routines Feature

## What Are the "3 Routines du Jour"?

The **"3 routines du jour"** (3 daily routines) are the **target behaviors** the parent wants to improve with their child. These are selected during onboarding (Step 3: Priorities) and represent specific behaviors like:

- 🪥 Se brosser les dents (Brush teeth)
- 🛏️ Aller au lit à l'heure (Go to bed on time)
- 📚 Faire les devoirs (Do homework)
- 🧹 Ranger ses jouets (Put away toys)

---

## How It Works

### 1. **Daily Tracking**
Each day, the parent uses the **toggle switches** on the home screen to mark whether their child completed each behavior:

```
✅ Toggle ON  = Child completed this behavior today
❌ Toggle OFF = Child didn't complete this behavior yet
```

### 2. **Real-Time Updates**
When you toggle a switch:
1. ✅ Switch state updates immediately (optimistic update)
2. 📡 API call creates/updates today's check-in
3. 📊 Dashboard chart refreshes automatically
4. ✓ "Fait" label appears under completed behaviors
5. 🎉 Success banner shows when all 3 are done

### 3. **Data Tracking**
Every toggle updates the **DailyCheckin** record:

```json
{
  "child": 1,
  "date": "2025-10-19",
  "mood": 3,
  "behaviors": [
    { "behavior_id": 1, "done": true },   // Brush teeth ✅
    { "behavior_id": 2, "done": false },  // Bedtime ❌
    { "behavior_id": 3, "done": true }    // Homework ✅
  ]
}
```

---

## UI Components

### Before Toggle:
```
┌─────────────────────────────────────┐
│ Se brosser les dents         [OFF] │
└─────────────────────────────────────┘
```

### After Toggle:
```
┌─────────────────────────────────────┐
│ Se brosser les dents         [ON]  │
│ ✓ Fait                              │
└─────────────────────────────────────┘
```

### All Done:
```
┌──────────────────────────────────────────┐
│ 🎉 Bravo ! Toutes les routines sont     │
│    réalisées aujourd'hui !               │
└──────────────────────────────────────────┘
```

---

## What Happens When You Toggle?

### Step-by-Step Flow:

1. **User toggles switch** (e.g., "Brush teeth" → ON)

2. **Optimistic update** (immediate UI feedback):
   ```typescript
   setTodayBehaviors({ ...prev, [behaviorId]: true })
   ```
   - Switch turns green
   - "✓ Fait" label appears
   - No loading delay

3. **API call** (background sync):
   ```typescript
   POST /api/children/1/checkins/
   {
     "date": "2025-10-19",
     "mood": 3,
     "behaviors": [
       { "behavior_id": 1, "done": true },  // ← Updated
       { "behavior_id": 2, "done": false },
       { "behavior_id": 3, "done": false }
     ]
   }
   ```

4. **Dashboard refresh**:
   - `routine_success` percentage recalculated
   - 7-day chart updates
   - Today shows: 33% (1 of 3 behaviors done)

5. **Success celebration** (if all 3 done):
   - Green banner appears
   - Shows encouragement message
   - Haptic feedback (optional)

---

## Console Output Example

```javascript
// When toggling a behavior
✅ Updating behavior: 1 done: true
📊 All behaviors state: [
  { behavior_id: 1, done: true },
  { behavior_id: 2, done: false },
  { behavior_id: 3, done: false }
]
📡 API POST http://192.168.11.102:8000/api/children/1/checkins/
✅ Check-in updated successfully
✅ API 200: ...

// When all behaviors are done
✅ Updating behavior: 3 done: true
📊 All behaviors state: [
  { behavior_id: 1, done: true },
  { behavior_id: 2, done: true },
  { behavior_id: 3, done: true }  // ← All done!
]
🎉 All routines completed!
```

---

## Integration with Other Features

### 1. **Dashboard Chart**
The chart shows `routine_success` percentage:
- 0 of 3 done = 0%
- 1 of 3 done = 33%
- 2 of 3 done = 67%
- 3 of 3 done = 100%

Each day's percentage is calculated and displayed.

### 2. **Daily Check-in Modal**
The check-in modal also tracks behaviors:
- Same behaviors appear in modal
- User can add mood + notes
- Syncs with toggle state

### 3. **Progress Tracking**
Over time, you can see:
- Which behaviors are most consistent
- Improvement trends
- Correlation with mood

---

## Technical Implementation

### State Management

**Local State** (for immediate UI updates):
```typescript
const [todayBehaviors, setTodayBehaviors] = React.useState<Record<number, boolean>>({})

// Example state:
{
  1: true,   // Behavior 1 done
  2: false,  // Behavior 2 not done
  3: true    // Behavior 3 done
}
```

**Server State** (via TanStack Query):
```typescript
const updateCheckinMutation = useMutation({
  mutationFn: ({ behaviorId, done }) => {
    // Update local state immediately
    setTodayBehaviors(prev => ({ ...prev, [behaviorId]: done }))

    // Update server in background
    return upsertCheckin(childId, { behaviors: [...] })
  },
  onSuccess: () => {
    // Refresh dashboard
    queryClient.invalidateQueries(['dashboard'])
  }
})
```

### Optimistic Updates
We update the UI **before** the API call completes:

**Benefits:**
- ✅ Instant feedback (no loading spinner)
- ✅ Better UX (feels responsive)
- ✅ Works offline (queued for later)

**Handling Errors:**
- If API fails, we could revert the toggle
- Currently shows error in console
- Production: Show toast notification

---

## Future Enhancements

### 1. **Undo Feature**
```
┌───────────────────────────────────────┐
│ Se brosser les dents    [ON]  [UNDO] │
└───────────────────────────────────────┘
```

### 2. **Time Tracking**
```
Se brosser les dents ✓
Fait à 20:35
```

### 3. **Streaks**
```
Se brosser les dents ✓
🔥 Série de 5 jours !
```

### 4. **Reminders**
```
⏰ Rappel: Il est 20h30
   N'oubliez pas: Se brosser les dents
```

### 5. **Parent Notes**
```
Se brosser les dents ✓
💬 "A fait sans rappel aujourd'hui!"
```

---

## Testing

### Test 1: Toggle Behavior
```
1. Open home screen
2. See 3 behaviors with switches OFF
3. Toggle first behavior ON
4. ✅ Switch turns green
5. ✅ "✓ Fait" label appears
6. ✅ Console shows: "Updating behavior: 1 done: true"
7. ✅ API call succeeds
```

### Test 2: Complete All Behaviors
```
1. Toggle all 3 behaviors ON
2. ✅ Success banner appears
3. ✅ Message: "Bravo ! Toutes les routines sont réalisées aujourd'hui !"
4. ✅ All switches show green
5. ✅ All behaviors show "✓ Fait"
```

### Test 3: Toggle Off
```
1. Toggle a behavior ON
2. Wait for API to complete
3. Toggle same behavior OFF
4. ✅ Switch turns gray
5. ✅ "✓ Fait" label disappears
6. ✅ Success banner disappears (if was showing)
7. ✅ API call updates check-in
```

### Test 4: Offline Behavior
```
1. Enable airplane mode
2. Toggle behaviors
3. ✅ UI updates immediately
4. ❌ API call fails (queued)
5. Disable airplane mode
6. ✅ API call retries and succeeds
```

---

## Summary

The **3 routines du jour** feature allows parents to:

1. ✅ **Track daily behaviors** - Quick toggle switches
2. ✅ **See progress** - Visual feedback with "✓ Fait" labels
3. ✅ **Get encouraged** - Success banner when all done
4. ✅ **Monitor trends** - 7-day chart shows improvement
5. ✅ **Stay consistent** - Daily habit building

**It's designed to be:**
- 🚀 **Fast** - Optimistic updates, no loading
- 🎯 **Clear** - Visual feedback on completion
- 🎉 **Motivating** - Celebration when all done
- 📊 **Insightful** - Data feeds into charts and progress

The feature helps parents consistently track and improve their child's target behaviors, which is the core goal of the ADHD coaching app!
