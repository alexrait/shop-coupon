import { neon } from '@netlify/neon';

export const getDb = () => {
  const connectionString = process.env.DATABASE_URL || process.env.NETLIFY_DATABASE_URL;
  try {
    if (!connectionString) {
      console.error("No database connection string found. Check Netlify Environment Variables.");
    }
    return neon(connectionString);
  } catch (e) {
    console.error("Neon connection failed:", e);
    throw new Error("Database connection failed. Please ensure the Neon integration is configured in Netlify.");
  }
};

export const ensureDbReady = async (sql, user) => {
  if (!user) return;
  
  // 1. Check if schema exists, if not, init it
  try {
    const [row] = await sql`SELECT 1 FROM shopcoupon.users LIMIT 1`;
  } catch (e) {
    console.log("Schema missing, initializing...");
    await initSchema();
  }

  // 2. Run migrations (ensure columns exist)
  await runMigrations(sql);

  // 3. Ensure current user exists in our users table
  await sql`
    INSERT INTO shopcoupon.users (id, email)
    VALUES (${user.sub}, ${user.email})
    ON CONFLICT (id) DO NOTHING
  `;
};

export const runMigrations = async (sql) => {
  // Migration: Ensure 'status', 'position', 'updated_at', and 'deleted_at' columns exist for existing tables
  await sql`
    DO $$ 
    BEGIN 
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='shopcoupon' AND table_name='coupons' AND column_name='status') THEN
        ALTER TABLE shopcoupon.coupons ADD COLUMN status TEXT NOT NULL DEFAULT 'active';
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='shopcoupon' AND table_name='coupons' AND column_name='position') THEN
        ALTER TABLE shopcoupon.coupons ADD COLUMN position INTEGER DEFAULT 0;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='shopcoupon' AND table_name='coupons' AND column_name='updated_at') THEN
        ALTER TABLE shopcoupon.coupons ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='shopcoupon' AND table_name='coupons' AND column_name='deleted_at') THEN
        ALTER TABLE shopcoupon.coupons ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;
      END IF;
    END $$;
  `;

  // Migration: Ensure shopping_lists and shopping_items tables exist
  await sql`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='shopcoupon' AND table_name='shopping_lists') THEN
        CREATE TABLE shopcoupon.shopping_lists (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          owner_id UUID REFERENCES shopcoupon.users(id),
          name TEXT NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      END IF;
      
      IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='shopcoupon' AND table_name='shopping_list_members') THEN
        CREATE TABLE shopcoupon.shopping_list_members (
          list_id UUID REFERENCES shopcoupon.shopping_lists(id) ON DELETE CASCADE,
          user_id UUID REFERENCES shopcoupon.users(id) ON DELETE CASCADE,
          PRIMARY KEY (list_id, user_id)
        );
      END IF;

      IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='shopcoupon' AND table_name='shopping_items') THEN
        CREATE TABLE shopcoupon.shopping_items (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          list_id UUID REFERENCES shopcoupon.shopping_lists(id) ON DELETE CASCADE,
          encrypted_name TEXT NOT NULL,
          quantity INTEGER DEFAULT 1,
          status TEXT NOT NULL DEFAULT 'pending',
          note TEXT,
          position INTEGER DEFAULT 0,
          bought_at TIMESTAMP WITH TIME ZONE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      END IF;

      IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='shopcoupon' AND table_name='push_subscriptions') THEN
        CREATE TABLE shopcoupon.push_subscriptions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID REFERENCES shopcoupon.users(id) ON DELETE CASCADE,
          subscription JSONB NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      END IF;
    END $$;
  `;
};

export const initSchema = async () => {
  const sql = getDb();

  // Create Custom PostgreSQL Schema to isolate project tables
  await sql`CREATE SCHEMA IF NOT EXISTS shopcoupon;`;

  await sql`
    CREATE TABLE IF NOT EXISTS shopcoupon.users (
      id UUID PRIMARY KEY,
      email TEXT UNIQUE NOT NULL
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS shopcoupon.lists (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      owner_id UUID REFERENCES shopcoupon.users(id),
      name TEXT NOT NULL,
      salt TEXT NOT NULL,
      encrypted_private_key TEXT NOT NULL,
      iv TEXT NOT NULL,
      public_key TEXT NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS shopcoupon.list_members (
      list_id UUID REFERENCES shopcoupon.lists(id) ON DELETE CASCADE,
      user_id UUID REFERENCES shopcoupon.users(id) ON DELETE CASCADE,
      PRIMARY KEY (list_id, user_id)
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS shopcoupon.categories (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      list_id UUID REFERENCES shopcoupon.lists(id) ON DELETE CASCADE,
      encrypted_name TEXT NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS shopcoupon.coupons (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      list_id UUID REFERENCES shopcoupon.lists(id) ON DELETE CASCADE,
      category_id UUID REFERENCES shopcoupon.categories(id) ON DELETE SET NULL,
      encrypted_payload JSONB NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      position INTEGER DEFAULT 0,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      deleted_at TIMESTAMP WITH TIME ZONE
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS shopcoupon.action_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES shopcoupon.users(id),
      list_id UUID REFERENCES shopcoupon.lists(id) ON DELETE CASCADE,
      coupon_id UUID REFERENCES shopcoupon.coupons(id) ON DELETE SET NULL,
      action_type TEXT NOT NULL,
      action_details JSONB,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;
};
