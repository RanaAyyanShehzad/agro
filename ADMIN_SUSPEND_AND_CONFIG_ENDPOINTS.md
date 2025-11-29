# ADMIN SUSPEND USER & SYSTEM CONFIG ENDPOINTS

## Base URL
- **Admin Routes**: `/api/v1/admin`

All endpoints require authentication (JWT token in cookies) and admin role.

---

## 🔴 SUSPEND USER ENDPOINTS

### 1. Suspend User
**Endpoint**: `POST /api/v1/admin/users/:role/:userId/suspend`

**Description**: Admin suspends a user account for a specified duration (in minutes). User cannot login during suspension period.

**Authorization**: Admin only

**URL Parameters**:
- `role` (required): User role - `"buyer"` | `"farmer"` | `"supplier"`
- `userId` (required): User ID to suspend

**Request Body**:
```json
{
  "duration": 60,  // Required: Suspension duration in minutes (must be > 0)
  "reason": "Policy violation"  // Optional: Reason for suspension (default: "Policy violation")
}
```

**Example Request**:
```json
POST /api/v1/admin/users/buyer/69293fdf4fbb23e04c7dc009/suspend
{
  "duration": 120,
  "reason": "Violation of terms of service"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "User suspended until 2025-01-29T15:30:00.000Z",
  "user": {
    "_id": "69293fdf4fbb23e04c7dc009",
    "name": "John Doe",
    "email": "john@example.com",
    "isSuspended": true,
    "suspendedUntil": "2025-01-29T15:30:00.000Z",
    "suspensionReason": "Violation of terms of service"
  }
}
```

**Error Responses**:
- `400`: Invalid role, duration missing or <= 0
- `401`: Not authenticated
- `403`: Not authorized (not admin)
- `404`: User not found

**Notes**:
- Suspending a user also sets `isActive = false`
- User receives email notification about suspension
- User receives in-app notification
- Audit log is created for this action
- User cannot login while suspended (checked in login functions)

---

### 2. Unsuspend User
**Endpoint**: `POST /api/v1/admin/users/:role/:userId/unsuspend`

**Description**: Admin lifts the suspension from a user account, allowing them to login again.

**Authorization**: Admin only

**URL Parameters**:
- `role` (required): User role - `"buyer"` | `"farmer"` | `"supplier"`
- `userId` (required): User ID to unsuspend

**Request Body**: None

**Example Request**:
```
POST /api/v1/admin/users/buyer/69293fdf4fbb23e04c7dc009/unsuspend
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "User suspension lifted successfully",
  "user": {
    "_id": "69293fdf4fbb23e04c7dc009",
    "name": "John Doe",
    "email": "john@example.com",
    "isSuspended": false,
    "suspendedUntil": null,
    "suspensionReason": null,
    "isActive": true
  }
}
```

**Error Responses**:
- `400`: Invalid role, user not suspended
- `401`: Not authenticated
- `403`: Not authorized (not admin)
- `404`: User not found

**Notes**:
- Unsuspending also sets `isActive = true`
- User receives email notification
- User receives in-app notification
- Audit log is created for this action

---

## ⚙️ SYSTEM CONFIG ENDPOINTS

### 3. Get System Configuration
**Endpoint**: `GET /api/v1/admin/config`

**Description**: Admin retrieves system configuration settings. Can get all configs or a specific one by key.

**Authorization**: Admin only

**Query Parameters**:
- `configKey` (optional): Specific config key to retrieve. If not provided, returns all configs.

**Available Config Keys**:
- `MAX_TEMP_CELSIUS`: Maximum temperature threshold for weather alerts
- `MIN_TEMP_CELSIUS`: Minimum temperature threshold for weather alerts
- `FAQ_CONTENT`: FAQ content (string or array)
- `AUTO_CONFIRM_MINUTES`: Minutes after delivery to auto-confirm order (default: 10)
- `SHIPPED_TO_DELIVERED_MINUTES`: Minutes after shipped before seller can mark as delivered (default: 10)
- `DELIVERED_TO_RECEIVED_MINUTES`: Minutes after delivered before auto-confirming (default: 10)
- `DISPUTE_RESPONSE_MINUTES`: Minutes for seller to respond to dispute before auto-escalation (default: 10)

**Example Request 1 - Get All Configs**:
```
GET /api/v1/admin/config
```

