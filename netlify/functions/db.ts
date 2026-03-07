import { neon } from '@neondatabase/serverless';

export const getDb = () => {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set');
  }
  return neon(process.env.DATABASE_URL);
};

export const initSchema = async () => {
  const sql = getDb();

  await sql`
    CREATE TABLE IF NOT EXISTS shopcoupon_users (
      id UUID PRIMARY KEY,
      email TEXT UNIQUE NOT NULL
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS shopcoupon_lists (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      owner_id UUID REFERENCES shopcoupon_users(id),
      name TEXT NOT NULL,
      salt TEXT NOT NULL,
      encrypted_private_key TEXT NOT NULL,
      iv TEXT NOT NULL,
      public_key TEXT NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS shopcoupon_list_members (
      list_id UUID REFERENCES shopcoupon_lists(id) ON DELETE CASCADE,
      user_id UUID REFERENCES shopcoupon_users(id) ON DELETE CASCADE,
      PRIMARY KEY (list_id, user_id)
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS shopcoupon_categories (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      list_id UUID REFERENCES shopcoupon_lists(id) ON DELETE CASCADE,
      encrypted_name TEXT NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS shopcoupon_coupons (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      list_id UUID REFERENCES shopcoupon_lists(id) ON DELETE CASCADE,
      category_id UUID REFERENCES shopcoupon_categories(id) ON DELETE SET NULL,
      encrypted_payload JSONB NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      deleted_at TIMESTAMP WITH TIME ZONE
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS shopcoupon_action_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES shopcoupon_users(id),
      list_id UUID REFERENCES shopcoupon_lists(id) ON DELETE CASCADE,
      coupon_id UUID REFERENCES shopcoupon_coupons(id) ON DELETE SET NULL,
      action_type TEXT NOT NULL,
      action_details JSONB,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;
};
