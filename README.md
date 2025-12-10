# Supabase Edge Functions with Stripe Integration

This project contains Supabase Edge Functions for user and group management with Stripe integration.

## Prerequisites

- Supabase project
- Stripe account
- Supabase CLI installed

## Database Schema

The project uses the following tables (see `tables.md` for complete SQL):

### Users Table
- Core user information (email, name, nickname, etc.)
- User status: `inactive`, `active`, `frozen`, `deleted`
- Stripe customer ID for payment integration
- Unique constraints on email and phone

### Groups Table
- Group management with admin user
- Group name (required) and description (optional)
- Group status: `active`, `frozen`, `deleted`
- Foreign key to users table for admin

### Group Members Table
- Junction table connecting users to groups
- Composite primary key (group_id, user_id)
- Tracks when users joined groups
- Admin users should also be members of their groups

## Setup

1. **Install Supabase CLI** (if not already installed):
   ```bash
   npm install -g supabase
   ```

2. **Create the database tables**:
   Run the SQL from `tables.md` in your Supabase SQL Editor to create the users, groups, and group_members tables.

3. **Set up environment variables**:
   In your Supabase project dashboard, go to Edge Functions settings and add:
   - `SUPABASE_URL`: Your Supabase project URL
   - `SUPABASE_SERVICE_ROLE_KEY`: Your service role key (found in project settings)
   - `STRIPE_SECRET_KEY`: Your Stripe secret key (starts with `sk_`)

4. **Deploy the function**:
   ```bash
   supabase functions deploy create-user
   ```

## Testing Locally

1. **Start Supabase locally** (optional):
   ```bash
   supabase start
   ```

2. **Serve the function locally**:
   ```bash
   supabase functions serve create-user --env-file .env
   ```

3. **Test with curl**:
   ```bash
   curl -i --location --request POST 'http://localhost:54321/functions/v1/create-user' \
     --header 'Authorization: Bearer YOUR_ANON_KEY' \
     --header 'Content-Type: application/json' \
     --data '{"email":"user@example.com","name":"John Doe","nickname":"johnny","country":"US"}'
   ```

## API Usage

### Endpoint
POST `/create-user`

### Request Body
```json
{
  "email": "user@example.com",      // Required
  "name": "John Doe",                // Required
  "nickname": "johnny",              // Optional
  "date_of_birth": "1990-01-15",    // Optional (YYYY-MM-DD)
  "address": "123 Main St",         // Optional
  "country": "US"                   // Optional
}
```

### Response (Success - 201)
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "nickname": "johnny",
    "date_of_birth": "1990-01-15",
    "address": "123 Main St",
    "country": "US",
    "status": "inactive",
    "stripe_customer_id": "cus_xxxxx",
    "created_at": "2025-12-09T..."
  },
  "stripe_customer_id": "cus_xxxxx"
}
```

### Error Responses

**400 Bad Request** - Missing required fields:
```json
{
  "error": "Email and name are required"
}
```

**500 Internal Server Error** - Database or Stripe error:
```json
{
  "error": "Failed to create user",
  "details": "..."
}
```

## What It Does

1. Validates that `email` and `name` are provided
2. Creates a new user record in the `users` table
3. Creates a Stripe customer with the provided information
4. Updates the user record with the Stripe customer ID
5. Returns the complete user object with the Stripe customer ID

## Notes

- The user status defaults to `inactive`
- The Stripe customer ID is stored in the `stripe_customer_id` field
- The user ID is stored in Stripe customer metadata as `user_id`
- If Stripe customer creation fails after user creation, the function returns an error but the user remains in the database

## Available Edge Functions

### create-user
Creates a new user with Stripe customer integration (documented above)

### create-group
Creates a new group with an admin user and automatic member management

#### Endpoint
POST `/create-group`

#### Request Body
```json
{
  "admin_user_id": "uuid-string",     // Required - Must be existing user ID
  "name": "Group Name",                // Required
  "description": "Group description",  // Optional
  "status": "active"                   // Optional - Defaults to "active"
}
```

#### Response (Success - 201)
```json
{
  "success": true,
  "group": {
    "id": "uuid",
    "admin_user_id": "uuid",
    "name": "Group Name",
    "description": "Group description",
    "status": "active",
    "created_at": "2025-12-10T..."
  }
}
```

#### Error Responses

**400 Bad Request** - Missing required fields:
```json
{
  "error": "admin_user_id and name are required"
}
```

**400 Bad Request** - Invalid status:
```json
{
  "error": "Invalid status. Must be one of: active, frozen, deleted"
}
```

**404 Not Found** - Admin user doesn't exist:
```json
{
  "error": "Admin user not found",
  "details": "..."
}
```

**500 Internal Server Error** - Database error:
```json
{
  "error": "Failed to create group",
  "details": "..."
}
```

#### What It Does

1. Validates that `admin_user_id` and `name` are provided
2. Verifies the admin user exists in the database
3. Validates the status value (if provided)
4. Creates a new group record in the `groups` table
5. Automatically adds the admin user to `group_members` table
6. Returns the complete group object

#### Notes

- The group status defaults to `active`
- Valid status values: `active`, `frozen`, `deleted`
- Admin user is automatically added to the group members
- If adding admin to group_members fails, the group creation is rolled back
- Admin user must exist and have `active` or `inactive` status
