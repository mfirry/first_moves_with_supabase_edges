# Supabase Edge Functions - Deployment Instructions

## Prerequisites

- Node.js and npm installed
- A Supabase project (create one at https://supabase.com)
- Stripe account with API keys

## 1. Install Supabase CLI

```bash
npm install -g supabase
```

Verify installation:
```bash
supabase --version
```

## 2. Login to Supabase

```bash
supabase login
```

This will open a browser window to authenticate with your Supabase account.

## 3. Link Your Project

Navigate to your project directory and link it to your Supabase project:

```bash
supabase link --project-ref YOUR_PROJECT_REF
```

To find your project reference:
- Go to your Supabase project dashboard
- Look at the URL: `https://supabase.com/dashboard/project/YOUR_PROJECT_REF`
- Or go to Project Settings > General > Reference ID

## 4. Set Up Environment Variables

Edge Functions need environment variables set in your Supabase project.

### Option A: Using the Dashboard

1. Go to your Supabase dashboard
2. Navigate to **Edge Functions** in the sidebar
3. Click on **Manage secrets**
4. Add the following secrets:
   - `SUPABASE_URL`: Your project URL (e.g., `https://xxxxx.supabase.co`)
   - `SUPABASE_SERVICE_ROLE_KEY`: Found in Settings > API > service_role key
   - `STRIPE_SECRET_KEY`: Your Stripe secret key (starts with `sk_test_` or `sk_live_`)

### Option B: Using the CLI

```bash
supabase secrets set SUPABASE_URL=https://xxxxx.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
supabase secrets set STRIPE_SECRET_KEY=sk_test_xxxxx
```

To list all secrets:
```bash
supabase secrets list
```

## 5. Deploy Edge Functions

### Deploy a Single Function

```bash
supabase functions deploy create-user
```

### Deploy All Functions

```bash
supabase functions deploy
```

### Deploy with No Verification Prompt

```bash
supabase functions deploy create-user --no-verify-jwt
```

## 6. Test Your Deployed Function

Get your function URL:
```
https://YOUR_PROJECT_REF.supabase.co/functions/v1/FUNCTION_NAME
```

Test with curl:
```bash
curl -i --location --request POST \
  'https://YOUR_PROJECT_REF.supabase.co/functions/v1/create-user' \
  --header 'Authorization: Bearer YOUR_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{
    "email": "test@example.com",
    "name": "Test User"
  }'
```

Find your `ANON_KEY` in: Project Settings > API > anon public

## 7. View Function Logs

```bash
supabase functions logs create-user
```

For live logs (tail mode):
```bash
supabase functions logs create-user --tail
```

## 8. Local Development

### Start Supabase Locally

```bash
supabase start
```

This will start all Supabase services locally (PostgreSQL, PostgREST, GoTrue, etc.).

### Create .env File for Local Development

Create a `.env` file in your project root:

```env
SUPABASE_URL=http://localhost:54321
SUPABASE_SERVICE_ROLE_KEY=your_local_service_role_key
STRIPE_SECRET_KEY=sk_test_xxxxx
```

The local service role key is printed when you run `supabase start`.

### Serve a Function Locally

```bash
supabase functions serve create-user --env-file .env
```

The function will be available at:
```
http://localhost:54321/functions/v1/create-user
```

### Test Local Function

```bash
curl -i --location --request POST \
  'http://localhost:54321/functions/v1/create-user' \
  --header 'Authorization: Bearer YOUR_LOCAL_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{
    "email": "test@example.com",
    "name": "Test User"
  }'
```

## 9. Database Setup

Before deploying functions, create the required database tables:

1. Go to your Supabase dashboard
2. Navigate to **SQL Editor**
3. Copy the SQL from `tables.md`
4. Run the SQL to create tables

Or use the CLI:
```bash
supabase db push
```

## 10. Common Commands Reference

| Command | Description |
|---------|-------------|
| `supabase functions list` | List all functions in your project |
| `supabase functions delete FUNCTION_NAME` | Delete a deployed function |
| `supabase functions download FUNCTION_NAME` | Download a function from remote |
| `supabase secrets list` | List all environment secrets |
| `supabase secrets unset SECRET_NAME` | Remove a secret |
| `supabase stop` | Stop local Supabase services |
| `supabase status` | Check status of local services |

## Troubleshooting

### Function Fails to Deploy

- Check that you're logged in: `supabase login`
- Verify project is linked: `supabase projects list`
- Ensure function structure is correct (index.ts in the function folder)

### Function Returns 500 Error

- Check function logs: `supabase functions logs FUNCTION_NAME`
- Verify all environment variables are set: `supabase secrets list`
- Check database tables exist

### Local Development Not Working

- Ensure Docker is running (required for `supabase start`)
- Check that ports 54321, 54322, 54323 are available
- Verify .env file has correct values
- Check logs: `supabase logs`

### Database Connection Issues

- Verify `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are correct
- Check that service role key has proper permissions
- Ensure database tables are created

## Security Best Practices

1. **Never commit secrets** - Add `.env` to `.gitignore`
2. **Use service role key carefully** - Only in Edge Functions, never in client code
3. **Rotate keys regularly** - Update secrets periodically
4. **Use test keys for development** - Use Stripe test keys (sk_test_) during development
5. **Validate input** - Always validate and sanitize user input in functions
6. **Use RLS policies** - Enable Row Level Security on your database tables

## Next Steps

- Set up CI/CD for automatic deployments
- Add monitoring and alerting
- Implement rate limiting
- Add comprehensive error handling
- Write integration tests