**Response** (200 OK):
```json
{
  "success": true,
  "count": 7,
  "configs": [
    {
      "_id": "config_id_1",
      "configKey": "MAX_TEMP_CELSIUS",
      "configValue": 42,
      "description": "Maximum temperature threshold for dangerous weather alerts",
      "updatedBy": {
        "_id": "admin_id",
        "name": "Admin Name",
        "email": "admin@example.com"
      },
      "createdAt": "2025-01-29T10:00:00.000Z",
      "updatedAt": "2025-01-29T12:00:00.000Z"
    },
    {
      "_id": "config_id_2",
      "configKey": "MIN_TEMP_CELSIUS",
      "configValue": 2,
      "description": "Minimum temperature threshold for dangerous weather alerts",
      "updatedBy": {
        "_id": "admin_id",
        "name": "Admin Name",
        "email": "admin@example.com"
      },
      "createdAt": "2025-01-29T10:00:00.000Z",
      "updatedAt": "2025-01-29T12:00:00.000Z"
    },
    {
      "_id": "config_id_3",
      "configKey": "AUTO_CONFIRM_MINUTES",
      "configValue": 10,
      "description": "Minutes after delivery to automatically confirm order (for testing)",
      "updatedBy": {
        "_id": "admin_id",
        "name": "Admin Name",
        "email": "admin@example.com"
      },
      "createdAt": "2025-01-29T10:00:00.000Z",
      "updatedAt": "2025-01-29T12:00:00.000Z"
    },
    {
      "_id": "config_id_4",
      "configKey": "SHIPPED_TO_DELIVERED_MINUTES",
      "configValue": 10,
      "description": "Minutes after shipped status before seller can mark as delivered (for testing)",
      "updatedBy": {
        "_id": "admin_id",
        "name": "Admin Name",
        "email": "admin@example.com"
      },
      "createdAt": "2025-01-29T10:00:00.000Z",
      "updatedAt": "2025-01-29T12:00:00.000Z"
    },
    {
      "_id": "config_id_5",
      "configKey": "DELIVERED_TO_RECEIVED_MINUTES",
      "configValue": 10,
      "description": "Minutes after delivered status before auto-confirming (for testing)",
      "updatedBy": {
        "_id": "admin_id",
        "name": "Admin Name",
        "email": "admin@example.com"
      },
      "createdAt": "2025-01-29T10:00:00.000Z",
      "updatedAt": "2025-01-29T12:00:00.000Z"
    },
    {
      "_id": "config_id_6",
      "configKey": "DISPUTE_RESPONSE_MINUTES",
      "configValue": 10,
      "description": "Minutes for seller to respond to dispute before auto-escalation to admin (for testing)",
      "updatedBy": {
        "_id": "admin_id",
        "name": "Admin Name",
        "email": "admin@example.com"
      },
      "createdAt": "2025-01-29T10:00:00.000Z",
      "updatedAt": "2025-01-29T12:00:00.000Z"
    },
    {
      "_id": "config_id_7",
      "configKey": "FAQ_CONTENT",
      "configValue": "FAQ content here...",
      "description": "FAQ content",
      "updatedBy": {
        "_id": "admin_id",
        "name": "Admin Name",
        "email": "admin@example.com"
      },
      "createdAt": "2025-01-29T10:00:00.000Z",
      "updatedAt": "2025-01-29T12:00:00.000Z"
    }
  ]
}
```

**Example Request 2 - Get Specific Config**:
```
GET /api/v1/admin/config?configKey=DISPUTE_RESPONSE_MINUTES
```

**Response** (200 OK):
```json
{
  "success": true,
  "config": {
    "_id": "config_id_6",
    "configKey": "DISPUTE_RESPONSE_MINUTES",
    "configValue": 10,
    "description": "Minutes for seller to respond to dispute before auto-escalation to admin (for testing)",
    "updatedBy": {
      "_id": "admin_id",
      "name": "Admin Name",
      "email": "admin@example.com"
    },
    "createdAt": "2025-01-29T10:00:00.000Z",
    "updatedAt": "2025-01-29T12:00:00.000Z"
  }
}
```

**Error Responses**:
- `401`: Not authenticated
- `403`: Not authorized (not admin)
- `404`: Configuration not found (when specific key requested)

---

### 4. Update System Configuration
**Endpoint**: `PUT /api/v1/admin/config`

**Description**: Admin updates a system configuration value.

