import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from './ui/button';
import { X, AlertTriangle, ShieldAlert, Send } from 'lucide-react';
import { createReport } from '../lib/db';
import { useAuthStore } from '../store/authStore';
import { toast } from 'sonner';

export default function ReportModal({ isOpen, onClose, targetItem }) {
  // targetItem object structure: { type: 'donor'|'request', id, title, targetUserId, targetUserEmail }
  const { user, profile } = useAuthStore();
  const [reportCategory, setReportCategory] = useState(
    targetItem?.type === 'donor' ? 'Fake Donor Report' : 'Fake Blood Request'
  );
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen || !targetItem) return null;

  const categories = [
    { label: 'Fake Donor Report', val: 'Fake Donor Report', desc: 'Invalid phone, fake identity, or uncooperative profile' },
    { label: 'Fake Blood Request', val: 'Fake Blood Request', desc: 'Fabricated patient details or money requested in advance' },
    { label: 'Spam Report', val: 'Spam Report', desc: 'Duplicate posts, promotional spam, or irrelevant content' },
    { label: 'Abuse Report', val: 'Abuse Report', desc: 'Offensive language, harassment, or unsafe behavior' }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reason.trim()) {
      toast.error('Please describe the reason for your report.');
      return;
    }

    setSubmitting(true);
    try {
      const reporterName = profile?.full_name || user?.user_metadata?.full_name || user?.email || 'Anonymous Donor';
      
      const res = await createReport({
        reportCategory,
        itemType: targetItem.type,
        itemId: targetItem.id,
        itemTitle: targetItem.title || 'Reported Content',
        targetUserEmail: targetItem.targetUserEmail || '',
        targetUserId: targetItem.targetUserId || '',
        reporterId: user?.id || 'guest',
        reporterName,
        reason: reason.trim()
      });

      if (res.error) throw res.error;

      toast.success('🚨 Report submitted to Admin for review', {
        description: 'Admin Wasin Ahmed will inspect this item immediately.'
      });
      setReason('');
      onClose();
    } catch (err) {
      toast.error('Failed to submit report. Please try again.');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-md bg-card border border-border rounded-3xl p-6 shadow-2xl space-y-5"
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 h-8 w-8 rounded-full bg-secondary border border-border flex items-center justify-center text-muted-foreground hover:text-foreground"
          >
            <X size={16} />
          </button>

          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-500 shrink-0">
              <ShieldAlert size={20} />
            </div>
            <div>
              <h3 className="text-base font-black text-foreground">Report Content to Admin</h3>
              <p className="text-xs text-muted-foreground truncate max-w-[260px]">
                Target: <span className="font-bold text-foreground">{targetItem.title}</span>
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 pt-1">
            {/* Category Select */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-foreground uppercase tracking-wider">
                Select Report Type
              </label>
              <div className="grid grid-cols-1 gap-2">
                {categories.map((cat) => {
                  const isSelected = reportCategory === cat.val;
                  return (
                    <div
                      key={cat.val}
                      onClick={() => setReportCategory(cat.val)}
                      className={`p-3 rounded-2xl border cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-rose-500/10 border-rose-500/40 text-foreground ring-1 ring-rose-500/30'
                          : 'bg-secondary/40 border-border text-muted-foreground hover:bg-secondary'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-foreground">{cat.label}</span>
                        {isSelected && <AlertTriangle size={14} className="text-rose-500" />}
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{cat.desc}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Detailed Reason */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Explain details / proof</label>
              <textarea
                rows={3}
                placeholder="Please describe why this profile or request is fake or violating campus policies..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full p-3 text-xs rounded-2xl bg-background border border-input focus:ring-2 focus:ring-primary focus:outline-hidden"
                required
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="flex-1 rounded-2xl text-xs font-bold h-10"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="flex-1 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold h-10 gap-1.5 shadow-md"
              >
                <Send size={14} /> Submit Report
              </Button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
