-- ====================================================================
-- BLOODBRIDGE / CAMPUS BLOOD DONATION PLATFORM - SUPABASE DATABASE SCHEMA
-- ====================================================================
-- Copy and paste this script directly into your Supabase SQL Editor.
-- Target Database: PostgreSQL / Supabase
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

CREATE POLICY "Allow public read users" ON public.users FOR SELECT USING (true);
CREATE POLICY "Allow authenticated update own profile" ON public.users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Allow authenticated insert own profile" ON public.users FOR INSERT WITH CHECK (auth.uid() = id);

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

CREATE POLICY "Allow public read donor_profiles" ON public.donor_profiles FOR SELECT USING (true);
CREATE POLICY "Allow authenticated insert donor_profiles" ON public.donor_profiles FOR INSERT WITH CHECK (auth.uid() = user_id OR auth.role() = 'authenticated');
CREATE POLICY "Allow owner/admin update donor_profiles" ON public.donor_profiles FOR UPDATE USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Allow owner/admin delete donor_profiles" ON public.donor_profiles FOR DELETE USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));


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
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on blood_requests
ALTER TABLE public.blood_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read blood_requests" ON public.blood_requests FOR SELECT USING (true);
CREATE POLICY "Allow authenticated insert blood_requests" ON public.blood_requests FOR INSERT WITH CHECK (auth.role() = 'authenticated' OR user_id IS NOT NULL);
CREATE POLICY "Allow owner/admin update blood_requests" ON public.blood_requests FOR UPDATE USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Allow owner/admin delete blood_requests" ON public.blood_requests FOR DELETE USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));


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

CREATE POLICY "Allow public read donations" ON public.donations FOR SELECT USING (true);
CREATE POLICY "Allow authenticated insert donations" ON public.donations FOR INSERT WITH CHECK (auth.role() = 'authenticated');


-- 6. NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info', -- 'alert', 'info', 'success'
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow user read own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Allow authenticated insert notifications" ON public.notifications FOR INSERT WITH CHECK (auth.role() = 'authenticated');


-- 7. REPORTS MANAGEMENT TABLE
CREATE TABLE IF NOT EXISTS public.reports (
  id TEXT PRIMARY KEY,
  reportCategory TEXT NOT NULL, -- 'Fake Donor Report', 'Fake Blood Request', 'Spam Report', 'Abuse Report'
  itemType TEXT NOT NULL,       -- 'donor' or 'request'
  itemId TEXT NOT NULL,
  itemTitle TEXT NOT NULL,
  targetUserEmail TEXT,
  targetUserId TEXT,
  reporterId TEXT DEFAULT 'anonymous',
  reporterName TEXT DEFAULT 'Community Member',
  reason TEXT NOT NULL,
  status TEXT DEFAULT 'pending', -- 'pending', 'reviewed', 'dismissed', 'action_taken'
  actionTaken TEXT,              -- 'suspended_user', 'deleted_content'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on reports
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated insert reports" ON public.reports FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow admin read/manage reports" ON public.reports FOR ALL USING (true);


-- INDEXES FOR FAST SEARCH PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_donor_profiles_blood_group ON public.donor_profiles(blood_group);
CREATE INDEX IF NOT EXISTS idx_donor_profiles_district ON public.donor_profiles(district);
CREATE INDEX IF NOT EXISTS idx_blood_requests_blood_group ON public.blood_requests(blood_group);
CREATE INDEX IF NOT EXISTS idx_blood_requests_district ON public.blood_requests(district);
CREATE INDEX IF NOT EXISTS idx_reports_status ON public.reports(status);
