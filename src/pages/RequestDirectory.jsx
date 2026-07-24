import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchBloodRequests, acceptBloodRequest, completeBloodRequest, fetchMyDonorProfile } from '../lib/db';
import { useAuthStore } from '../store/authStore';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { MapPin, AlertCircle, Phone, ArrowRight, CheckCircle2, HeartHandshake, Map, ShieldCheck, Mail, MessageSquare, X, User, Check, Eye, PlusCircle, HeartPulse, ShieldAlert } from 'lucide-react';
import ReportModal from '../components/ReportModal';
import { toast } from 'sonner';

export default function RequestDirectory() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [requests, setRequests] = useState([]);
  const [donorProfile, setDonorProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filterTag, setFilterTag] = useState('All');
  const [selectedReq, setSelectedReq] = useState(null);
  const [acceptingId, setAcceptingId] = useState(null);
  const [reportModalOpen, setReportModalOpen] = useState(false);

  const filterOptions = ['All Requests', 'O- Negative', 'Critical', 'Urgent', 'Normal'];

  useEffect(() => {
    fetchRequests();
    if (user) {
      fetchMyDonorProfile(user.id).then(res => {
        if (res.data) setDonorProfile(res.data);
      });
    }
  }, [filterTag, user]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      let bloodGroupFilter = '';
      if (filterTag === 'O- Negative') bloodGroupFilter = 'O-';
      
      const res = await fetchBloodRequests({ bloodGroup: bloodGroupFilter });
      let list = res.data || [];
      if (filterTag === 'Critical') {
        list = list.filter(r => {
          const u = (r.urgency || '').toLowerCase();
          return u.includes('critical') || u.includes('o-');
        });
      } else if (filterTag === 'Urgent') {
        list = list.filter(r => (r.urgency || '').toLowerCase() === 'urgent');
      } else if (filterTag === 'Normal') {
        list = list.filter(r => (r.urgency || '').toLowerCase() === 'normal');
      } else if (filterTag === 'O- Negative') {
        list = list.filter(r => 
          (r.blood_group || '').toUpperCase() === 'O-' || 
          (r.urgency || '').toLowerCase().includes('o-')
        );
      }
      setRequests(list);
    } catch (error) {
      toast.error('Failed to load emergency requests');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptRequest = async (req) => {
    if (!user) {
      toast.error('Please login to accept a blood request.');
      return;
    }

    if (req.user_id === user.id) {
      toast.info('This is your own blood request.');
      return;
    }

    setAcceptingId(req.id);
    try {
      const res = await acceptBloodRequest(req.id, user, donorProfile);
      if (res.error) throw res.error;

      toast.success(`Request Accepted! Requester ${req.contact_person || req.patient_name} has been notified.`);
      setSelectedReq({
        ...req,
        status: 'accepted',
        accepted_donor_id: user.id,
        accepted_donor_info: res.data?.accepted_donor_info || { name: user.email }
      });
      fetchRequests();
    } catch (err) {
      toast.error('Failed to accept request.');
      console.error(err);
    } finally {
      setAcceptingId(null);
    }
  };

  const handleCompleteRequest = async (reqId) => {
    try {
      await completeBloodRequest(reqId, user);
      toast.success('Donation marked as completed! Added to your Donation History.');
      setSelectedReq(null);
      fetchRequests();
    } catch (err) {
      toast.error('Failed to update status.');
    }
  };

  const cleanPhone = (num) => (num || '').replace(/[^0-9]/g, '');

  return (
    <div className="space-y-8 pb-12">
      {/* Header with Create Blood Request Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="text-[11px] uppercase font-bold tracking-widest text-primary">LIVE UPDATES</div>
          <h1 className="text-3xl font-black tracking-tight text-foreground">Emergency Requests</h1>
          <p className="text-sm text-muted-foreground max-w-xl leading-relaxed">
            Immediate blood requirements across campus medical facilities. Real-time urgency levels and fulfillment status.
          </p>
        </div>

        {/* Create Request CTA Button */}
        <Button
          onClick={() => navigate('/request-blood')}
          className="rounded-2xl bg-primary text-primary-foreground font-bold h-12 px-5 text-xs sm:text-sm gap-2 shadow-xl shadow-primary/25 shrink-0 self-start sm:self-center"
        >
          <HeartPulse size={18} /> Create Blood Request
        </Button>
      </div>

      {/* Filter Chips Carousel */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {filterOptions.map((opt) => {
          const isSelected = (opt === 'All Requests' && filterTag === 'All') || filterTag === opt;
          return (
            <button
              key={opt}
              onClick={() => setFilterTag(opt === 'All Requests' ? 'All' : opt)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                isSelected
                  ? 'bg-primary text-primary-foreground font-bold shadow-md shadow-primary/30'
                  : 'bg-card border border-border text-muted-foreground hover:text-foreground'
              }`}
            >
              {opt}
            </button>
          );
        })}
      </div>

      {/* Requests Cards 3-Column Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {requests.map((req, idx) => {
          const urgencyLower = (req.urgency || 'urgent').toLowerCase();
          const bloodGroupUpper = (req.blood_group || 'O+').toUpperCase();
          const isONegative = bloodGroupUpper === 'O-' || urgencyLower.includes('o-');
          const isCritical = urgencyLower.includes('critical') || isONegative;
          const isUrgent = urgencyLower === 'urgent';

          const unitsNeeded = parseInt(req.units_needed) || 1;
          const fulfilledUnits = req.status === 'accepted' || req.status === 'completed' ? unitsNeeded : 0;
          const progressPercent = Math.min(100, (fulfilledUnits / unitsNeeded) * 100);
          const patientName = req.patient_name || req.contact_person || 'Emergency Patient';
          const hospital = req.hospital_name || (req.district ? `${req.district} Medical Hospital` : 'Hospital Not Specified');
          const avatarUrl = req.avatar_url || req.users?.avatar_url || `https://images.unsplash.com/photo-${1534528741775 + (req.id?.charCodeAt(0) || 0) * 10}?auto=format&fit=crop&w=150&q=80`;

          const urgencyText = isONegative ? 'O- CRITICAL' : isCritical ? 'CRITICAL' : isUrgent ? 'URGENT' : 'NORMAL';

          return (
            <Card key={req.id} className="rounded-3xl border-border bg-card/90 p-5 shadow-xl hover:border-primary/40 transition-all flex flex-col justify-between">
              <CardContent className="p-0 space-y-4 flex-1 flex flex-col justify-between">
                {/* Header info with Circle Profile Avatar */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    <div className="h-11 w-11 rounded-full overflow-hidden border-2 border-primary/50 ring-2 ring-primary/20 shrink-0 bg-muted shadow-md">
                      <img 
                        src={avatarUrl}
                        alt={req.contact_person || patientName}
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          e.currentTarget.src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80';
                        }}
                      />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-base text-foreground tracking-tight truncate">{patientName}</h3>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5 truncate">
                        <MapPin className="h-3 w-3 text-primary shrink-0" /> {hospital}
                      </p>
                    </div>
                  </div>

                  <div className="text-right space-y-1 shrink-0">
                    <div className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      isONegative
                        ? 'bg-rose-500/15 border border-rose-500/40 text-rose-500'
                        : isCritical 
                        ? 'bg-primary/10 border border-primary/30 text-primary' 
                        : isUrgent 
                        ? 'bg-amber-500/10 border border-amber-500/30 text-amber-500' 
                        : 'bg-sky-500/10 border border-sky-500/30 text-sky-500'
                    }`}>
                      <AlertCircle size={10} /> {urgencyText}
                    </div>
                    <div className="text-xs font-bold text-foreground block">
                      <span className="text-primary font-black text-sm">{bloodGroupUpper}</span> Required
                    </div>
                  </div>
                </div>

                {/* Metrics 2 Column Box */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="rounded-2xl bg-secondary/60 border border-border/60 p-2.5">
                    <div className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">UNITS NEEDED</div>
                    <div className="text-sm font-bold text-foreground mt-0.5">{unitsNeeded} Units</div>
                  </div>
                  <div className="rounded-2xl bg-secondary/60 border border-border/60 p-2.5">
                    <div className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">LOCATION</div>
                    <div className="text-xs font-bold text-foreground mt-0.5 truncate">{req.district || 'Campus Main'}</div>
                  </div>
                </div>

                {/* Fulfillment Progress Bar */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-foreground">Fulfillment Progress</span>
                    <span className="text-primary font-bold">{fulfilledUnits}/{unitsNeeded} Units</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
                    <div 
                      className="h-full rounded-full bg-primary transition-all duration-500" 
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-2.5 pt-1 mt-auto">
                  <Button 
                    variant="outline"
                    onClick={() => setSelectedReq(req)}
                    className="rounded-2xl border-border bg-card/60 text-foreground hover:bg-secondary font-bold h-10 text-xs gap-1"
                  >
                    Details
                  </Button>
                  <Button 
                    onClick={() => handleAcceptRequest(req)}
                    className="rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90 font-bold h-10 text-xs gap-1"
                  >
                    Accept <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Details & Contact Modal */}
      <AnimatePresence>
        {selectedReq && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-lg bg-card border border-border rounded-3xl p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto"
            >
              {/* Close Button */}
              <button 
                onClick={() => setSelectedReq(null)}
                className="absolute top-4 right-4 h-8 w-8 rounded-full bg-secondary border border-border flex items-center justify-center text-muted-foreground hover:text-foreground"
              >
                <X size={16} />
              </button>

              {/* Patient Header */}
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-full overflow-hidden border-2 border-primary ring-4 ring-primary/20 shrink-0 bg-muted">
                  <img 
                    src={selectedReq.avatar_url || selectedReq.users?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'} 
                    alt={selectedReq.patient_name}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-primary font-bold text-[10px] uppercase mb-1">
                    <AlertCircle size={10} /> {selectedReq.urgency || 'URGENT'}
                  </div>
                  <h2 className="text-xl font-black text-foreground">{selectedReq.patient_name}</h2>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <MapPin size={12} className="text-primary" /> {selectedReq.hospital_name}, {selectedReq.district || 'Campus'}
                  </p>
                </div>
              </div>

              {/* Blood requirement highlight */}
              <div className="p-4 rounded-2xl bg-secondary/70 border border-border flex items-center justify-between">
                <div>
                  <div className="text-xs text-muted-foreground font-semibold">Blood Group Required</div>
                  <div className="text-2xl font-black text-primary mt-0.5">{selectedReq.blood_group || 'O+'}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-muted-foreground font-semibold">Units Needed</div>
                  <div className="text-xl font-bold text-foreground mt-0.5">{selectedReq.units_needed || 1} Bags</div>
                </div>
              </div>

              {/* Description & Date */}
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between py-1.5 border-b border-border/50">
                  <span className="text-muted-foreground font-medium">Date Needed:</span>
                  <span className="font-bold text-foreground">{new Date(selectedReq.required_date || Date.now()).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-border/50">
                  <span className="text-muted-foreground font-medium">Contact Person:</span>
                  <span className="font-bold text-foreground">{selectedReq.contact_person || 'Hospital Authority'}</span>
                </div>
                {selectedReq.description && (
                  <div className="pt-2">
                    <span className="text-muted-foreground font-medium block mb-1">Medical Description:</span>
                    <p className="p-3 rounded-xl bg-secondary/50 text-foreground leading-relaxed">
                      {selectedReq.description}
                    </p>
                  </div>
                )}
              </div>

              {/* Direct Contact Options */}
              <div className="space-y-2 pt-2">
                <div className="text-xs font-bold text-foreground uppercase tracking-wider">Direct Contact Options</div>
                <div className="grid grid-cols-3 gap-2">
                  <a 
                    href={`tel:${cleanPhone(selectedReq.contact_number || '01700000000')}`}
                    className="flex flex-col items-center justify-center p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold text-xs hover:bg-emerald-500/20 transition-all gap-1.5"
                  >
                    <Phone size={18} />
                    <span>Call Phone</span>
                  </a>

                  <a 
                    href={`https://wa.me/88${cleanPhone(selectedReq.contact_number || '01700000000')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex flex-col items-center justify-center p-3 rounded-2xl bg-emerald-600/10 border border-emerald-600/30 text-emerald-500 font-bold text-xs hover:bg-emerald-600/20 transition-all gap-1.5"
                  >
                    <MessageSquare size={18} />
                    <span>WhatsApp</span>
                  </a>

                  <a 
                    href={`mailto:${selectedReq.users?.email || 'donor@bloodbridge.org'}`}
                    className="flex flex-col items-center justify-center p-3 rounded-2xl bg-sky-500/10 border border-sky-500/30 text-sky-400 font-bold text-xs hover:bg-sky-500/20 transition-all gap-1.5"
                  >
                    <Mail size={18} />
                    <span>Send Email</span>
                  </a>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-2">
                {selectedReq.status === 'accepted' ? (
                  <div className="space-y-3 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30">
                    <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider">
                      <CheckCircle2 size={16} /> Request Matched & In Progress
                    </div>
                    {selectedReq.accepted_donor_info && (
                      <p className="text-xs text-muted-foreground">
                        Accepted by: <span className="font-bold text-foreground">{selectedReq.accepted_donor_info.name}</span> ({selectedReq.accepted_donor_info.blood_group})
                      </p>
                    )}
                    <Button 
                      onClick={() => handleCompleteRequest(selectedReq.id)}
                      className="w-full rounded-2xl bg-emerald-500 text-white font-bold h-11 text-xs gap-2 shadow-lg"
                    >
                      <Check size={16} /> Mark Donation as Completed
                    </Button>
                  </div>
                ) : selectedReq.user_id === user?.id ? (
                  <Button 
                    disabled
                    variant="secondary"
                    className="w-full rounded-2xl font-bold h-11 text-xs"
                  >
                    This is Your Request (Waiting for Donors)
                  </Button>
                ) : (
                  <Button 
                    onClick={() => handleAcceptRequest(selectedReq)}
                    disabled={acceptingId === selectedReq.id}
                    className="w-full rounded-2xl bg-primary text-primary-foreground font-bold h-12 text-sm shadow-xl shadow-primary/25 gap-2"
                  >
                    <HeartHandshake size={18} /> Accept Request & Connect
                  </Button>
                )}

                <button
                  onClick={() => setReportModalOpen(true)}
                  className="w-full text-center text-xs text-rose-500 font-bold hover:underline flex items-center justify-center gap-1.5 py-1.5"
                >
                  <ShieldAlert size={14} /> Report Fake Blood Request to Admin
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ReportModal
        isOpen={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
        targetItem={selectedReq ? {
          type: 'request',
          id: selectedReq.id,
          title: `Request for ${selectedReq.patient_name || 'Patient'} (${selectedReq.blood_group})`,
          targetUserId: selectedReq.user_id,
          targetUserEmail: selectedReq.users?.email
        } : null}
      />

      {/* Campus Impact Summary */}
      <Card className="rounded-3xl border-2 border-emerald-500/30 bg-card p-6 shadow-xl relative overflow-hidden">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <h3 className="font-bold text-lg text-foreground">Campus Impact Summary</h3>
            <p className="text-xs text-muted-foreground">Your contributions helped 12 patients this week.</p>
          </div>
          <div className="h-10 w-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <HeartHandshake className="h-5 w-5" />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 pt-6 text-left">
          <div>
            <div className="text-2xl font-black text-foreground">148</div>
            <div className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground mt-0.5">ACTIVE DONORS</div>
          </div>
          <div>
            <div className="text-2xl font-black text-primary">02</div>
            <div className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground mt-0.5">CRITICAL GAPS</div>
          </div>
          <div>
            <div className="text-2xl font-black text-emerald-400">94%</div>
            <div className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground mt-0.5">SUCCESS RATE</div>
          </div>
        </div>
      </Card>

      {/* Live Facility Map Card Preview */}
      <Card className="rounded-3xl border border-border bg-card p-5 shadow-lg flex items-center justify-between cursor-pointer hover:border-primary/40 transition-all">
        <div className="space-y-1">
          <h4 className="font-bold text-base text-foreground">Live Facility Map</h4>
          <p className="text-xs text-muted-foreground">3 centers are currently active</p>
        </div>
        <div className="h-10 w-10 rounded-2xl bg-secondary border border-border flex items-center justify-center text-foreground">
          <Map className="h-5 w-5" />
        </div>
      </Card>
    </div>
  );
}
