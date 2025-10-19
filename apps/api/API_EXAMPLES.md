# API Documentation & cURL Examples

Complete API reference for the ADHD Parent Coach application.

Base URL: `http://localhost:8000` (development)

---

## Authentication Endpoints

### 1. Create Guest User

Create a temporary guest user that can be converted to a full account later.

```bash
curl -X POST http://localhost:8000/api/auth/users/guest/ \
  -H "Content-Type: application/json"
```

**Response:**
```json
{
  "user": {
    "id": 1,
    "email": null,
    "username": null,
    "is_guest": true,
    "is_active": true,
    "created_at": "2025-10-18T10:00:00Z"
  },
  "access": "eyJhbGci...",
  "refresh": "eyJhbGci...",
  "message": "Guest session created successfully."
}
```

### 2. Convert Guest to Full Account

Convert an authenticated guest user to a full account with email/password.

```bash
curl -X POST http://localhost:8000/api/auth/users/convert/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "email": "parent@example.com",
    "username": "parentuser",
    "password": "SecurePass123!",
    "password_confirm": "SecurePass123!"
  }'
```

**Response:**
```json
{
  "user": {
    "id": 1,
    "email": "parent@example.com",
    "username": "parentuser",
    "is_guest": false,
    "is_active": true
  },
  "access": "eyJhbGci...",
  "refresh": "eyJhbGci...",
  "message": "Account converted successfully. Please verify your email."
}
```

### 3. Register (Full Account)

Create a full account directly (skipping guest flow).

```bash
curl -X POST http://localhost:8000/api/auth/users/ \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "username": "username",
    "password": "SecurePass123!",
    "password_confirm": "SecurePass123!"
  }'
```

### 4. Login

Authenticate with email and password.

```bash
curl -X POST http://localhost:8000/api/auth/users/login/ \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123!"
  }'
```

**Response:**
```json
{
  "user": {
    "id": 1,
    "email": "user@example.com",
    "username": "username",
    "is_active": true,
    "is_guest": false
  },
  "access": "eyJhbGci...",
  "refresh": "eyJhbGci...",
  "message": "Login successful."
}
```

### 5. Refresh Token

Get a new access token using refresh token.

```bash
curl -X POST http://localhost:8000/api/auth/users/refresh/ \
  -H "Content-Type: application/json" \
  -d '{
    "refresh": "YOUR_REFRESH_TOKEN"
  }'
```

---

## Children Endpoints

### 1. Create a Child

Create a child profile (requires authentication).

```bash
curl -X POST http://localhost:8000/api/children/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "first_name": "Marie",
    "schooling_stage": "6-13",
    "diagnosed_adhd": "unknown"
  }'
```

**Parameters:**
- `first_name` (optional): Child's first name
- `schooling_stage` (required): `"preK"`, `"6-13"`, or `"13-18"`
- `diagnosed_adhd` (required): `"yes"`, `"no"`, or `"unknown"`

**Response:**
```json
{
  "id": 1,
  "first_name": "Marie",
  "schooling_stage": "6-13",
  "diagnosed_adhd": "unknown",
  "created_at": "2025-10-18T10:00:00Z",
  "updated_at": "2025-10-18T10:00:00Z"
}
```

### 2. List Children

Get all children for the authenticated user.

```bash
curl -X GET http://localhost:8000/api/children/ \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### 3. Get Child Details

```bash
curl -X GET http://localhost:8000/api/children/1/ \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### 4. Update Child

```bash
curl -X PATCH http://localhost:8000/api/children/1/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "first_name": "Marie-Anne",
    "diagnosed_adhd": "yes"
  }'
```

---

## Screener Endpoints

### Create Screener for Child

Complete the ADHD screening assessment for a child.

```bash
curl -X POST http://localhost:8000/api/children/1/screener/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "answers": {
      "q1": 2,
      "q2": 3,
      "q3": 1,
      "q4": 2,
      "q5": 0,
      "q6": 1,
      "q7": 2,
      "q8": 3,
      "q9": 1,
      "q10": 2
    }
  }'
```

**Parameters:**
- `answers`: Dictionary with question keys (q1-q10) and values 0-3

