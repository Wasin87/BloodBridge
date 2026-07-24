import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore, checkIsAdmin } from '../store/authStore';
import { 
  fetchDonorProfiles, 
  fetchBloodRequests, 
  deleteBloodRequest, 
  updateBloodRequestStatus,
  fetchReports,
  dismissReport,
  takeReportAction,
  deleteDonorProfile,
  sendBroadcastNotification,
  fetchBroadcasts,
  deleteBroadcast
} from '../lib/db';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { 
  ShieldCheck, 
  HeartPulse, 
  Users, 
  FileSpreadsheet, 
  AlertCircle, 
  CheckCircle2, 
  Trash2, 
  Phone, 
  Search, 
  BellRing, 
  Award, 
  RefreshCw,
  Droplet,
  ShieldAlert,
  UserX,
  Eye,
  Check,
  XCircle,
  Filter,
  Database,
  Copy
} from 'lucide-react';
import { toast } from 'sonner';

export default function AdminDashboard() {
  const { user, profile } = useAuthStore();
  const navigate = useNavigate();

  const [donors, setDonors] = useState([]);
  const [requests, setRequests] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [donorSearch, setDonorSearch] = useState('');
  const [requestSearch, setRequestSearch] = useState('');
  const [reportFilterCategory, setReportFilterCategory] = useState('All');
  const [reportFilterStatus, setReportFilterStatus] = useState('All');
  const [broadcastMsg, setBroadcastMsg] = useState('');
  const [broadcastHistory, setBroadcastHistory] = useState([]);
  const [activeTab, setActiveTab] = useState('reports'); // default to Reports Management tab for high visibility
  const [selectedReportForReview, setSelectedReportForReview] = useState(null);
  const [verifiedDonorIds, setVerifiedDonorIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('admin_verified_donors') || '[]');
    } catch {
      return [];
    }
  });

  const isAdmin = checkIsAdmin(user?.email, user?.user_metadata, profile?.role);

  useEffect(() => {
    loadAdminData();
  }, []);

  const loadAdminData = async () => {
    setLoading(true);
    try {
      const [donorsRes, requestsRes, reportsRes, bcastsRes] = await Promise.all([
        fetchDonorProfiles({ limit: 100 }),
        fetchBloodRequests({ limit: 100 }),
        fetchReports(),
        fetchBroadcasts()
      ]);
      setDonors(donorsRes.data || []);
      setRequests(requestsRes.data || []);
      setReports(reportsRes.data || []);
      setBroadcastHistory(bcastsRes.data || []);
    } catch (err) {
      console.error('Error loading admin data:', err);
      toast.error('Failed to sync live data');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleVerifyDonor = (donorId) => {
    let updated;
    if (verifiedDonorIds.includes(donorId)) {
      updated = verifiedDonorIds.filter(id => id !== donorId);
      toast.info('Donor unverified');
    } else {
      updated = [...verifiedDonorIds, donorId];
      toast.success('Donor verified by Admin Wasin Ahmed!');
    }
    setVerifiedDonorIds(updated);
    localStorage.setItem('admin_verified_donors', JSON.stringify(updated));
  };

  const handleDeleteRequest = async (requestId) => {
    if (!window.confirm('Are you sure you want to delete this blood request?')) return;
    try {
      await deleteBloodRequest(requestId);
      setRequests(prev => prev.filter(r => r.id !== requestId));
      toast.success('Request deleted by Admin');
    } catch (err) {
      toast.error('Failed to delete request');
    }
  };

  const handleStatusChange = async (requestId, newStatus) => {
    try {
      await updateBloodRequestStatus(requestId, newStatus);
      setRequests(prev => prev.map(r => r.id === requestId ? { ...r, status: newStatus } : r));
      toast.success(`Request marked as ${newStatus}`);
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  // REPORT ACTIONS
  const handleDismissReport = async (reportId) => {
    try {
      await dismissReport(reportId);
      setReports(prev => prev.map(r => r.id === reportId ? { ...r, status: 'dismissed' } : r));
      toast.info('Report dismissed by Admin');
      setSelectedReportForReview(null);
    } catch (err) {
      toast.error('Failed to dismiss report');
    }
  };

  const handleSuspendUser = async (report) => {
    if (!window.confirm(`Are you sure you want to suspend user "${report.targetUserEmail || report.itemTitle}"?`)) return;
    try {
      await takeReportAction({
        reportId: report.id,
        action: 'suspended_user',
        targetUserId: report.targetUserId,
        targetUserEmail: report.targetUserEmail,
        targetItemId: report.itemId,
        itemType: report.itemType
      });
      setReports(prev => prev.map(r => r.id === report.id ? { ...r, status: 'action_taken', actionTaken: 'suspended_user' } : r));
      toast.success(`🚨 User "${report.targetUserEmail || report.itemTitle}" suspended by Admin!`);
      setSelectedReportForReview(null);
    } catch (err) {
      toast.error('Failed to suspend user');
    }
  };

  const handleDeleteReportedContent = async (report) => {
    if (!window.confirm(`Delete reported content "${report.itemTitle}" from database?`)) return;
    try {
      await takeReportAction({
        reportId: report.id,
        action: 'deleted_content',
        targetUserId: report.targetUserId,
        targetUserEmail: report.targetUserEmail,
        targetItemId: report.itemId,
        itemType: report.itemType
      });

      if (report.itemType === 'request') {
        setRequests(prev => prev.filter(r => r.id !== report.itemId));
      } else if (report.itemType === 'donor') {
        setDonors(prev => prev.filter(d => d.id !== report.itemId && d.user_id !== report.targetUserId));
      }

      setReports(prev => prev.map(r => r.id === report.id ? { ...r, status: 'action_taken', actionTaken: 'deleted_content' } : r));
      toast.success(`🚨 Content "${report.itemTitle}" deleted from database by Admin!`);
      setSelectedReportForReview(null);
    } catch (err) {
      toast.error('Failed to delete content');
    }
  };

  const handleSendBroadcast = async (e) => {
    e.preventDefault();
    if (!broadcastMsg.trim()) return;
    try {
      const res = await sendBroadcastNotification(broadcastMsg);
      if (res.data) {
        setBroadcastHistory(prev => [res.data, ...prev]);
        toast.success(`🚨 EMERGENCY BROADCAST SENT SUCCESSFULLY!`, {
          duration: 6000,
          description: `Dispatched alert: "${broadcastMsg}"`
        });
        setBroadcastMsg('');
      } else {
        toast.error('Failed to dispatch alert broadcast');
      }
    } catch (err) {
      toast.error('Broadcast error');
    }
  };

  const handleDeleteBroadcast = async (bcastId) => {
    await deleteBroadcast(bcastId);
    setBroadcastHistory(prev => prev.filter(b => b.id !== bcastId));
    toast.info('Broadcast alert removed from active history');
  };

  const filteredDonors = donors.filter(d => {
    const term = donorSearch.toLowerCase();
    const name = (d.users?.full_name || '').toLowerCase();
    const phone = (d.phone || '').toLowerCase();
    const bg = (d.blood_group || '').toLowerCase();
    const district = (d.district || '').toLowerCase();
    return name.includes(term) || phone.includes(term) || bg.includes(term) || district.includes(term);
  });

  const filteredRequests = requests.filter(r => {
    const term = requestSearch.toLowerCase();
    const patient = (r.patient_name || '').toLowerCase();
    const bg = (r.blood_group || '').toLowerCase();
    const hospital = (r.hospital_name || '').toLowerCase();
    const district = (r.district || '').toLowerCase();
    return patient.includes(term) || bg.includes(term) || hospital.includes(term) || district.includes(term);
  });

  const filteredReports = reports.filter(r => {
    if (reportFilterCategory !== 'All' && r.reportCategory !== reportFilterCategory) return false;
    if (reportFilterStatus !== 'All' && r.status !== reportFilterStatus) return false;
    return true;
  });

  const pendingReportsCount = reports.filter(r => r.status === 'pending').length;
  const criticalRequestsCount = requests.filter(r => (r.urgency || '').toLowerCase().includes('critical') || (r.blood_group || '').toUpperCase() === 'O-').length;

  const fullSupabaseSQL = `-- ====================================================================
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
  urgency TEXT DEFAULT 'Urgent',
  reason TEXT,
  status TEXT DEFAULT 'open',
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

ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read donations" ON public.donations FOR SELECT USING (true);
CREATE POLICY "Allow authenticated insert donations" ON public.donations FOR INSERT WITH CHECK (auth.role() = 'authenticated');


-- 6. NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info',
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow user read own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Allow authenticated insert notifications" ON public.notifications FOR INSERT WITH CHECK (auth.role() = 'authenticated');


-- 7. REPORTS MANAGEMENT TABLE
CREATE TABLE IF NOT EXISTS public.reports (
  id TEXT PRIMARY KEY,
  reportCategory TEXT NOT NULL,
  itemType TEXT NOT NULL,
  itemId TEXT NOT NULL,
  itemTitle TEXT NOT NULL,
  targetUserEmail TEXT,
  targetUserId TEXT,
  reporterId TEXT DEFAULT 'anonymous',
  reporterName TEXT DEFAULT 'Community Member',
  reason TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  actionTaken TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated insert reports" ON public.reports FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow admin read/manage reports" ON public.reports FOR ALL USING (true);


-- INDEXES FOR FAST SEARCH PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_donor_profiles_blood_group ON public.donor_profiles(blood_group);
CREATE INDEX IF NOT EXISTS idx_donor_profiles_district ON public.donor_profiles(district);
CREATE INDEX IF NOT EXISTS idx_blood_requests_blood_group ON public.blood_requests(blood_group);
CREATE INDEX IF NOT EXISTS idx_blood_requests_district ON public.blood_requests(district);
CREATE INDEX IF NOT EXISTS idx_reports_status ON public.reports(status);`;

  const handleCopySQL = () => {
    navigator.clipboard.writeText(fullSupabaseSQL);
    toast.success('📋 Supabase SQL Schema copied to clipboard!', {
      description: 'Paste it into Supabase SQL Editor and click RUN.'
    });
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-16">
      {/* Admin Top Banner */}
      <Card className="border-2 border-primary/40 bg-linear-to-r from-card via-card to-primary/10 shadow-2xl rounded-3xl overflow-hidden relative">
        <div className="p-6 md:p-8 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex flex-nowrap items-center gap-1.5 sm:gap-2 overflow-x-auto scrollbar-none">
                <span className="px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full bg-primary/15 text-primary border border-primary/30 text-[9px] sm:text-xs font-black uppercase tracking-wider flex items-center gap-1 shrink-0 whitespace-nowrap">
                  <ShieldCheck size={11} className="sm:size-3.5" /> Admin Authority Active
                </span>
                <span className="px-2 sm:px-2 py-0.5 sm:py-1 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-[9px] sm:text-xs font-bold flex items-center gap-1 shrink-0 whitespace-nowrap">
                  <span className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-emerald-500 animate-ping shrink-0" /> Live System Control
                </span>
              </div>
              <h1 className="text-2xl md:text-3xl font-black text-foreground tracking-tight pt-1">
                Admin Control & Reports Hub
              </h1>
              <p className="text-xs md:text-sm text-muted-foreground font-medium">
                Welcome, <span className="text-foreground font-bold">{profile?.full_name || 'Wasin Ahmed'}</span>. Full oversight on platform safety, fake user reports, donors & requests.
              </p>
            </div>

            <Button 
              onClick={loadAdminData}
              variant="outline"
              size="sm"
              className="rounded-2xl border-border bg-card font-bold text-xs gap-2 shrink-0 self-start md:self-auto h-10"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Sync Data
            </Button>
          </div>

          {/* Quick Dual Mode Action Bar */}
          <div className="pt-2 border-t border-border/60 flex flex-wrap items-center gap-3">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Dual Action Modes:</span>
            
            <Link to="/request-blood">
              <Button size="sm" className="rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs gap-1.5 shadow-md">
                <HeartPulse size={14} /> Request Blood (Receiver)
              </Button>
            </Link>

            <Link to="/become-donor">
              <Button size="sm" variant="secondary" className="rounded-2xl border border-border font-bold text-xs gap-1.5 shadow-xs">
                <Droplet size={14} className="text-primary" /> Become/Edit Donor Profile
              </Button>
            </Link>

            <Link to="/donors">
              <Button size="sm" variant="outline" className="rounded-2xl font-bold text-xs gap-1.5">
                <Users size={14} /> Donor Directory
              </Button>
            </Link>

            <Link to="/requests">
              <Button size="sm" variant="outline" className="rounded-2xl font-bold text-xs gap-1.5">
                <FileSpreadsheet size={14} /> Request Directory
              </Button>
            </Link>
          </div>
        </div>
      </Card>

      {/* KPI Stats - Single Beautiful Moderation Indicator Card */}
      <div className="max-w-md">
        <Card className={`rounded-3xl border p-5 shadow-lg space-y-1 transition-all ${
          pendingReportsCount > 0 ? 'border-rose-500/50 bg-rose-500/5' : 'border-border bg-card'
        }`}>
          <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold uppercase tracking-wider">
            <span>Pending Moderation Reports</span>
            <ShieldAlert className={`h-4 w-4 ${pendingReportsCount > 0 ? 'text-rose-500 animate-pulse' : 'text-primary'}`} />
          </div>
          <div className={`text-2xl md:text-3xl font-black ${pendingReportsCount > 0 ? 'text-rose-500' : 'text-foreground'}`}>
            {pendingReportsCount}
          </div>
          <p className="text-[11px] text-muted-foreground font-medium">Active community flags awaiting review</p>
        </Card>
      </div>

      {/* Control Tabs Navigation */}
      <div className="space-y-6">
        <div className="bg-card border border-border p-1.5 rounded-2xl flex flex-wrap gap-2 max-w-2xl">
          <button
            onClick={() => setActiveTab('reports')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl font-bold text-xs transition-all ${
              activeTab === 'reports'
                ? 'bg-rose-600 text-white shadow-md'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
            }`}
          >
            <ShieldAlert size={14} /> 🚨 Reports ({reports.length})
            {pendingReportsCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full bg-white text-rose-600 text-[10px] font-black">
                {pendingReportsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('requests')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl font-bold text-xs transition-all ${
              activeTab === 'requests'
                ? 'bg-primary text-primary-foreground shadow-md'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
            }`}
          >
            <FileSpreadsheet size={14} /> Requests ({requests.length})
          </button>

          <button
            onClick={() => setActiveTab('donors')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl font-bold text-xs transition-all ${
              activeTab === 'donors'
                ? 'bg-primary text-primary-foreground shadow-md'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
            }`}
          >
            <Users size={14} /> Donors ({donors.length})
          </button>

          <button
            onClick={() => setActiveTab('broadcast')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl font-bold text-xs transition-all ${
              activeTab === 'broadcast'
                ? 'bg-rose-600 text-white shadow-md'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
            }`}
          >
            <BellRing size={14} /> Alert Broadcast ({broadcastHistory.length})
          </button>
        </div>

        {/* TAB 0: 🚨 REPORTS MANAGEMENT */}
        {activeTab === 'reports' && (
          <Card className="rounded-3xl border-2 border-rose-500/30 bg-card p-6 shadow-xl space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-border/80">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-500 text-[10px] font-black uppercase">
                    Admin Moderation Panel
                  </span>
                  <span className="text-xs text-muted-foreground font-semibold">
                    Total Submitted: {reports.length}
                  </span>
                </div>
                <h3 className="text-xl font-black text-foreground tracking-tight pt-1">🚨 Reports Management</h3>
                <p className="text-xs text-muted-foreground">
                  Review reported fake donors, fake blood requests, spam, and abuse. Review reports, dismiss false flags, suspend bad actors, or delete offending content.
                </p>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1 bg-secondary/60 p-1 rounded-xl border border-border">
                  <Filter size={12} className="text-muted-foreground ml-1" />
                  <select
                    value={reportFilterCategory}
                    onChange={(e) => setReportFilterCategory(e.target.value)}
                    className="bg-transparent text-xs font-bold text-foreground focus:outline-hidden cursor-pointer"
                  >
                    <option value="All">All Report Types</option>
                    <option value="Fake Donor Report">Fake Donor Report</option>
                    <option value="Fake Blood Request">Fake Blood Request</option>
                    <option value="Spam Report">Spam Report</option>
                    <option value="Abuse Report">Abuse Report</option>
                  </select>
                </div>

                <div className="flex items-center gap-1 bg-secondary/60 p-1 rounded-xl border border-border">
                  <select
                    value={reportFilterStatus}
                    onChange={(e) => setReportFilterStatus(e.target.value)}
                    className="bg-transparent text-xs font-bold text-foreground focus:outline-hidden cursor-pointer"
                  >
                    <option value="All">All Statuses</option>
                    <option value="pending">Pending</option>
                    <option value="action_taken">Action Taken</option>
                    <option value="dismissed">Dismissed</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Reports List */}
            <div className="space-y-4">
              {filteredReports.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground text-xs space-y-2">
                  <ShieldCheck className="h-10 w-10 mx-auto text-emerald-500" />
                  <p className="font-bold text-foreground">No reports match the selected filters.</p>
                  <p>All clear! Community compliance is intact.</p>
                </div>
              ) : (
                filteredReports.map((rep) => {
                  const isPending = rep.status === 'pending';
                  const isDismissed = rep.status === 'dismissed';
                  const isActionTaken = rep.status === 'action_taken';

                  let badgeColor = 'bg-rose-500/15 text-rose-500 border-rose-500/30';
                  if (rep.reportCategory === 'Fake Blood Request') badgeColor = 'bg-amber-500/15 text-amber-500 border-amber-500/30';
                  if (rep.reportCategory === 'Spam Report') badgeColor = 'bg-sky-500/15 text-sky-500 border-sky-500/30';
                  if (rep.reportCategory === 'Abuse Report') badgeColor = 'bg-purple-500/15 text-purple-500 border-purple-500/30';

                  return (
                    <div 
                      key={rep.id} 
                      className={`p-5 rounded-2xl border transition-all space-y-3 ${
                        isPending 
                          ? 'bg-card border-rose-500/30 shadow-md ring-1 ring-rose-500/10' 
                          : 'bg-secondary/30 border-border opacity-85'
                      }`}
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider border ${badgeColor}`}>
                            {rep.reportCategory || 'Report'}
                          </span>
                          <span className="text-xs font-bold text-foreground">
                            Target: <span className="text-primary">{rep.itemTitle}</span>
                          </span>
                          <span className="text-[11px] text-muted-foreground font-medium">
                            ({rep.itemType === 'donor' ? 'Donor Profile' : 'Blood Request'})
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {new Date(rep.created_at).toLocaleString()}
                          </span>
                          <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-md border ${
                            isPending 
                              ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' 
                              : isDismissed 
                              ? 'bg-slate-500/10 text-slate-400 border-slate-500/20' 
                              : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                          }`}>
                            {isPending ? 'PENDING REVIEW' : isDismissed ? 'DISMISSED' : `ACTION TAKEN (${rep.actionTaken || 'DONE'})`}
                          </span>
                        </div>
                      </div>

                      {/* Reason Description Box */}
                      <div className="p-3 rounded-xl bg-secondary/60 border border-border text-xs text-foreground space-y-1">
                        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                          <span>Reported by: <strong className="text-foreground">{rep.reporterName || 'Community Member'}</strong></span>
                          {rep.targetUserEmail && <span>Target User Email: <strong className="text-foreground">{rep.targetUserEmail}</strong></span>}
                        </div>
                        <p className="leading-relaxed font-medium pt-1">
                          "{rep.reason}"
                        </p>
                      </div>

                      {/* Admin Action Bar */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-border/50">
                        <div className="text-[11px] text-muted-foreground font-medium">
                          Admin Controls:
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedReportForReview(rep)}
                            className="h-8 rounded-xl text-xs font-bold gap-1"
                          >
                            <Eye size={13} /> Review Details
                          </Button>

                          {isPending && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDismissReport(rep.id)}
                                className="h-8 rounded-xl text-xs font-bold gap-1 text-muted-foreground hover:text-foreground"
                              >
                                <XCircle size={13} /> Dismiss Report
                              </Button>

                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleSuspendUser(rep)}
                                className="h-8 rounded-xl text-xs font-bold gap-1 bg-rose-600 hover:bg-rose-700 text-white"
                              >
                                <UserX size={13} /> Suspend User
                              </Button>

                              <Button
                                size="sm"
                                onClick={() => handleDeleteReportedContent(rep)}
                                className="h-8 rounded-xl text-xs font-bold gap-1 bg-amber-600 hover:bg-amber-700 text-white"
                              >
                                <Trash2 size={13} /> Delete Content
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </Card>
        )}

        {/* TAB 1: EMERGENCY REQUESTS MANAGEMENT */}
        {activeTab === 'requests' && (
          <Card className="rounded-3xl border-border bg-card p-6 shadow-xl space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-foreground">Manage Emergency Blood Requests</h3>
                <p className="text-xs text-muted-foreground">Approve, mark fulfilled, or remove blood requests.</p>
              </div>
              <div className="relative max-w-xs w-full">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input 
                  placeholder="Search patient, blood group, hospital..." 
                  value={requestSearch}
                  onChange={(e) => setRequestSearch(e.target.value)}
                  className="pl-9 text-xs rounded-xl h-9 bg-background"
                />
              </div>
            </div>

            <div className="space-y-3">
              {filteredRequests.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground text-xs">No blood requests found.</div>
              ) : (
                filteredRequests.map((req) => {
                  const isCritical = (req.urgency || '').toLowerCase().includes('critical') || (req.blood_group || '').toUpperCase() === 'O-';
                  return (
                    <div 
                      key={req.id} 
                      className="p-4 rounded-2xl bg-secondary/40 border border-border/80 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all hover:bg-secondary/70"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm text-foreground">{req.patient_name || 'Emergency Patient'}</span>
                          <span className="bg-primary text-primary-foreground font-black text-xs px-2 py-0.5 rounded-lg">
                            {req.blood_group || 'O+'}
                          </span>
                          <span className={`text-[10px] uppercase font-bold border px-2 py-0.5 rounded-md ${
                            isCritical ? 'bg-rose-500/10 text-rose-500 border-rose-500/30' : 'bg-amber-500/10 text-amber-500 border-amber-500/30'
                          }`}>
                            {req.urgency || 'Urgent'}
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                            req.status === 'completed' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-sky-500/10 text-sky-500'
                          }`}>
                            Status: {req.status || 'open'}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          🏥 <span className="font-semibold text-foreground">{req.hospital_name || 'Hospital'}</span> • 📍 {req.district || 'Location'} • 📞 {req.phone || 'N/A'} • {req.units_needed || 1} Units
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 flex-wrap">
                        {req.status !== 'completed' && (
                          <Button 
                            size="sm"
                            onClick={() => handleStatusChange(req.id, 'completed')}
                            className="h-8 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold gap-1"
                          >
                            <CheckCircle2 size={13} /> Mark Fulfilled
                          </Button>
                        )}
                        <a href={`tel:${req.phone || '999'}`}>
                          <Button size="sm" variant="outline" className="h-8 rounded-xl text-xs font-bold gap-1">
                            <Phone size={13} /> Call
                          </Button>
                        </a>
                        <Button 
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeleteRequest(req.id)}
                          className="h-8 rounded-xl text-xs font-bold gap-1"
                        >
                          <Trash2 size={13} /> Delete
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </Card>
        )}

        {/* TAB 2: DONORS REGISTRY & VERIFICATION */}
        {activeTab === 'donors' && (
          <Card className="rounded-3xl border-border bg-card p-6 shadow-xl space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-foreground">Registered Donors Management</h3>
                <p className="text-xs text-muted-foreground">Grant Admin Verification badges and manage active donor profiles across Bangladesh.</p>
              </div>
              <div className="relative max-w-xs w-full">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input 
                  placeholder="Search donor name, district, phone..." 
                  value={donorSearch}
                  onChange={(e) => setDonorSearch(e.target.value)}
                  className="pl-9 text-xs rounded-xl h-9 bg-background"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredDonors.length === 0 ? (
                <div className="col-span-2 text-center py-10 text-muted-foreground text-xs">No donors registered yet.</div>
              ) : (
                filteredDonors.map((donor) => {
                  const isVerified = verifiedDonorIds.includes(donor.id);
                  const donorName = donor.users?.full_name || 'Registered Donor';
                  return (
                    <div 
                      key={donor.id} 
                      className="p-4 rounded-2xl bg-secondary/40 border border-border/80 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-sm text-foreground truncate">{donorName}</h4>
                          <span className="bg-primary text-primary-foreground font-black text-xs px-2 py-0.5 rounded-lg shrink-0">
                            {donor.blood_group || 'O+'}
                          </span>
                          {isVerified && (
                            <span className="flex items-center gap-1 text-[10px] font-black text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full shrink-0">
                              <ShieldCheck size={11} /> Admin Verified
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          📍 {donor.district || 'Campus'} • 🏛️ {donor.university || 'General'}
                        </p>
                        <p className="text-xs text-muted-foreground font-medium">
                          📞 {donor.phone || 'N/A'} • Status: {donor.is_available ? '🟢 Ready to Donate' : '🔴 Resting'}
                        </p>
                      </div>

                      <div className="shrink-0 space-y-2 text-right">
                        <Button 
                          size="sm"
                          variant={isVerified ? "secondary" : "default"}
                          onClick={() => handleToggleVerifyDonor(donor.id)}
                          className={`h-8 rounded-xl text-[11px] font-bold gap-1 ${
                            isVerified ? 'bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/25 border border-emerald-500/30' : 'bg-primary text-primary-foreground'
                          }`}
                        >
                          <Award size={13} /> {isVerified ? 'Verified' : 'Verify Donor'}
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </Card>
        )}

        {/* TAB 3: EMERGENCY BROADCAST ALERT */}
        {activeTab === 'broadcast' && (
          <div className="space-y-6 max-w-3xl mx-auto">
            <Card className="rounded-3xl border-2 border-rose-500/30 bg-card p-6 shadow-xl space-y-5">
              <div className="space-y-1 text-center sm:text-left">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-bold mb-1">
                  <BellRing size={13} /> Emergency Alert Dispatch System
                </div>
                <h3 className="text-xl font-black text-foreground tracking-tight">Broadcast Emergency Blood Need</h3>
                <p className="text-xs text-muted-foreground">
                  As Admin Wasin Ahmed, send an instant nationwide or regional alert to registered donors for urgent O- or rare blood group shortages.
                </p>
              </div>

              <form onSubmit={handleSendBroadcast} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-foreground">Alert Notification Message</label>
                  <textarea 
                    rows={4}
                    placeholder="e.g. URGENT: O- Negative blood urgently required at Dhaka Medical College Hospital for ICU patient. Contact: 01700000000."
                    value={broadcastMsg}
                    onChange={(e) => setBroadcastMsg(e.target.value)}
                    className="w-full p-3 text-xs rounded-2xl bg-background border border-input focus:ring-2 focus:ring-primary focus:outline-hidden"
                    required
                  />
                </div>

                <Button type="submit" className="w-full h-11 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs gap-2 shadow-lg shadow-rose-600/20">
                  <BellRing size={15} /> Dispatch Emergency Alert to Donors
                </Button>
              </form>
            </Card>

            {/* Live Broadcast History */}
            <Card className="rounded-3xl border border-border bg-card p-6 shadow-lg space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-border">
                <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <BellRing size={14} className="text-rose-500" /> Active Broadcast Alert History ({broadcastHistory.length})
                </h4>
                <span className="text-[10px] text-muted-foreground font-mono">Live Dispatched Alerts</span>
              </div>

              {broadcastHistory.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-xs">
                  <p className="font-semibold">No broadcast alerts dispatched yet.</p>
                  <p className="text-[11px] pt-1">When you dispatch an emergency message, it will be listed here dynamically.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {broadcastHistory.map((bcast) => (
                    <div key={bcast.id} className="p-4 rounded-2xl bg-rose-500/5 border border-rose-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-500 text-[9px] font-black uppercase">
                            {bcast.type || 'EMERGENCY'}
                          </span>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {new Date(bcast.created_at).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-xs font-bold text-foreground">"{bcast.message}"</p>
                      </div>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeleteBroadcast(bcast.id)}
                        className="h-8 rounded-xl text-[11px] font-bold text-rose-500 hover:bg-rose-500/10 border-rose-500/30 shrink-0 self-end sm:self-center"
                      >
                        <Trash2 size={12} /> Remove
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        )}
      </div>

      {/* Report Detailed Review Modal */}
      {selectedReportForReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="relative w-full max-w-md bg-card border border-border rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <div className="flex items-center gap-2">
                <ShieldAlert className="text-rose-500" size={20} />
                <h3 className="font-bold text-base text-foreground">Report Review # {selectedReportForReview.id}</h3>
              </div>
              <button 
                onClick={() => setSelectedReportForReview(null)}
                className="text-muted-foreground hover:text-foreground text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="p-3 rounded-2xl bg-secondary/50 border border-border space-y-1">
                <p><strong className="text-foreground">Category:</strong> {selectedReportForReview.reportCategory}</p>
                <p><strong className="text-foreground">Target Item:</strong> {selectedReportForReview.itemTitle}</p>
                <p><strong className="text-foreground">Item Type:</strong> {selectedReportForReview.itemType}</p>
                <p><strong className="text-foreground">Target User:</strong> {selectedReportForReview.targetUserEmail || 'N/A'}</p>
                <p><strong className="text-foreground">Reporter:</strong> {selectedReportForReview.reporterName}</p>
              </div>

              <div className="space-y-1 pt-1">
                <span className="font-bold text-foreground">Report Description:</span>
                <p className="p-3 rounded-2xl bg-background border border-input leading-relaxed">
                  {selectedReportForReview.reason}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDismissReport(selectedReportForReview.id)}
                className="flex-1 rounded-2xl text-xs font-bold h-10"
              >
                Dismiss
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => handleSuspendUser(selectedReportForReview)}
                className="flex-1 rounded-2xl text-xs font-bold h-10 bg-rose-600 hover:bg-rose-700"
              >
                Suspend User
              </Button>
              <Button
                size="sm"
                onClick={() => handleDeleteReportedContent(selectedReportForReview)}
                className="flex-1 rounded-2xl text-xs font-bold h-10 bg-amber-600 hover:bg-amber-700 text-white"
              >
                Delete Content
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
