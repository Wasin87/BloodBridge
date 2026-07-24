import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from './ui/button';
import { 
  X, Phone, MessageSquare, Mail, MapPin, GraduationCap, 
  Calendar, BadgeCheck, AlertCircle, HeartHandshake, ShieldCheck, User, ShieldAlert 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import ReportModal from './ReportModal';

export default function DonorDetailsModal({ donor, isOpen, onClose }) {
  const navigate = useNavigate();
  const [reportModalOpen, setReportModalOpen] = useState(false);

  if (!isOpen || !donor) return null;

  const name = donor.users?.full_name || 'Campus Donor';
  const bloodType = donor.blood_group || 'O+';
  const isAvailable = donor.is_available !== false;
  const phone = donor.phone || donor.contact_number || donor.users?.phone || '';
  const email = donor.users?.email || '';
  const university = donor.university || 'Heritage University';
  const department = donor.department || 'Computer Science & Engineering';
  const district = donor.district || 'Dhaka';
  const upazila = donor.upazila || 'Main Campus';
  const lastDonation = donor.last_donation_date 
    ? new Date(donor.last_donation_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) 
    : 'None / 3+ Months Ago';
  const avatarUrl = donor.avatar_url || donor.users?.avatar_url || `https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80`;

  const cleanPhoneNum = (p) => p.replace(/[^0-9]/g, '');

  const handleRequest = () => {
    toast.success(`Redirecting to request blood from ${name}...`);
    onClose();
    navigate('/request-blood');
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-lg bg-card border border-border rounded-3xl p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto"
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 h-8 w-8 rounded-full bg-secondary border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          >
            <X size={16} />
          </button>

          {/* Profile Header */}
          <div className="flex items-center gap-4 border-b border-border/60 pb-4">
            <div className="relative">
              <div className={`h-16 w-16 rounded-full overflow-hidden border-2 p-0.5 ${isAvailable ? 'border-emerald-400 ring-4 ring-emerald-400/20' : 'border-muted'}`}>
                <img 
                  src={avatarUrl} 
                  alt={name}
                  className="h-full w-full object-cover rounded-full"
                  onError={(e) => {
                    e.currentTarget.src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80';
                  }}
                />
              </div>
            </div>

            <div className="space-y-1 min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <h2 className="text-xl font-black text-foreground truncate">{name}</h2>
                <BadgeCheck className="h-5 w-5 text-emerald-400 fill-emerald-400/20 shrink-0" />
              </div>

              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1 font-semibold text-foreground">
                  <MapPin size={12} className="text-primary shrink-0" /> {district}, {upazila}
                </span>
                <span>•</span>
                <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] uppercase ${
                  isAvailable ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-muted text-muted-foreground'
                }`}>
                  {isAvailable ? 'Available Now' : 'Currently Reserved'}
                </span>
              </div>
            </div>

            {/* Blood Type Display */}
            <div className="h-14 w-14 rounded-2xl bg-primary/10 border border-primary/30 flex flex-col items-center justify-center text-primary shrink-0">
              <span className="text-xl font-black leading-none">{bloodType}</span>
              <span className="text-[9px] font-bold uppercase mt-0.5">TYPE</span>
            </div>
          </div>

          {/* Academic & Campus Specs Grid */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-2xl bg-secondary/60 border border-border/80 space-y-1">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <GraduationCap size={12} className="text-primary" /> University / Dept
              </span>
              <p className="font-bold text-foreground truncate">{university}</p>
              <p className="text-[11px] text-muted-foreground truncate">{department}</p>
            </div>

            <div className="p-3 rounded-2xl bg-secondary/60 border border-border/80 space-y-1">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <Calendar size={12} className="text-amber-400" /> Last Donation
              </span>
              <p className="font-bold text-foreground">{lastDonation}</p>
              <p className="text-[11px] text-emerald-400 font-semibold">Ready to Donate</p>
            </div>
          </div>

          {/* Additional Notes / Medical Info */}
          {donor.medical_notes && (
            <div className="p-3 rounded-2xl bg-secondary/40 border border-border/60 text-xs space-y-1">
              <span className="font-bold text-foreground flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-primary" /> Preferred Times & Medical Notes
              </span>
              <p className="text-muted-foreground leading-relaxed">
                {donor.medical_notes}
              </p>
            </div>
          )}

          {/* Direct Communication Channels */}
          <div className="space-y-2 pt-1">
            <span className="text-xs font-bold text-foreground uppercase tracking-wider block">
              Direct Contact Options
            </span>

            <div className="grid grid-cols-3 gap-2.5">
              {phone ? (
                <a 
                  href={`tel:${cleanPhoneNum(phone)}`}
                  className="flex flex-col items-center justify-center p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold text-xs hover:bg-emerald-500/20 transition-all gap-1.5"
                >
                  <Phone size={18} />
                  <span>Call Phone</span>
                </a>
              ) : (
                <button disabled className="p-3 rounded-2xl bg-muted/50 text-muted-foreground font-semibold text-xs flex flex-col items-center gap-1 opacity-50">
                  <Phone size={18} />
                  <span>No Phone</span>
                </button>
              )}

              {phone ? (
                <a 
                  href={`https://wa.me/88${cleanPhoneNum(phone)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex flex-col items-center justify-center p-3 rounded-2xl bg-emerald-600/10 border border-emerald-600/30 text-emerald-500 font-bold text-xs hover:bg-emerald-600/20 transition-all gap-1.5"
                >
                  <MessageSquare size={18} />
                  <span>WhatsApp</span>
                </a>
              ) : (
                <button disabled className="p-3 rounded-2xl bg-muted/50 text-muted-foreground font-semibold text-xs flex flex-col items-center gap-1 opacity-50">
                  <MessageSquare size={18} />
                  <span>No WhatsApp</span>
                </button>
              )}

              {email ? (
                <a 
                  href={`mailto:${email}`}
                  className="flex flex-col items-center justify-center p-3 rounded-2xl bg-sky-500/10 border border-sky-500/30 text-sky-400 font-bold text-xs hover:bg-sky-500/20 transition-all gap-1.5"
                >
                  <Mail size={18} />
                  <span>Send Email</span>
                </a>
              ) : (
                <button disabled className="p-3 rounded-2xl bg-muted/50 text-muted-foreground font-semibold text-xs flex flex-col items-center gap-1 opacity-50">
                  <Mail size={18} />
                  <span>No Email</span>
                </button>
              )}
            </div>
          </div>

          {/* Bottom Action Button & Report Button */}
          <div className="space-y-2 pt-2">
            <Button
              onClick={handleRequest}
              disabled={!isAvailable}
              className="w-full rounded-2xl bg-primary text-primary-foreground font-bold h-12 text-sm shadow-xl shadow-primary/25 gap-2"
            >
              <HeartHandshake size={18} /> Request Emergency Donation
            </Button>

            <button
              onClick={() => setReportModalOpen(true)}
              className="w-full text-center text-xs text-rose-500 font-bold hover:underline flex items-center justify-center gap-1.5 py-1.5"
            >
              <ShieldAlert size={14} /> Report Fake Donor or Abuse to Admin
            </button>
          </div>

          <ReportModal
            isOpen={reportModalOpen}
            onClose={() => setReportModalOpen(false)}
            targetItem={{
              type: 'donor',
              id: donor.id,
              title: `${name} (${bloodType})`,
              targetUserId: donor.user_id,
              targetUserEmail: email
            }}
          />
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
