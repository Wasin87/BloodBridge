import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { fetchBloodRequests, fetchPlatformStats, fetchBroadcasts } from '../lib/db';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Droplet, HeartPulse, Radio, Users, HandHeart, Zap, Clock, ArrowRight, ShieldCheck, Download, AlertCircle, Phone, Sparkles, MapPin, Search, BellRing } from 'lucide-react';

export default function Dashboard() {
  const navigate = useNavigate();
  const { profile, user } = useAuthStore();
  const [recentRequests, setRecentRequests] = useState([]);
  const [broadcasts, setBroadcasts] = useState([]);
  const [stats, setStats] = useState({
    totalDonors: 0,
    totalRequests: 0,
    livesSaved: 0,
    avgResponseTime: '8 Mins'
  });

  useEffect(() => {
    const fetchActiveBroadcasts = async () => {
      const bcastsRes = await fetchBroadcasts();
      if (bcastsRes.data) {
        const now = new Date();
        const activeOnly = bcastsRes.data.filter(b => !b.expires_at || new Date(b.expires_at) > now);
        setBroadcasts(activeOnly);
      }
    };

    const loadData = async () => {
      const res = await fetchBloodRequests({});
      if (res.data) {
        setRecentRequests(res.data.slice(0, 4));
      }
      const liveStats = await fetchPlatformStats();
      setStats(liveStats);
      
      await fetchActiveBroadcasts();
    };
    loadData();

    // Auto-refresh broadcast alerts every 5 seconds for instant real-time synchronization
    const interval = setInterval(() => {
      fetchActiveBroadcasts();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const floatingBadges = [
    { text: 'O-', color: 'bg-primary text-primary-foreground border-primary/40', x: '10%', y: '15%' },
    { text: 'A+', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', x: '85%', y: '20%' },
    { text: 'B+', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30', x: '80%', y: '75%' },
    { text: 'AB+', color: 'bg-sky-500/20 text-sky-400 border-sky-500/30', x: '12%', y: '70%' },
  ];

  return (
    <div className="space-y-8 pb-12">
      {/* Live Broadcast Alerts dispatched by Administrator Wasin Ahmed */}
      <AnimatePresence>
        {broadcasts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            className="space-y-3"
          >
            {broadcasts.map((bcast) => (
              <div 
                key={bcast.id} 
                className="p-4 rounded-3xl border-2 border-rose-500 bg-rose-500/10 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 flex items-start gap-3 shadow-lg shadow-rose-500/10 relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-rose-500/[0.03] animate-pulse pointer-events-none" />
                <div className="p-2 rounded-2xl bg-rose-600 text-white shrink-0 shadow-md">
                  <BellRing size={16} className="animate-bounce" />
                </div>
                <div className="space-y-1 z-10 flex-1">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="text-[9px] font-black tracking-widest bg-rose-600 text-white px-2 py-0.5 rounded-full uppercase whitespace-nowrap shrink-0">
                      {bcast.type || 'EMERGENCY BROADCAST'}
                    </span>
                    <span className="text-[10px] text-rose-500/80 font-mono font-bold">
                      {new Date(bcast.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm font-extrabold leading-relaxed text-foreground">
                    {bcast.message}
                  </p>
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Simple Human-Centric Peer Solidarity Banner with Premium Gradient */}
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative overflow-hidden rounded-[2.5rem] border border-rose-500/15 bg-gradient-to-br from-rose-500/[0.04] via-card to-rose-500/[0.01] dark:from-rose-950/20 dark:via-card dark:to-zinc-950 p-6 sm:p-10 shadow-xl text-center"
      >
        {/* Soft Professional Ambient Decorative Glows */}
        <div className="absolute -left-24 -top-24 w-80 h-80 rounded-full bg-gradient-to-br from-primary/15 to-transparent blur-3xl pointer-events-none opacity-90" />
        <div className="absolute -right-24 -bottom-24 w-80 h-80 rounded-full bg-gradient-to-tr from-rose-500/10 to-transparent blur-3xl pointer-events-none opacity-90" />

        <div className="relative z-10 max-w-3xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-xs font-black text-primary tracking-wide">
            <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            CAMPUS BLOOD NETWORK
          </div>

          <div className="space-y-3">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-foreground leading-[1.15]">
              Save Lives by <span className="text-primary">Sharing Blood.</span>
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-2xl mx-auto font-medium">
              BloodBridge connects students, teachers, and staff with real blood donors on our campus. In an emergency, you can find help or offer help quickly and easily without any delay.
            </p>
          </div>

          {/* Core Human Actions */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Button 
              size="lg"
              onClick={() => navigate('/become-donor')}
              className="rounded-2xl bg-primary text-primary-foreground hover:bg-rose-700 font-bold shadow-lg shadow-rose-600/15 h-11 px-5 gap-2 text-xs"
            >
              <HeartPulse className="h-4 w-4" /> Become a Donor
            </Button>
            <Button 
              size="lg"
              variant="outline"
              onClick={() => navigate('/request-blood')}
              className="rounded-2xl border-border bg-card text-foreground font-bold hover:bg-secondary h-11 px-5 gap-2 text-xs shadow-sm"
            >
              <Radio className="h-4 w-4 text-primary animate-pulse" /> Need Blood SOS
            </Button>
            <Button 
              size="lg"
              variant="ghost"
              onClick={() => navigate('/donors')}
              className="rounded-2xl text-muted-foreground hover:text-foreground font-bold h-11 px-3 gap-1 text-xs"
            >
              <Search className="h-4 w-4" /> Find Donors
            </Button>
          </div>
        </div>

        {/* Dynamic Trust and Impact Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-8 pt-8 border-t border-border/60">
          <div className="p-3.5 rounded-2xl bg-secondary/30 border border-border/50 text-center space-y-0.5">
            <div className="text-2xl font-black text-foreground">{stats.totalDonors}</div>
            <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center justify-center gap-1">
              <Users size={12} className="text-primary" /> Active Donors
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-secondary/30 border border-border/50 text-center space-y-0.5">
            <div className="text-2xl font-black text-primary">{stats.totalRequests}</div>
            <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center justify-center gap-1">
              <Radio size={12} className="text-primary" /> Active Requests
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-secondary/30 border border-border/50 text-center space-y-0.5">
            <div className="text-2xl font-black text-emerald-500">{stats.livesSaved}</div>
            <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center justify-center gap-1">
              <HandHeart size={12} className="text-emerald-500" /> Lives Saved
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-secondary/30 border border-border/50 text-center space-y-0.5">
            <div className="text-2xl font-black text-amber-500">{stats.avgResponseTime}</div>
            <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center justify-center gap-1">
              <Zap size={12} className="text-amber-500" /> Avg Match Time
            </div>
          </div>
        </div>
      </motion.div>

      {/* Primary Navigation Cards */}
      <div className="grid md:grid-cols-2 gap-5">
        <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-xl hover:border-primary/40 transition-all flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="h-12 w-12 rounded-2xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center font-black text-lg">
              <Droplet className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-foreground">Become a Campus Donor</h3>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Register your blood group, set your availability, and save lives whenever emergencies arise in your university.
              </p>
            </div>
          </div>
          <Button 
            onClick={() => navigate('/become-donor')}
            className="w-full rounded-2xl bg-primary text-primary-foreground font-bold h-11 text-xs gap-2 shadow-lg"
          >
            Register Profile <ArrowRight size={14} />
          </Button>
        </div>

        <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-xl hover:border-primary/40 transition-all flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="h-12 w-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center font-black text-lg">
              <Radio className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-foreground">Request Blood Urgently</h3>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Post an urgent requirement. Nearby matching donors will receive notification alerts immediately.
              </p>
            </div>
          </div>
          <Button 
            variant="outline"
            onClick={() => navigate('/request-blood')}
            className="w-full rounded-2xl border-border bg-card text-foreground font-bold hover:bg-secondary h-11 text-xs gap-2"
          >
            Create Blood Request <ArrowRight size={14} />
          </Button>
        </div>
      </div>

      {/* Recent Urgent Requests Section with Circle Profile Avatars */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg sm:text-xl font-bold tracking-tight text-foreground">Urgent Emergency Requests</h3>
            <span className="px-2.5 py-0.5 rounded-full bg-primary text-[10px] font-black uppercase text-primary-foreground whitespace-nowrap shrink-0">
              HIGH PRIORITY
            </span>
          </div>
          <Button variant="link" onClick={() => navigate('/requests')} className="text-xs font-semibold text-primary p-0 h-auto self-start sm:self-auto">
            View All Requests
          </Button>
        </div>

        {recentRequests.length === 0 ? (
          <div className="rounded-3xl border border-border bg-card/60 p-8 text-center text-xs text-muted-foreground">
            No pending emergency blood requests right now.
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {recentRequests.map(req => {
              const avatarUrl = req.avatar_url || req.users?.avatar_url || `https://images.unsplash.com/photo-${1534528741775 + (req.id?.charCodeAt(0) || 0) * 10}?auto=format&fit=crop&w=150&q=80`;

              return (
                <Card key={req.id} className="rounded-3xl border-border bg-card/90 p-5 shadow-lg hover:border-primary/40 transition-all space-y-3">
                  <CardContent className="p-0 space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-11 w-11 rounded-full overflow-hidden border-2 border-primary/40 ring-2 ring-primary/10 shrink-0 bg-muted">
                          <img 
                            src={avatarUrl}
                            alt={req.patient_name}
                            className="h-full w-full object-cover"
                            onError={(e) => {
                              e.currentTarget.src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80';
                            }}
                          />
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-bold text-foreground text-sm truncate">{req.patient_name}</h4>
                          <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                            <MapPin size={11} className="text-primary shrink-0" /> {req.hospital_name || 'Hospital'}
                          </p>
                        </div>
                      </div>

                      <div className="h-10 w-10 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-center text-primary font-black text-sm shrink-0">
                        {req.blood_group || 'O+'}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border/50">
                      <span className="flex items-center gap-1 font-medium">
                        <Clock className="h-3.5 w-3.5" /> Needed: {new Date(req.required_date || Date.now()).toLocaleDateString()}
                      </span>
                      <span className="font-bold text-foreground">
                        {req.units_needed || 1} Bag(s) Needed
                      </span>
                    </div>

                    <Button 
                      size="sm" 
                      onClick={() => navigate('/requests')}
                      className="w-full rounded-2xl bg-primary text-primary-foreground font-bold h-10 text-xs gap-1.5 shadow-md"
                    >
                      Accept & Contact <ArrowRight size={14} />
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
