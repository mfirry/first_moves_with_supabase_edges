# Supabase Edge Function - Create User with Stripe Customer

This project contains a Supabase Edge Function that creates a user in your database and automatically creates a corresponding Stripe customer.

## Prerequisites

- Supabase project
- Stripe account
- Supabase CLI installed

## Setup

1. **Install Supabase CLI** (if not already installed):
   ```bash
   npm install -g supabase
   ```

2. **Create the database table**:
   Run the SQL from `tables.md` in your Supabase SQL Editor to create the users table.

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
