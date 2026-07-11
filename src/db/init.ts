import { pool } from "./index";

const statements = [
  // Enums — use DO block one at a time
  `DO $$ BEGIN CREATE TYPE member_status AS ENUM ('active', 'inactive', 'pending'); EXCEPTION WHEN duplicate_object THEN null; END $$`,
  `DO $$ BEGIN CREATE TYPE payment_status AS ENUM ('paid', 'pending', 'overdue'); EXCEPTION WHEN duplicate_object THEN null; END $$`,
  `DO $$ BEGIN CREATE TYPE user_role AS ENUM ('admin', 'member'); EXCEPTION WHEN duplicate_object THEN null; END $$`,

  // Tables
  `CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role user_role NOT NULL DEFAULT 'member',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
  )`,

  `CREATE TABLE IF NOT EXISTS members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id VARCHAR(20) NOT NULL UNIQUE,
    user_id UUID REFERENCES users(id),
    legal_first_name VARCHAR(100) NOT NULL,
    legal_last_name VARCHAR(100) NOT NULL,
    legal_middle_name VARCHAR(100),
    baptismal_name VARCHAR(100),
    amharic_name VARCHAR(200),
    date_of_birth VARCHAR(20),
    gender VARCHAR(20),
    photo_url TEXT,
    email VARCHAR(255),
    phone VARCHAR(30),
    alternate_phone VARCHAR(30),
    country VARCHAR(100) DEFAULT 'Ethiopia',
    region VARCHAR(100),
    zone VARCHAR(100),
    woreda VARCHAR(100),
    kebele VARCHAR(50),
    city VARCHAR(100),
    subcity VARCHAR(100),
    house_number VARCHAR(50),
    parish VARCHAR(200),
    confession_father VARCHAR(200),
    sunday_school VARCHAR(200),
    service_area VARCHAR(200),
    emergency_contact_name VARCHAR(200),
    emergency_contact_phone VARCHAR(30),
    emergency_contact_relation VARCHAR(100),
    status member_status NOT NULL DEFAULT 'pending',
    registration_date TIMESTAMP NOT NULL DEFAULT NOW(),
    member_since TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
  )`,

  `CREATE TABLE IF NOT EXISTS contributions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID NOT NULL REFERENCES members(id),
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'ETB',
    type VARCHAR(50) NOT NULL,
    description TEXT,
    payment_status payment_status NOT NULL DEFAULT 'pending',
    payment_date TIMESTAMP,
    receipt_number VARCHAR(50),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
  )`,

  `CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title_en VARCHAR(300) NOT NULL,
    title_am VARCHAR(300),
    description_en TEXT,
    description_am TEXT,
    event_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP,
    location VARCHAR(300),
    event_type VARCHAR(50),
    is_liturgical BOOLEAN DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
  )`,

  `CREATE TABLE IF NOT EXISTS announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title_en VARCHAR(300) NOT NULL,
    title_am VARCHAR(300),
    content_en TEXT,
    content_am TEXT,
    is_active BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP
  )`,

  `CREATE TABLE IF NOT EXISTS service_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID NOT NULL REFERENCES members(id),
    service_name VARCHAR(200) NOT NULL,
    service_name_am VARCHAR(200),
    service_date TIMESTAMP NOT NULL,
    officiant VARCHAR(200),
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
  )`,

  // Indexes
  `CREATE INDEX IF NOT EXISTS idx_members_status ON members(status)`,
  `CREATE INDEX IF NOT EXISTS idx_members_user_id ON members(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_contributions_member_id ON contributions(member_id)`,
  `CREATE INDEX IF NOT EXISTS idx_events_event_date ON events(event_date)`,
];

export async function initializeDatabase(): Promise<{
  success: boolean;
  message: string;
}> {
  const errors: string[] = [];
  for (const sql of statements) {
    try {
      await pool.query(sql);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("SQL error:", msg, "\nStatement:", sql.slice(0, 80));
      errors.push(msg);
    }
  }
  if (errors.length > 0) {
    return {
      success: false,
      message: `${errors.length} errors: ${errors[0]}`,
    };
  }
  return { success: true, message: "All tables created" };
}

export async function checkTablesExist(): Promise<boolean> {
  try {
    const result = await pool.query(
      `SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'users')`
    );
    return result.rows[0]?.exists === true;
  } catch {
    return false;
  }
}

export async function checkConnection(): Promise<{
  connected: boolean;
  error?: string;
}> {
  try {
    await pool.query("SELECT 1");
    return { connected: true };
  } catch (err) {
    return {
      connected: false,
      error: err instanceof Error ? err.message : "Connection failed",
    };
  }
}