**Response:**
```json
{
  "id": 1,
  "child": 1,
  "instrument": "mini_adhd_v1",
  "answers": {"q1": 2, "q2": 3, ...},
  "total_score": 17,
  "zone": "orange",
  "recommendations": [
    "Consider consulting a professional for further evaluation.",
    "Focus on behavioral strategies and routines.",
    "Start with the Special Time and Effective Commands modules."
  ],
  "consult": [
    "pediatre",
    "neuropsychologue",
    "orthophoniste",
    "psychomotricien",
    "ergotherapeute",
    "orthoptiste"
  ],
  "created_at": "2025-10-18T10:00:00Z"
}
```

**Zones:**
- `vert` (green): Score d 10 - Low concern
- `orange` (orange): Score 11-20 - Moderate concern
- `rouge` (red): Score > 20 - High concern

---

## Target Behaviors Endpoints

### 1. Create Target Behaviors

Set up to 3 behaviors to track for a child.

```bash
curl -X POST http://localhost:8000/api/children/1/targets/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "behaviors": [
      {"name": "Se brosser les dents"},
      {"name": "Aller au lit a l'\''heure"},
      {"name": "Faire les devoirs"}
    ]
  }'
```

**Constraints:**
- Maximum 3 active behaviors per child

**Response:**
```json
[
  {
    "id": 1,
    "child": 1,
    "name": "Se brosser les dents",
    "active": true,
    "created_at": "2025-10-18T10:00:00Z",
    "updated_at": "2025-10-18T10:00:00Z"
  },
  {
    "id": 2,
    "child": 1,
    "name": "Aller au lit a l'heure",
    "active": true,
    "created_at": "2025-10-18T10:00:00Z",
    "updated_at": "2025-10-18T10:00:00Z"
  },
  {
    "id": 3,
    "child": 1,
    "name": "Faire les devoirs",
    "active": true,
    "created_at": "2025-10-18T10:00:00Z",
    "updated_at": "2025-10-18T10:00:00Z"
  }
]
```

### 2. List Target Behaviors

```bash
curl -X GET http://localhost:8000/api/target-behaviors/ \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### 3. Update Target Behavior

```bash
curl -X PATCH http://localhost:8000/api/target-behaviors/1/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "name": "Se brosser les dents le matin et le soir",
    "active": true
  }'
```

### 4. Delete Target Behavior

```bash
curl -X DELETE http://localhost:8000/api/target-behaviors/1/ \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## Daily Check-in Endpoints

### Create/Update Daily Check-in

Create or update a daily check-in (idempotent by date).

```bash
curl -X POST http://localhost:8000/api/children/1/checkins/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "date": "2025-10-18",
    "mood": 4,
    "behaviors": [
      {"behavior_id": 1, "done": true},
      {"behavior_id": 2, "done": false},
      {"behavior_id": 3, "done": true}
    ],
    "notes": "Good day overall! Struggled with bedtime."
  }'
```

**Parameters:**
- `date` (required): Date in YYYY-MM-DD format
- `mood` (required): Integer 1-5 (1=very bad, 5=excellent)
- `behaviors` (required): List of behavior completions
- `notes` (optional): Parent notes

**Behavior Format:**
```json
{"behavior_id": 1, "done": true}
```

**Response:**
```json
{
  "id": 1,
  "child": 1,
  "date": "2025-10-18",
  "mood": 4,
  "behaviors": [
    {"behavior_id": 1, "done": true},
    {"behavior_id": 2, "done": false},
    {"behavior_id": 3, "done": true}
  ],
  "notes": "Good day overall! Struggled with bedtime.",
  "created_at": "2025-10-18T20:00:00Z",
  "updated_at": "2025-10-18T20:00:00Z"
}
```

**Note:** Calling this endpoint again with the same date will UPDATE the existing check-in, not create a duplicate.

### List Daily Check-ins

```bash
curl -X GET http://localhost:8000/api/daily-checkins/ \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## Dashboard Endpoint

### Get Dashboard Data

Get 7-day progress overview for a child.

```bash
curl -X GET http://localhost:8000/api/children/1/dashboard/?range=7 \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Query Parameters:**
- `range` (optional, default=7): Number of days (1-30)

**Response:**
```json
{
  "days": [
    "2025-10-12",
    "2025-10-13",
    "2025-10-14",
    "2025-10-15",
    "2025-10-16",
    "2025-10-17",
    "2025-10-18"
  ],
  "routine_success": [
    0.67,
    1.0,
    0.33,
    null,
    0.67,
    1.0,
    0.67
  ],
  "mood": [
    4,
    5,
    3,
    null,
    4,
    5,
    4
  ]
}
```

