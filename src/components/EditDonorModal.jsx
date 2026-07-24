import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { X, Loader2, Save, Heart, ShieldCheck } from 'lucide-react';
import { upsertDonorProfile } from '../lib/db';
import { toast } from 'sonner';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export default function EditDonorModal({ isOpen, onClose, initialData, user, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    bloodGroup: 'O+',
    phone: '',
    gender: 'male',
    dob: '2000-01-01',
    university: '',
    department: '',
    district: '',
    upazila: '',
    lastDonation: '',
    isAvailable: true,
    emergencyContact: '',
    medicalNotes: ''
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        bloodGroup: initialData.blood_group || 'O+',
        phone: initialData.phone || initialData.contact_number || '',
        gender: initialData.gender || 'male',
        dob: initialData.date_of_birth || '2000-01-01',
        university: initialData.university || '',
        department: initialData.department || '',
        district: initialData.district || '',
        upazila: initialData.upazila || '',
        lastDonation: initialData.last_donation_date ? initialData.last_donation_date.split('T')[0] : '',
        isAvailable: initialData.is_available !== false,
        emergencyContact: initialData.emergency_contact || '',
        medicalNotes: initialData.medical_notes || ''
      });
    }
  }, [initialData, isOpen]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.bloodGroup || !formData.phone || !formData.district) {
      toast.error('Please fill in all required fields marked with *');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        bloodGroup: formData.bloodGroup,
        phone: formData.phone,
        gender: formData.gender,
        dob: formData.dob,
        university: formData.university,
        department: formData.department,
        district: formData.district,
        upazila: formData.upazila,
        lastDonation: formData.lastDonation,
        emergencyContact: formData.emergencyContact,
        medicalNotes: formData.medicalNotes
      };

      const res = await upsertDonorProfile(payload, user);

      if (res.error) throw res.error;

      toast.success('Donor card updated successfully!');
      if (onSuccess) onSuccess(res.data || payload);
      onClose();
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Failed to update donor card');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-xl bg-card border border-border rounded-3xl p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-center text-primary">
                <Heart size={18} />
              </div>
              <div>
                <h2 className="text-lg font-extrabold text-foreground tracking-tight">Edit Donor Card</h2>
                <p className="text-xs text-muted-foreground">Update your donor availability & contact information</p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="h-8 w-8 rounded-full bg-secondary border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div className="grid sm:grid-cols-2 gap-4">
              {/* Blood Group */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground">
                  Blood Group <span className="text-primary">*</span>
                </Label>
                <select
                  name="bloodGroup"
                  value={formData.bloodGroup}
                  onChange={handleChange}
                  className="flex h-10 w-full rounded-2xl border border-input bg-background px-3 py-2 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {BLOOD_GROUPS.map(bg => (
                    <option key={bg} value={bg}>{bg}</option>
                  ))}
                </select>
              </div>

              {/* Phone */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground">
                  Contact Phone Number <span className="text-primary">*</span>
                </Label>
                <Input
                  name="phone"
                  placeholder="+880 1700..."
                  value={formData.phone}
                  onChange={handleChange}
                  className="h-10 text-xs rounded-2xl bg-background border-input font-medium"
                />
              </div>

              {/* University */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground">
                  University / Institution <span className="text-muted-foreground font-normal">(Optional)</span>
                </Label>
                <Input
                  name="university"
                  placeholder="e.g. Dhaka University, College, or N/A"
                  value={formData.university}
                  onChange={handleChange}
                  className="h-10 text-xs rounded-2xl bg-background border-input font-medium"
                />
              </div>

              {/* Department */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground">
                  Department / Profession <span className="text-muted-foreground font-normal">(Optional)</span>
                </Label>
                <Input
                  name="department"
                  placeholder="e.g. Computer Science, Job, or N/A"
                  value={formData.department}
                  onChange={handleChange}
                  className="h-10 text-xs rounded-2xl bg-background border-input font-medium"
                />
              </div>

              {/* District */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground">
                  District / City <span className="text-primary">*</span>
                </Label>
                <Input
                  name="district"
                  placeholder="e.g. Dhaka"
                  value={formData.district}
                  onChange={handleChange}
                  className="h-10 text-xs rounded-2xl bg-background border-input font-medium"
                />
              </div>

              {/* Upazila */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground">Area / Campus Location</Label>
                <Input
                  name="upazila"
                  placeholder="e.g. Dhanmondi, Main Gate"
                  value={formData.upazila}
                  onChange={handleChange}
                  className="h-10 text-xs rounded-2xl bg-background border-input font-medium"
                />
              </div>

              {/* Last Donation Date */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground">Last Donation Date</Label>
                <Input
                  type="date"
                  name="lastDonation"
                  value={formData.lastDonation}
                  onChange={handleChange}
                  className="h-10 text-xs rounded-2xl bg-background border-input font-medium"
                />
              </div>

              {/* Emergency Contact */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground">Emergency Alt. Contact</Label>
                <Input
                  name="emergencyContact"
                  placeholder="+880 1800..."
                  value={formData.emergencyContact}
                  onChange={handleChange}
                  className="h-10 text-xs rounded-2xl bg-background border-input font-medium"
                />
              </div>
            </div>

            {/* Medical / Additional Notes */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">Medical or Preferred Times Notes</Label>
              <Input
                name="medicalNotes"
                placeholder="e.g. Available after 2 PM on weekdays..."
                value={formData.medicalNotes}
                onChange={handleChange}
                className="h-10 text-xs rounded-2xl bg-background border-input font-medium"
              />
            </div>

            {/* Actions */}
            <div className="pt-3 flex items-center justify-end gap-3 border-t border-border/60">
              <Button
                type="button"
                variant="ghost"
                onClick={onClose}
                className="rounded-2xl text-xs font-semibold h-11 px-5"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="rounded-2xl bg-primary text-primary-foreground font-bold h-11 px-6 text-xs gap-2 shadow-lg shadow-primary/20"
              >
                {loading ? (
                  <>
                    <Loader2 size={14} className="animate-spin" /> Saving...
                  </>
                ) : (
                  <>
                    <Save size={14} /> Update Donor Card
                  </>
                )}
              </Button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
