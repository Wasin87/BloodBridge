import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuthStore } from '../store/authStore';
import { upsertDonorProfile } from '../lib/db';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Loader2, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export default function BecomeDonor() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  
  const { register, handleSubmit, formState: { errors } } = useForm();

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const res = await upsertDonorProfile(data, user);

      if (res.error) throw res.error;
      
      setSuccess(true);
      toast.success('Donor profile created successfully!');
      
      setTimeout(() => {
        navigate('/donors');
      }, 2000);
      
    } catch (error) {
      toast.error(error.message || 'Failed to create profile');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-6">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", bounce: 0.5 }}
        >
          <CheckCircle2 className="h-24 w-24 text-primary" />
        </motion.div>
        <h2 className="text-3xl font-bold">Profile Created!</h2>
        <p className="text-muted-foreground text-center max-w-md">
          Thank you for joining the BloodBridge network. You are now visible to those who need blood in your area.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Become a Blood Donor</h1>
          <p className="text-muted-foreground">Join Bangladesh's emergency blood donor network and help save lives across all districts.</p>
        </div>
      </div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <Card>
          <form onSubmit={handleSubmit(onSubmit)}>
            <CardContent className="space-y-6 pt-6">
              
              <div className="grid md:grid-cols-2 gap-6">
                {/* Blood Group */}
                <div className="space-y-2">
                  <Label htmlFor="bloodGroup">Blood Group <span className="text-destructive">*</span></Label>
                  <select
                    id="bloodGroup"
                    {...register('bloodGroup', { required: 'Blood group is required' })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <option value="">Select Blood Group</option>
                    {BLOOD_GROUPS.map(bg => (
                      <option key={bg} value={bg}>{bg}</option>
                    ))}
                  </select>
                  {errors.bloodGroup && <span className="text-xs text-destructive">{errors.bloodGroup.message}</span>}
                </div>

                {/* Phone */}
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number <span className="text-destructive">*</span></Label>
                  <Input 
                    id="phone" 
                    placeholder="+880 1..." 
                    {...register('phone', { required: 'Phone is required' })} 
                  />
                  {errors.phone && <span className="text-xs text-destructive">{errors.phone.message}</span>}
                </div>

                {/* Gender */}
                <div className="space-y-2">
                  <Label htmlFor="gender">Gender <span className="text-destructive">*</span></Label>
                  <select
                    id="gender"
                    {...register('gender', { required: 'Gender is required' })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <option value="">Select Gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                {/* Date of Birth */}
                <div className="space-y-2">
                  <Label htmlFor="dob">Date of Birth <span className="text-destructive">*</span></Label>
                  <Input 
                    id="dob" 
                    type="date"
                    {...register('dob', { required: 'DOB is required' })} 
                  />
                </div>

                {/* University / Institution (Optional) */}
                <div className="space-y-2">
                  <Label htmlFor="university">
                    University / Institution <span className="text-muted-foreground text-xs font-normal">(Optional)</span>
                  </Label>
                  <Input 
                    id="university" 
                    placeholder="e.g. Dhaka University, College, Workplace, or N/A" 
                    {...register('university')} 
                  />
                </div>

                {/* Department / Profession (Optional) */}
                <div className="space-y-2">
                  <Label htmlFor="department">
                    Department / Profession <span className="text-muted-foreground text-xs font-normal">(Optional)</span>
                  </Label>
                  <Input 
                    id="department" 
                    placeholder="e.g. Computer Science, Service, Business, or N/A" 
                    {...register('department')} 
                  />
                </div>

                {/* District */}
                <div className="space-y-2">
                  <Label htmlFor="district">District <span className="text-destructive">*</span></Label>
                  <Input 
                    id="district" 
                    placeholder="e.g. Dhaka" 
                    {...register('district', { required: 'District is required' })} 
                  />
                </div>

                {/* Upazila */}
                <div className="space-y-2">
                  <Label htmlFor="upazila">Upazila/Thana <span className="text-destructive">*</span></Label>
                  <Input 
                    id="upazila" 
                    {...register('upazila', { required: 'Upazila is required' })} 
                  />
                </div>

                {/* Area */}
                <div className="space-y-2">
                  <Label htmlFor="area">Specific Area</Label>
                  <Input 
                    id="area" 
                    placeholder="e.g. Mirpur 10" 
                    {...register('area')} 
                  />
                </div>

                {/* Weight */}
                <div className="space-y-2">
                  <Label htmlFor="weight">Weight (kg) <span className="text-destructive">*</span></Label>
                  <Input 
                    id="weight" 
                    type="number" 
                    {...register('weight', { required: 'Weight is required', min: 45 })} 
                  />
                </div>

                {/* Emergency Contact */}
                <div className="space-y-2">
                  <Label htmlFor="emergencyContact">Emergency Contact <span className="text-destructive">*</span></Label>
                  <Input 
                    id="emergencyContact" 
                    {...register('emergencyContact', { required: 'Emergency Contact is required' })} 
                  />
                </div>

                {/* Last Donation Date */}
                <div className="space-y-2">
                  <Label htmlFor="lastDonation">Last Donation Date (Optional)</Label>
                  <Input 
                    id="lastDonation" 
                    type="date"
                    {...register('lastDonation')} 
                  />
                </div>
              </div>

              {/* Medical Notes */}
              <div className="space-y-2">
                <Label htmlFor="medicalNotes">Medical Notes (Optional)</Label>
                <textarea
                  id="medicalNotes"
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  placeholder="Any previous medical history or current medications..."
                  {...register('medicalNotes')}
                />
              </div>

            </CardContent>
            <CardFooter className="flex justify-end gap-4 border-t pt-6 bg-muted/20">
              <Button type="button" variant="outline" onClick={() => navigate(-1)}>Cancel</Button>
              <Button type="submit" disabled={loading} className="min-w-[120px]">
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Register'}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </motion.div>
    </div>
  );
}
