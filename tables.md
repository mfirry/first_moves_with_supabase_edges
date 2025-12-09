```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  nickname VARCHAR(255),
  date_of_birth DATE,
  address TEXT,
  country VARCHAR(100),
  status VARCHAR(255) DEFAULT 'inactive', -- this can be either inactive, active, frozen, deleted
  stripe_customer_id VARCHAR(255) UNIQUE,
  created_at TIMESTAMP DEFAULT NOW()
);
```
