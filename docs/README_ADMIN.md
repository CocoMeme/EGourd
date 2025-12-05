# Admin Dashboard - Quick Start

## 3-Step Setup

### Step 1: Set Admin Role (30 seconds)

Open MongoDB and run:

```javascript
db.users.updateOne(
  { email: "your-email@example.com" },
  { $set: { role: "admin", isActive: true, isEmailVerified: true } }
);
```

### Step 2: Login (10 seconds)

```bash
POST http://localhost:5000/api/auth/local/login

{
  "identifier": "your-email@example.com",
  "password": "your-password"
}
```

Copy the `accessToken` from response.

### Step 3: Access Dashboard (5 seconds)

```bash
GET http://localhost:5000/api/admin/dashboard
Authorization: Bearer YOUR_ACCESS_TOKEN
```

## ✅ Done!

You now have full access to:

- View all users
- Activate/Deactivate accounts
- Change user roles
- Suspend accounts
- Delete accounts
- Bulk operations
- User statistics

## 📖 Full Documentation

- **Setup Guide**: `backend/docs/SET_ADMIN_ROLE.md`
- **API Reference**: `backend/docs/ADMIN_DASHBOARD.md`
- **Postman Collection**: `backend/docs/Admin_Dashboard_API.postman_collection.json`

## 🎯 Most Used Endpoints

```
GET  /api/admin/dashboard              - Overview
GET  /api/admin/users                  - List users
GET  /api/admin/users/:id              - User details
PATCH /api/admin/users/:id/activate    - Activate
PATCH /api/admin/users/:id/deactivate  - Deactivate
```

**All endpoints require:** `Authorization: Bearer YOUR_TOKEN`
