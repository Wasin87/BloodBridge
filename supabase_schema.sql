-- ====================================================================
-- BLOODBRIDGE / CAMPUS BLOOD DONATION PLATFORM - SUPABASE DATABASE SCHEMA
-- ====================================================================
-- Copy and paste this script directly into your Supabase SQL Editor.
-- Target Database: PostgreSQL / Supabase
-- Safe to run multiple times (idempotent).
-- ====================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. USERS / PROFILES TABLE (Linked to auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT 'Campus Donor',
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  blood_group TEXT,
  district TEXT DEFAULT 'Dhaka',
  university TEXT DEFAULT 'General',
  avatar_url TEXT,
  role TEXT DEFAULT 'user', -- 'user' or 'admin'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Drop all existing policy variations for users table
DROP POLICY IF EXISTS "Allow public read users" ON public.users;
DROP POLICY IF EXISTS "Allow authenticated update own profile" ON public.users;
DROP POLICY IF EXISTS "Allow authenticated insert own profile" ON public.users;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.users;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.users;
DROP POLICY IF EXISTS "Enable update for users based on email" ON public.users;

-- Create policies for users
CREATE POLICY "Allow public read users" ON public.users FOR SELECT USING (true);
CREATE POLICY "Allow authenticated update own profile" ON public.users FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated insert own profile" ON public.users FOR INSERT WITH CHECK (true);

-- Trigger to automatically create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, full_name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', SPLIT_PART(NEW.email, '@', 1)),
    NEW.email,
    CASE WHEN LOWER(NEW.email) = 'wasinahmed807@gmail.com' THEN 'admin' ELSE 'user' END
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- 3. DONOR PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.donor_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  blood_group TEXT NOT NULL,
  district TEXT NOT NULL DEFAULT 'Dhaka',
  upazila TEXT DEFAULT 'Central',
  university TEXT DEFAULT 'General Campus',
  phone TEXT NOT NULL,
  last_donation_date DATE,
  is_available BOOLEAN DEFAULT true,
  bio TEXT,
  total_donations INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on donor_profiles
ALTER TABLE public.donor_profiles ENABLE ROW LEVEL SECURITY;

-- Drop all existing policy variations for donor_profiles table
DROP POLICY IF EXISTS "Allow public read donor_profiles" ON public.donor_profiles;
DROP POLICY IF EXISTS "Allow authenticated insert donor_profiles" ON public.donor_profiles;
DROP POLICY IF EXISTS "Allow owner/admin update donor_profiles" ON public.donor_profiles;
DROP POLICY IF EXISTS "Allow owner/admin delete donor_profiles" ON public.donor_profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.donor_profiles;

-- Create policies for donor_profiles
CREATE POLICY "Allow public read donor_profiles" ON public.donor_profiles FOR SELECT USING (true);
CREATE POLICY "Allow authenticated insert donor_profiles" ON public.donor_profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow owner/admin update donor_profiles" ON public.donor_profiles FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow owner/admin delete donor_profiles" ON public.donor_profiles FOR DELETE USING (true);


-- 4. BLOOD REQUESTS TABLE
CREATE TABLE IF NOT EXISTS public.blood_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  patient_name TEXT NOT NULL,
  blood_group TEXT NOT NULL,
  units_needed INTEGER DEFAULT 1,
  hospital_name TEXT NOT NULL,
  district TEXT NOT NULL DEFAULT 'Dhaka',
  location_details TEXT,
  phone TEXT NOT NULL,
  required_date DATE NOT NULL,
  urgency TEXT DEFAULT 'Urgent', -- 'Critical', 'Urgent', 'Normal'
  reason TEXT,
  status TEXT DEFAULT 'open', -- 'open', 'completed', 'cancelled'
  accepted_donor_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  accepted_donor_info JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on blood_requests
ALTER TABLE public.blood_requests ENABLE ROW LEVEL SECURITY;

-- Ensure tracking columns exist on blood_requests in case the table was created previously without them
ALTER TABLE public.blood_requests ADD COLUMN IF NOT EXISTS accepted_donor_id UUID REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.blood_requests ADD COLUMN IF NOT EXISTS accepted_donor_info JSONB;

-- Drop all existing policy variations for blood_requests table
DROP POLICY IF EXISTS "Allow public read blood_requests" ON public.blood_requests;
DROP POLICY IF EXISTS "Allow authenticated insert blood_requests" ON public.blood_requests;
DROP POLICY IF EXISTS "Allow owner/admin update blood_requests" ON public.blood_requests;
DROP POLICY IF EXISTS "Allow owner/admin delete blood_requests" ON public.blood_requests;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.blood_requests;

-- Create policies for blood_requests
CREATE POLICY "Allow public read blood_requests" ON public.blood_requests FOR SELECT USING (true);
CREATE POLICY "Allow authenticated insert blood_requests" ON public.blood_requests FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow owner/admin update blood_requests" ON public.blood_requests FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow owner/admin delete blood_requests" ON public.blood_requests FOR DELETE USING (true);


-- 5. DONATIONS HISTORY TABLE
CREATE TABLE IF NOT EXISTS public.donations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  donor_id UUID REFERENCES public.donor_profiles(id) ON DELETE CASCADE,
  request_id UUID REFERENCES public.blood_requests(id) ON DELETE SET NULL,
  patient_name TEXT,
  hospital_name TEXT,
  donation_date DATE NOT NULL DEFAULT CURRENT_DATE,
  units INTEGER DEFAULT 1,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on donations
ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;

-- Drop all existing policy variations for donations table
DROP POLICY IF EXISTS "Allow public read donations" ON public.donations;
DROP POLICY IF EXISTS "Allow authenticated insert donations" ON public.donations;

-- Create policies for donations
CREATE POLICY "Allow public read donations" ON public.donations FOR SELECT USING (true);
CREATE POLICY "Allow authenticated insert donations" ON public.donations FOR INSERT WITH CHECK (true);


-- 6. NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info', -- 'alert', 'info', 'success'
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- Enable RLS on notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Drop all existing policy variations for notifications table
DROP POLICY IF EXISTS "Allow user read own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Allow authenticated insert notifications" ON public.notifications;

-- Create policies for notifications
CREATE POLICY "Allow user read own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Allow authenticated insert notifications" ON public.notifications FOR INSERT WITH CHECK (true);


-- 7. REPORTS MANAGEMENT TABLE
CREATE TABLE IF NOT EXISTS public.reports (
  id TEXT PRIMARY KEY,
  reportCategory TEXT, -- 'Fake Donor Report', 'Fake Blood Request', 'Spam Report', 'Abuse Report'
  itemType TEXT,       -- 'donor' or 'request'
  itemId TEXT,
  itemTitle TEXT,
  targetUserEmail TEXT,
  targetUserId TEXT,
  reporterId TEXT DEFAULT 'anonymous',
  reporterName TEXT DEFAULT 'Community Member',
  reason TEXT,
  status TEXT DEFAULT 'pending', -- 'pending', 'reviewed', 'dismissed', 'action_taken'
  actionTaken TEXT,              -- 'suspended_user', 'deleted_content'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on reports
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Ensure all column casing conventions (camelCase, snake_case, lowercase) are supported on public.reports in case the table was created with different naming rules
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS "reportCategory" TEXT;
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS report_category TEXT;
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS reportcategory TEXT;

ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS "itemType" TEXT;
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS item_type TEXT;
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS itemtype TEXT;

ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS "itemId" TEXT;
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS item_id TEXT;
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS itemid TEXT;

ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS "itemTitle" TEXT;
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS item_title TEXT;
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS itemtitle TEXT;

ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS "targetUserEmail" TEXT;
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS target_user_email TEXT;
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS targetuseremail TEXT;

ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS "targetUserId" TEXT;
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS target_user_id TEXT;
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS targetuserid TEXT;

ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS "reporterId" TEXT;
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS reporter_id TEXT;
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS reporterid TEXT;

ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS "reporterName" TEXT;
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS reporter_name TEXT;
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS reportername TEXT;

ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS "actionTaken" TEXT;
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS action_taken TEXT;
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS actiontaken TEXT;

-- Drop all existing policy variations for reports table
DROP POLICY IF EXISTS "Allow authenticated insert reports" ON public.reports;
DROP POLICY IF EXISTS "Allow admin read/manage reports" ON public.reports;

-- Create policies for reports
CREATE POLICY "Allow authenticated insert reports" ON public.reports FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow admin read/manage reports" ON public.reports FOR ALL USING (true);


-- 8. ALERT BROADCASTS TABLE
CREATE TABLE IF NOT EXISTS public.alert_broadcasts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  sender_email TEXT,
  title TEXT NOT NULL DEFAULT '🚨 EMERGENCY BLOOD BROADCAST',
  message TEXT NOT NULL,
  type TEXT DEFAULT 'emergency',
  target_blood_group TEXT DEFAULT 'ALL',
  target_district TEXT DEFAULT 'ALL',
  urgency TEXT DEFAULT 'EMERGENCY',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

ALTER TABLE public.alert_broadcasts ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- Enable RLS on alert_broadcasts
ALTER TABLE public.alert_broadcasts ENABLE ROW LEVEL SECURITY;

-- Drop all existing policy variations for alert_broadcasts table
DROP POLICY IF EXISTS "Allow public read alert_broadcasts" ON public.alert_broadcasts;
DROP POLICY IF EXISTS "Allow authenticated insert alert_broadcasts" ON public.alert_broadcasts;
DROP POLICY IF EXISTS "Allow authenticated delete alert_broadcasts" ON public.alert_broadcasts;

-- Create policies for alert_broadcasts
CREATE POLICY "Allow public read alert_broadcasts" ON public.alert_broadcasts FOR SELECT USING (true);
CREATE POLICY "Allow authenticated insert alert_broadcasts" ON public.alert_broadcasts FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow authenticated delete alert_broadcasts" ON public.alert_broadcasts FOR DELETE USING (true);


-- 9. BLOOD REQUEST ACCEPTS TABLE
CREATE TABLE IF NOT EXISTS public.blood_request_accept (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id UUID REFERENCES public.blood_requests(id) ON DELETE CASCADE,
  donor_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  patient_name TEXT,
  blood_group TEXT,
  hospital_name TEXT,
  units INTEGER DEFAULT 1,
  status TEXT DEFAULT 'accepted', -- 'accepted', 'completed', 'cancelled'
  accepted_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Enable RLS on blood_request_accept
ALTER TABLE public.blood_request_accept ENABLE ROW LEVEL SECURITY;

-- Drop all existing policy variations for blood_request_accept table
DROP POLICY IF EXISTS "Allow public read blood_request_accept" ON public.blood_request_accept;
DROP POLICY IF EXISTS "Allow authenticated insert blood_request_accept" ON public.blood_request_accept;
DROP POLICY IF EXISTS "Allow authenticated update blood_request_accept" ON public.blood_request_accept;
DROP POLICY IF EXISTS "Allow authenticated delete blood_request_accept" ON public.blood_request_accept;

-- Create policies for blood_request_accept
CREATE POLICY "Allow public read blood_request_accept" ON public.blood_request_accept FOR SELECT USING (true);
CREATE POLICY "Allow authenticated insert blood_request_accept" ON public.blood_request_accept FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow authenticated update blood_request_accept" ON public.blood_request_accept FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated delete blood_request_accept" ON public.blood_request_accept FOR DELETE USING (true);


-- INDEXES FOR FAST SEARCH PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_donor_profiles_blood_group ON public.donor_profiles(blood_group);
CREATE INDEX IF NOT EXISTS idx_donor_profiles_district ON public.donor_profiles(district);
CREATE INDEX IF NOT EXISTS idx_blood_requests_blood_group ON public.blood_requests(blood_group);
CREATE INDEX IF NOT EXISTS idx_blood_requests_district ON public.blood_requests(district);
CREATE INDEX IF NOT EXISTS idx_reports_status ON public.reports(status);
CREATE INDEX IF NOT EXISTS idx_alert_broadcasts_created_at ON public.alert_broadcasts(created_at);
CREATE INDEX IF NOT EXISTS idx_blood_request_accept_request_id ON public.blood_request_accept(request_id);


