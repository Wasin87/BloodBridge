import { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '../store/authStore';
import { fetchUserNotifications, fetchDonationHistory, fetchMyDonorProfile, updateDonorAvailability } from '../lib/db';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { BadgeCheck, Heart, FileText, Sparkles, CheckCircle2, Megaphone, Loader2, Camera, Upload, Image as ImageIcon, Check, Edit, Phone, MapPin, GraduationCap, Bell, MessageSquare, Mail } from 'lucide-react';
import EditDonorModal from '../components/EditDonorModal';
import { toast } from 'sonner';

export default function Profile() {
  const { user, profile, updateAvatarUrl, updateProfileName } = useAuthStore();
  const [donorProfile, setDonorProfile] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [history, setHistory] = useState([]);
  const [isAvailable, setIsAvailable] = useState(true);
  const [activeTab, setActiveTab] = useState('Overview');
  const [loading, setLoading] = useState(true);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [customImageUrl, setCustomImageUrl] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');
  const fileInputRef = useRef(null);

  const presetAvatars = [
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
    'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=300&q=80',
    'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=300&q=80',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80',
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=300&q=80',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80',
  ];

  useEffect(() => {
    if (user) {
      fetchDonorProfile();
      fetchUserData();
    }
  }, [user]);

  const fetchUserData = async () => {
    if (!user) return;
    const notifs = await fetchUserNotifications(user.id);
    if (notifs.data) setNotifications(notifs.data);

    const hist = await fetchDonationHistory(user.id);
    if (hist.data) setHistory(hist.data);
  };

  const fetchDonorProfile = async () => {
    try {
      const { data, error } = await fetchMyDonorProfile(user.id);
      
      if (!error && data) {
        setDonorProfile(data);
        setIsAvailable(data.is_available !== false);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const toggleAvailability = async () => {
    const newStatus = !isAvailable;
    setIsAvailable(newStatus);
    toast.success(`Availability toggled to ${newStatus ? 'Available to Donate' : 'Unavailable'}`);

    if (donorProfile) {
      try {
        await updateDonorAvailability(donorProfile.id, user.id, newStatus);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const compressImageFile = (file, maxWidth = 500, quality = 0.85) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }
          } else {
            if (height > maxWidth) {
              width = Math.round((width * maxWidth) / height);
              height = maxWidth;
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
            resolve(compressedDataUrl);
          } else {
            resolve(e.target?.result);
          }
        };
        img.onerror = (err) => reject(err);
        img.src = e.target?.result;
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image size should be less than 10MB');
      return;
    }

    const toastId = toast.loading('Uploading and processing profile photo...');

    try {
      const compressedBase64 = await compressImageFile(file, 500, 0.85);
      const res = await updateAvatarUrl(compressedBase64);
      toast.dismiss(toastId);

      if (res.success) {
        toast.success('Profile photo updated successfully!');
        setShowAvatarPicker(false);
        fetchDonorProfile();
      } else {
        toast.error(res.error || 'Failed to update profile photo');
      }
    } catch (err) {
      toast.dismiss(toastId);
      console.error('Error uploading avatar:', err);
      toast.error('Could not process photo. Please try another image.');
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSelectPreset = async (url) => {
    const toastId = toast.loading('Updating profile picture...');
    const res = await updateAvatarUrl(url);
    toast.dismiss(toastId);
    if (res.success) {
      toast.success('Profile picture updated!');
      setShowAvatarPicker(false);
      fetchDonorProfile();
    } else {
      toast.error(res.error || 'Failed to update profile picture');
    }
  };

  const handleApplyCustomUrl = async () => {
    if (!customImageUrl.trim()) {
      toast.error('Please enter an image URL');
      return;
    }
    const toastId = toast.loading('Updating profile picture...');
    const res = await updateAvatarUrl(customImageUrl.trim());
    toast.dismiss(toastId);
    if (res.success) {
      toast.success('Profile image updated from URL!');
      setCustomImageUrl('');
      setShowAvatarPicker(false);
      fetchDonorProfile();
    } else {
      toast.error(res.error || 'Failed to update profile picture');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const savedName = user?.id ? localStorage.getItem(`user_name_${user.id}`) : null;
  const rawName = (profile?.full_name && profile.full_name !== 'User')
    ? profile.full_name
    : (user?.user_metadata?.full_name || user?.user_metadata?.name || savedName || (user?.email ? user.email.split('@')[0] : 'Campus Donor'));
  const name = rawName ? (rawName.charAt(0).toUpperCase() + rawName.slice(1)) : 'Campus Donor';
  const campus = donorProfile?.university || 'Heritage University • Student';
  const bloodType = donorProfile?.blood_group || 'O+';
  const savedAvatar = user?.id ? localStorage.getItem(`user_avatar_${user.id}`) : null;
  const currentAvatar = profile?.avatar_url || user?.avatar_url || savedAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80';

  const handleSaveName = async () => {
    if (!editedName.trim()) return;
    await updateProfileName(editedName.trim());
    toast.success('Name updated successfully!');
    setIsEditingName(false);
  };

  return (
    <div className="space-y-6 pb-12 max-w-2xl mx-auto">
      {/* Hidden File Input */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileUpload} 
        accept="image/*" 
        className="hidden" 
      />

      {/* Top Profile Card matching Image 4 */}
      <Card className="rounded-3xl border-border bg-card/90 p-6 shadow-2xl relative overflow-hidden">
        <CardContent className="p-0 space-y-6">
          <div className="flex items-start justify-between">
            {/* Avatar with Camera Change Overlay */}
            <div className="relative group">
              <div className="h-20 w-20 rounded-full border-2 border-emerald-400 ring-4 ring-emerald-400/20 overflow-hidden relative bg-muted">
                <img 
                  src={currentAvatar} 
                  alt={name}
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    e.currentTarget.src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80';
                  }}
                />
                <button
                  onClick={() => setShowAvatarPicker(!showAvatarPicker)}
                  className="absolute inset-0 bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-[10px] font-bold cursor-pointer"
                  title="Change Profile Picture"
                >
                  <Camera className="h-5 w-5 mb-0.5" />
                  <span>Change</span>
                </button>
              </div>

              <button
                onClick={() => setShowAvatarPicker(!showAvatarPicker)}
                className="absolute bottom-0 right-0 h-7 w-7 rounded-full bg-primary text-primary-foreground border-2 border-background flex items-center justify-center shadow-lg hover:scale-110 transition-transform cursor-pointer"
                title="Upload Photo"
              >
                <Camera className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="rounded-2xl border border-primary/30 bg-primary/10 px-3.5 py-1.5 text-center">
              <div className="text-base font-black text-primary">{bloodType}</div>
              <div className="text-[9px] uppercase font-bold tracking-wider text-primary/80">TYPE</div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div>
                {isEditingName ? (
                  <div className="flex items-center gap-2 mt-1">
                    <Input 
                      value={editedName}
                      onChange={(e) => setEditedName(e.target.value)}
                      placeholder="Enter your full name"
                      className="h-9 text-sm font-bold rounded-xl bg-background border-primary max-w-[200px]"
                      autoFocus
                    />
                    <Button 
                      size="sm" 
                      onClick={handleSaveName}
                      className="h-9 px-3 rounded-xl bg-primary text-primary-foreground font-bold text-xs"
                    >
                      Save
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => setIsEditingName(false)}
                      className="h-9 px-2 text-xs"
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-black text-foreground tracking-tight">{name}</h1>
                    <button 
                      onClick={() => {
                        setEditedName(name);
                        setIsEditingName(true);
                      }}
                      className="p-1 rounded-lg text-muted-foreground hover:text-primary hover:bg-secondary transition-colors"
                      title="Edit Profile Name"
                    >
                      <Edit size={14} />
                    </button>
                    <BadgeCheck className="h-5 w-5 text-emerald-400 fill-emerald-400/20 shrink-0" />
                  </div>
                )}
                <p className="text-xs text-muted-foreground font-medium flex items-center gap-1 mt-0.5">
                  📍 {campus}
                </p>
              </div>

              {/* Edit Donor Card Button */}
              <Button
                onClick={() => setShowEditModal(true)}
                variant="outline"
                className="rounded-2xl border-primary/30 bg-primary/5 hover:bg-primary/10 text-primary font-bold text-xs h-9 px-3.5 gap-1.5 shadow-sm"
              >
                <Edit size={14} /> Edit Donor Card
              </Button>
            </div>

            {/* Additional details badges if donor Profile exists */}
            {donorProfile && (
              <div className="flex flex-wrap gap-2 pt-1 text-[11px] text-muted-foreground">
                <span className="px-2.5 py-1 rounded-xl bg-secondary/80 border border-border flex items-center gap-1 font-semibold text-foreground">
                  <Phone size={12} className="text-primary" /> {donorProfile.phone || 'Phone Added'}
                </span>
                <span className="px-2.5 py-1 rounded-xl bg-secondary/80 border border-border flex items-center gap-1 font-semibold text-foreground">
                  <MapPin size={12} className="text-emerald-400" /> {donorProfile.district || 'Location Set'}
                </span>
                {donorProfile.department && (
                  <span className="px-2.5 py-1 rounded-xl bg-secondary/80 border border-border flex items-center gap-1 font-semibold text-foreground">
                    <GraduationCap size={12} className="text-amber-400" /> {donorProfile.department}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Profile Photo Quick Action Panel */}
          {showAvatarPicker && (
            <div className="p-4 rounded-2xl bg-secondary/70 border border-border space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <ImageIcon size={14} className="text-primary" /> Select or Upload Profile Image
                </span>
                <button 
                  onClick={() => setShowAvatarPicker(false)}
                  className="text-xs text-muted-foreground hover:text-foreground font-semibold"
                >
                  Close
                </button>
              </div>

              {/* Upload from Device button */}
              <Button 
                onClick={() => fileInputRef.current?.click()}
                className="w-full rounded-xl bg-primary text-primary-foreground font-bold text-xs h-10 gap-2 shadow-md"
              >
                <Upload size={14} /> Upload Photo from Device
              </Button>

              <div className="text-center text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                OR Choose an Avatar Preset
              </div>

              {/* Preset Avatar Grid */}
              <div className="grid grid-cols-6 gap-2">
                {presetAvatars.map((url, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSelectPreset(url)}
                    className={`h-10 w-10 rounded-full overflow-hidden border-2 transition-all ${
                      currentAvatar === url ? 'border-primary ring-2 ring-primary/40 scale-105' : 'border-transparent hover:border-border'
                    }`}
                  >
                    <img src={url} alt={`Preset ${idx}`} className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>

              {/* Custom Image URL Input */}
              <div className="flex gap-2 pt-1">
                <Input
                  placeholder="Paste Image URL..."
                  value={customImageUrl}
                  onChange={(e) => setCustomImageUrl(e.target.value)}
                  className="h-9 text-xs rounded-xl bg-card border-border"
                />
                <Button 
                  onClick={handleApplyCustomUrl}
                  size="sm"
                  className="rounded-xl text-xs font-bold h-9 px-3 shrink-0"
                >
                  Set URL
                </Button>
              </div>
            </div>
          )}

          {/* Toggle Availability Switch */}
          <div className="flex items-center justify-between pt-2 border-t border-border/50">
            <span className="text-xs font-semibold text-foreground">Available to Donate</span>
            <div 
              onClick={toggleAvailability}
              className={`w-12 h-6 rounded-full p-0.5 cursor-pointer select-none transition-colors ${
                isAvailable ? 'bg-emerald-500' : 'bg-muted'
              }`}
            >
              <div className={`w-5 h-5 rounded-full bg-white shadow-md transition-transform ${isAvailable ? 'translate-x-6' : 'translate-x-0'}`} />
            </div>
          </div>

          {/* Profile Completion Bar */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
              <span>Profile Completion</span>
              <span className="font-bold text-foreground">95%</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
              <div className="h-full rounded-full bg-primary w-[95%]" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stat Cards Row */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="rounded-2xl border-border bg-card/80 p-4 text-left shadow-md">
          <div className="h-8 w-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-2">
            <Heart size={16} />
          </div>
          <div className="text-xs font-medium text-muted-foreground">Donations</div>
          <div className="text-2xl font-black text-foreground mt-0.5">12</div>
        </Card>

        <Card className="rounded-2xl border-border bg-card/80 p-4 text-left shadow-md">
          <div className="h-8 w-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-2">
            <FileText size={16} />
          </div>
          <div className="text-xs font-medium text-muted-foreground">Requests</div>
          <div className="text-2xl font-black text-foreground mt-0.5">03</div>
        </Card>

        <Card className="rounded-2xl border-border bg-card/80 p-4 text-left shadow-md">
          <div className="h-8 w-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-2">
            <Sparkles size={16} />
          </div>
          <div className="text-xs font-medium text-muted-foreground">Lives Saved</div>
          <div className="text-2xl font-black text-foreground mt-0.5">36</div>
        </Card>
      </div>

      {/* Notifications / Donor Match Alerts */}
      {notifications.length > 0 && (
        <div className="space-y-3 pt-2">
          <h3 className="font-bold text-sm uppercase tracking-wider text-primary flex items-center gap-1.5">
            <Bell size={16} /> Live Donor Matches & Notifications ({notifications.length})
          </h3>
          <div className="space-y-3">
            {notifications.map((notif) => (
              <Card key={notif.id} className="rounded-3xl border-2 border-emerald-500/40 bg-card p-5 shadow-xl space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full overflow-hidden border-2 border-emerald-400 ring-2 ring-emerald-400/20 shrink-0">
                      <img 
                        src={notif.donor_info?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'} 
                        alt={notif.donor_info?.name} 
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div>
                      <h4 className="font-black text-foreground text-sm">{notif.title}</h4>
                      <p className="text-xs text-muted-foreground mt-0.5">{notif.message}</p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-400 font-bold text-[10px] uppercase shrink-0">
                    MATCHED
                  </span>
                </div>

                {notif.donor_info && (
                  <div className="p-3 rounded-2xl bg-secondary/60 border border-border/80 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground text-[10px] block">Donor Name:</span>
                      <span className="font-bold text-foreground">{notif.donor_info.name}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-[10px] block">Blood Group:</span>
                      <span className="font-black text-primary">{notif.donor_info.blood_group}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-[10px] block">Phone:</span>
                      <span className="font-bold text-foreground">{notif.donor_info.phone || 'Provided'}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-[10px] block">University:</span>
                      <span className="font-bold text-foreground">{notif.donor_info.university}</span>
                    </div>
                  </div>
                )}

                {/* Direct Action buttons for Receiver */}
                {notif.donor_info?.phone && (
                  <div className="grid grid-cols-3 gap-2 pt-1">
                    <a 
                      href={`tel:${notif.donor_info.phone.replace(/[^0-9]/g, '')}`}
                      className="flex items-center justify-center gap-1 p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 font-bold text-xs border border-emerald-500/30 hover:bg-emerald-500/20"
                    >
                      <Phone size={14} /> Call
                    </a>
                    <a 
                      href={`https://wa.me/88${notif.donor_info.phone.replace(/[^0-9]/g, '')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-center gap-1 p-2.5 rounded-xl bg-emerald-600/10 text-emerald-500 font-bold text-xs border border-emerald-600/30 hover:bg-emerald-600/20"
                    >
                      <MessageSquare size={14} /> WhatsApp
                    </a>
                    {notif.donor_info.email && (
                      <a 
                        href={`mailto:${notif.donor_info.email}`}
                        className="flex items-center justify-center gap-1 p-2.5 rounded-xl bg-sky-500/10 text-sky-400 font-bold text-xs border border-sky-500/30 hover:bg-sky-500/20"
                      >
                        <Mail size={14} /> Email
                      </a>
                    )}
                  </div>
                )}
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Profile Navigation Tabs */}
      <div className="flex items-center border-b border-border/80">
        {['Overview', 'History & Badges', 'My Requests'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`py-2.5 px-4 text-xs font-bold transition-all relative ${
              activeTab === tab 
                ? 'text-foreground' 
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab}
            {activeTab === tab && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* Tab Contents */}
      {activeTab === 'History & Badges' ? (
        <div className="space-y-3 pt-1">
          <h3 className="font-bold text-lg text-foreground tracking-tight">Donation History</h3>
          {history.length === 0 ? (
            <p className="text-xs text-muted-foreground p-4 bg-secondary/40 rounded-2xl border border-border">
              No completed donations logged yet. Complete requests to record history!
            </p>
          ) : (
            <div className="space-y-3">
              {history.map((don) => (
                <Card key={don.id} className="rounded-2xl border border-border bg-card p-4 shadow-md space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-xs">
                        {don.blood_group}
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-foreground">Blood Donation Completed</h4>
                        <p className="text-xs text-muted-foreground">Patient: {don.patient_name} • {don.hospital}</p>
                      </div>
                    </div>
                    <span className="text-[10px] text-muted-foreground">{new Date(don.completed_at).toLocaleDateString()}</span>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      ) : activeTab === 'My Requests' ? (
        <div className="space-y-3 pt-1">
          <h3 className="font-bold text-lg text-foreground tracking-tight">Your Posted Requests</h3>
          <p className="text-xs text-muted-foreground">Manage emergency requests you have published as a Receiver.</p>
        </div>
      ) : (
        /* Activity Timeline Section */
        <div className="space-y-3 pt-1">
          <h3 className="font-bold text-lg text-foreground tracking-tight">Recent Activity</h3>

          <div className="space-y-3">
            {/* Card 1 */}
            <Card className="rounded-2xl border border-border border-l-4 border-l-emerald-400 bg-card p-4 shadow-md space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                    <CheckCircle2 size={14} />
                  </div>
                  <h4 className="font-bold text-sm text-foreground">Donation Account Verified</h4>
                </div>
                <span className="text-[10px] text-muted-foreground">Today</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed pl-9">
                Your single unified account is active for both Donor and Receiver blood requests.
              </p>
            </Card>

            {/* Card 2 */}
            <Card className="rounded-2xl border border-border border-l-4 border-l-primary bg-card p-4 shadow-md space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                    <Megaphone size={14} />
                  </div>
                  <h4 className="font-bold text-sm text-foreground">Donor Profile Synced</h4>
                </div>
                <span className="text-[10px] text-muted-foreground">Active</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed pl-9">
                {donorProfile ? `Registered blood group: ${donorProfile.blood_group} (${donorProfile.district || 'Location set'})` : 'Become a donor anytime from the dashboard buttons.'}
              </p>
            </Card>
          </div>
        </div>
      )}

      {/* Edit Donor Card Modal */}
      <EditDonorModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        initialData={donorProfile}
        user={user}
        onSuccess={(updated) => {
          setDonorProfile(prev => ({ ...prev, ...updated }));
          fetchDonorProfile();
        }}
      />
    </div>
  );
}