**Authorization**: Admin only

**Request Body**:
```json
{
  "configKey": "DISPUTE_RESPONSE_MINUTES",  // Required: One of the valid config keys
  "configValue": 15  // Required: New value (type depends on config key)
}
```

**Config Value Types**:
- `MAX_TEMP_CELSIUS`: Number (temperature in Celsius)
- `MIN_TEMP_CELSIUS`: Number (temperature in Celsius)
- `FAQ_CONTENT`: String or Array
- `AUTO_CONFIRM_MINUTES`: Number (minutes, must be >= 0)
- `SHIPPED_TO_DELIVERED_MINUTES`: Number (minutes, must be >= 0)
- `DELIVERED_TO_RECEIVED_MINUTES`: Number (minutes, must be >= 0)
- `DISPUTE_RESPONSE_MINUTES`: Number (minutes, must be >= 0)

**Example Request 1 - Update Time Config**:
```json
PUT /api/v1/admin/config
{
  "configKey": "DISPUTE_RESPONSE_MINUTES",
  "configValue": 30
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Configuration updated successfully",
  "config": {
    "_id": "config_id_6",
    "configKey": "DISPUTE_RESPONSE_MINUTES",
    "configValue": 30,
    "description": "Minutes for seller to respond to dispute before auto-escalation to admin (for testing)",
    "updatedBy": {
      "_id": "admin_id",
      "name": "Admin Name",
      "email": "admin@example.com"
    },
    "createdAt": "2025-01-29T10:00:00.000Z",
    "updatedAt": "2025-01-29T15:00:00.000Z"
  }
}
```

**Example Request 2 - Update Temperature Config**:
```json
PUT /api/v1/admin/config
{
  "configKey": "MAX_TEMP_CELSIUS",
  "configValue": 45
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Configuration updated successfully",
  "config": {
    "_id": "config_id_1",
    "configKey": "MAX_TEMP_CELSIUS",
    "configValue": 45,
    "description": "Maximum temperature threshold for dangerous weather alerts",
    "updatedBy": {
      "_id": "admin_id",
      "name": "Admin Name",
      "email": "admin@example.com"
    },
    "createdAt": "2025-01-29T10:00:00.000Z",
    "updatedAt": "2025-01-29T15:00:00.000Z"
  }
}
```

**Example Request 3 - Update FAQ Content**:
```json
PUT /api/v1/admin/config
{
  "configKey": "FAQ_CONTENT",
  "configValue": "Updated FAQ content here..."
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Configuration updated successfully",
  "config": {
    "_id": "config_id_7",
    "configKey": "FAQ_CONTENT",
    "configValue": "Updated FAQ content here...",
    "description": "FAQ content",
    "updatedBy": {
      "_id": "admin_id",
      "name": "Admin Name",
      "email": "admin@example.com"
    },
    "createdAt": "2025-01-29T10:00:00.000Z",
    "updatedAt": "2025-01-29T15:00:00.000Z"
  }
}
```

**Error Responses**:
- `400`: 
  - Missing configKey or configValue
  - Invalid config key
  - Invalid config value type (e.g., string for temperature, negative number for minutes)
- `401`: Not authenticated
- `403`: Not authorized (not admin)

**Validation Rules**:
- Temperature configs (`MAX_TEMP_CELSIUS`, `MIN_TEMP_CELSIUS`): Must be a number
- Time configs (all `*_MINUTES`): Must be a number >= 0
- `FAQ_CONTENT`: Must be a string or array

---

## 📋 SUMMARY

### Suspend User Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/admin/users/:role/:userId/suspend` | Suspend user account |
| POST | `/api/v1/admin/users/:role/:userId/unsuspend` | Lift user suspension |

### System Config Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/admin/config` | Get all or specific config |
| PUT | `/api/v1/admin/config` | Update system configuration |

---

## 🔔 NOTES

1. **Suspension Behavior**:
   - Suspended users cannot login (checked in login functions)
   - Suspension automatically expires after `suspendedUntil` time
   - Suspending sets `isActive = false`
   - Unsuspending sets `isActive = true`

2. **System Config**:
   - All time-based configs are in **minutes** for easier testing
   - Default values are set to 10 minutes for testing purposes
   - Configs are initialized on server start if they don't exist
   - Changes take effect immediately

3. **Audit Logging**:
   - All suspend/unsuspend actions are logged
   - Config updates track which admin made the change

