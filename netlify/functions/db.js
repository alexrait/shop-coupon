import { neon } from '@netlify/neon';

export const getDb = () => {
  try {
    return neon();
  } catch (e) {
    console.error("Neon connection failed. Is DATABASE_URL set in Netlify Environment Variables?");
    throw new Error("Database connection failed. Please ensure the Neon integration is configured in Netlify.");
  }
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