**Data Explanation:**
- `routine_success`: Percentage of behaviors completed (0.0-1.0), null if no check-in
- `mood`: Mood value (1-5), null if no check-in
- Days with null values had no check-in recorded

---

## Complete Onboarding Flow Example

Here's a complete flow from guest creation through onboarding:

```bash
# 1. Create guest session
RESPONSE=$(curl -s -X POST http://localhost:8000/api/auth/users/guest/ \
  -H "Content-Type: application/json")
ACCESS_TOKEN=$(echo $RESPONSE | jq -r '.access')
echo "Guest access token: $ACCESS_TOKEN"

# 2. Create a child
CHILD_RESPONSE=$(curl -s -X POST http://localhost:8000/api/children/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{
    "first_name": "Marie",
    "schooling_stage": "6-13",
    "diagnosed_adhd": "unknown"
  }')
CHILD_ID=$(echo $CHILD_RESPONSE | jq -r '.id')
echo "Child ID: $CHILD_ID"

# 3. Complete screener
curl -X POST http://localhost:8000/api/children/$CHILD_ID/screener/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{
    "answers": {
      "q1": 2, "q2": 2, "q3": 1, "q4": 2, "q5": 1,
      "q6": 2, "q7": 1, "q8": 2, "q9": 1, "q10": 1
    }
  }'

# 4. Set target behaviors
curl -X POST http://localhost:8000/api/children/$CHILD_ID/targets/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{
    "behaviors": [
      {"name": "Se brosser les dents"},
      {"name": "Aller au lit a l'\''heure"},
      {"name": "Faire les devoirs"}
    ]
  }'

# 5. Convert to full account
CONVERT_RESPONSE=$(curl -s -X POST http://localhost:8000/api/auth/users/convert/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{
    "email": "marie.parent@example.com",
    "username": "marieparent",
    "password": "SecurePass123!",
    "password_confirm": "SecurePass123!"
  }')
NEW_ACCESS_TOKEN=$(echo $CONVERT_RESPONSE | jq -r '.access')
echo "Full account access token: $NEW_ACCESS_TOKEN"

# 6. Verify data is preserved
curl -X GET http://localhost:8000/api/children/ \
  -H "Authorization: Bearer $NEW_ACCESS_TOKEN"
```

---

## OpenAPI Schema

Access the interactive API documentation:

- **Swagger UI**: http://localhost:8000/schema/swagger-ui/
- **OpenAPI Schema**: http://localhost:8000/schema/

---

## Authentication Notes

### Token Usage

All authenticated endpoints require the `Authorization` header:

```
Authorization: Bearer YOUR_ACCESS_TOKEN
```

### Token Lifetimes

- **Access Token**: 15 minutes
- **Refresh Token**: 1 year

### Refreshing Tokens

When your access token expires, use the refresh endpoint:

```bash
curl -X POST http://localhost:8000/api/auth/users/refresh/ \
  -H "Content-Type: application/json" \
  -d '{"refresh": "YOUR_REFRESH_TOKEN"}'
```

---

## Error Responses

### Common Error Codes

- `400 Bad Request`: Validation error or invalid data
- `401 Unauthorized`: Missing or invalid authentication token
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource doesn't exist or access denied
- `500 Internal Server Error`: Server error

### Example Error Response

```json
{
  "email": ["A user with that email already exists."],
  "password": ["This password is too common."]
}
```

---

## Notes & Best Practices

1. **Guest Users**
   - Guest users can access all functionality before converting to full accounts
   - All data (children, screeners, check-ins) is preserved during conversion
   - Guest sessions are fully authenticated with JWT

2. **Target Behaviors**
   - Limited to 3 active behaviors per child
   - Can be updated or deactivated, but not completely removed if used in check-ins

3. **Daily Check-ins**
   - Are idempotent by date - calling twice with the same date updates the existing check-in
   - Behaviors array can contain any structure, but the dashboard calculates completion based on `done` field

4. **Dashboard**
   - Returns null for days without check-ins
   - Routine success is calculated as percentage of behaviors marked `done: true`

5. **Permissions**
   - Users can only access their own children and related data
   - Object-level permissions are enforced on all endpoints
