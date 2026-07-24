import { useState, useEffect } from 'react';
import { fetchDonorProfiles } from '../lib/db';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { motion } from 'framer-motion';
import { Card, CardContent } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Search, CheckCircle2, BadgeCheck, GraduationCap, Calendar, IdCard, Loader2, Phone, Edit, Eye, HeartHandshake } from 'lucide-react';
import EditDonorModal from '../components/EditDonorModal';
import DonorDetailsModal from '../components/DonorDetailsModal';
import { toast } from 'sonner';

export default function DonorDirectory() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuthStore();
  const [donors, setDonors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('All');
  const [availableOnly, setAvailableOnly] = useState(true);
  const [editingDonor, setEditingDonor] = useState(null);
  const [selectedDonorForDetails, setSelectedDonorForDetails] = useState(null);

  const bloodGroups = ['All', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

  // Handle URL search parameter ?group=A+
  useEffect(() => {
    const groupParam = searchParams.get('group');
    if (groupParam && bloodGroups.includes(groupParam)) {
      setSelectedGroup(groupParam);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [searchParams]);

  useEffect(() => {
    fetchDonors();
  }, [search, selectedGroup, availableOnly]);

  const handleGroupSelect = (bg) => {
    setSelectedGroup(bg);
    if (bg === 'All') {
      setSearchParams({});
    } else {
      setSearchParams({ group: bg });
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const fetchDonors = async () => {
    setLoading(true);
    try {
      const groupFilter = selectedGroup === 'All' ? '' : selectedGroup;
      const res = await fetchDonorProfiles({ search, bloodGroup: groupFilter });
      let list = res.data || [];
      if (availableOnly) {
        list = list.filter(d => d.is_available !== false);
      }
      setDonors(list);
    } catch (error) {
      toast.error('Failed to load donors');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestDonor = (donor) => {
    toast.success(`Contacting ${donor.users?.full_name || 'Donor'}: ${donor.phone || donor.district || ''}`);
    navigate('/request-blood');
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground" />
        <Input 
          placeholder="Search donors by name, ID, department or location..." 
          className="pl-10 h-11 rounded-2xl bg-card border-border text-foreground text-sm placeholder:text-muted-foreground/70"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Blood Group Chips Carousel */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {bloodGroups.map((bg) => {
          const isSelected = selectedGroup === bg;
          return (
            <button
              key={bg}
              onClick={() => handleGroupSelect(bg)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                isSelected
                  ? 'bg-[#FFB4A9] text-[#410002] font-bold shadow-md shadow-red-950/20'
                  : 'bg-card border border-border text-muted-foreground hover:text-foreground'
              }`}
            >
              {bg === 'All' ? 'All Groups' : bg}
            </button>
          );
        })}
      </div>

      {/* Available Only Toggle */}
      <div className="flex items-center gap-3">
        <div 
          onClick={() => setAvailableOnly(!availableOnly)}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-border bg-card cursor-pointer select-none transition-colors ${
            availableOnly ? 'border-emerald-500/30 bg-emerald-500/10' : ''
          }`}
        >
          <span className="text-xs font-medium text-foreground">Available Only</span>
          <div className={`w-8 h-4 rounded-full p-0.5 transition-colors ${availableOnly ? 'bg-emerald-500' : 'bg-muted'}`}>
            <div className={`w-3 h-3 rounded-full bg-white transition-transform ${availableOnly ? 'translate-x-4' : 'translate-x-0'}`} />
          </div>
        </div>
      </div>

      {/* Donors List */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : donors.length === 0 ? (
        <div className="text-center py-16 bg-card/50 rounded-2xl border border-dashed border-border space-y-2">
          <GraduationCap className="h-10 w-10 mx-auto text-muted-foreground" />
          <h3 className="text-base font-semibold text-foreground">No campus donors match</h3>
          <p className="text-muted-foreground text-xs">Try switching off "Available Only" or clearing filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {donors.map((donor) => {
            const isAvailable = donor.is_available !== false;
            const bloodType = donor.blood_group || 'O+';
            const isUniversal = bloodType === 'O-';
            const name = donor.users?.full_name || donor.users?.email?.split('@')[0] || 'Campus Donor';
            const studentId = donor.student_id || (donor.upazila ? `${donor.upazila}` : `DONOR-${donor.id?.substring(0, 5)}`);
            const dept = donor.university || donor.department || donor.district || 'Campus Donor';
            const lastDonated = donor.last_donation_date ? new Date(donor.last_donation_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Never Donated / New Donor';
            const isMyCard = user && (donor.user_id === user.id || donor.users?.email === user.email);

            return (
              <Card key={donor.id} className="rounded-3xl border-border bg-card/90 p-5 shadow-xl hover:border-primary/40 transition-all flex flex-col justify-between">
                <CardContent className="p-0 space-y-4">
                  {/* Top Avatar & Blood Badge */}
                  <div className="flex items-start justify-between">
                    <div className="relative">
                      <div className={`h-16 w-16 rounded-full overflow-hidden border-2 p-0.5 ${isAvailable ? 'border-emerald-400 ring-4 ring-emerald-400/20' : 'border-slate-700'}`}>
                        <img 
                          src={donor.avatar_url || donor.users?.avatar_url || `https://images.unsplash.com/photo-${1534528741775 + (donor.id?.charCodeAt(0) || 0) * 10}?auto=format&fit=crop&w=150&q=80`} 
                          alt={name}
                          className="h-full w-full object-cover rounded-full"
                          onError={(e) => {
                            e.currentTarget.src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80';
                          }}
                        />
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1.5">
                      <div className="rounded-2xl border border-border bg-secondary/80 px-3 py-1.5 text-center min-w-[90px]">
                        <div className="text-sm font-black text-foreground">{bloodType}</div>
                        <div className="text-[9px] uppercase tracking-wider font-semibold text-muted-foreground mt-0.5">
                          {isUniversal ? 'UNIVERSAL' : isAvailable ? 'AVAILABLE' : 'RESERVED'}
                        </div>
                      </div>

                      {isMyCard && (
                        <span className="px-2 py-0.5 rounded-lg bg-primary/10 border border-primary/20 text-primary font-bold text-[10px] uppercase">
                          My Profile Card
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Donor Info */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5">
                      <h3 className="font-bold text-lg text-foreground">{name}</h3>
                      <BadgeCheck className="h-4 w-4 text-emerald-400 fill-emerald-400/20" />
                    </div>

                    <div className="space-y-1 pt-1 text-xs text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <IdCard className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        <span>ID: {studentId}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <GraduationCap className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        <span>{dept}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        <span>Last Donated: {lastDonated}</span>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-2">
                    {isMyCard ? (
                      <div className="grid grid-cols-2 gap-2">
                        <Button 
                          onClick={() => setSelectedDonorForDetails(donor)}
                          variant="outline"
                          className="rounded-2xl border-border text-foreground font-semibold h-11 text-xs gap-1.5"
                        >
                          <Eye size={14} /> Preview Card
                        </Button>
                        <Button 
                          onClick={() => setEditingDonor(donor)}
                          className="rounded-2xl bg-primary text-primary-foreground font-bold h-11 text-xs gap-1.5 shadow-md"
                        >
                          <Edit size={14} /> Edit My Card
                        </Button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        <Button 
                          onClick={() => setSelectedDonorForDetails(donor)}
                          variant="outline"
                          className="rounded-2xl border-border hover:bg-secondary text-foreground font-bold h-11 text-xs gap-1.5"
                        >
                          <Eye size={14} /> View Details
                        </Button>

                        {isAvailable ? (
                          <Button 
                            onClick={() => handleRequestDonor(donor)}
                            className="rounded-2xl bg-[#FFB4A9] text-[#410002] font-bold hover:bg-[#ffa093] h-11 text-xs shadow-md gap-1"
                          >
                            <HeartHandshake size={14} /> Request
                          </Button>
                        ) : (
                          <Button 
                            disabled
                            variant="secondary"
                            className="rounded-2xl text-muted-foreground h-11 text-xs font-semibold"
                          >
                            Reserved
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Edit Donor Card Modal */}
      <EditDonorModal
        isOpen={!!editingDonor}
        onClose={() => setEditingDonor(null)}
        initialData={editingDonor}
        user={user}
        onSuccess={() => {
          fetchDonors();
        }}
      />

      {/* Donor Details Modal */}
      <DonorDetailsModal
        donor={selectedDonorForDetails}
        isOpen={!!selectedDonorForDetails}
        onClose={() => setSelectedDonorForDetails(null)}
      />
    </div>
  );
}

