import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuthStore } from '../store/authStore';
import { createBloodRequest } from '../lib/db';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardFooter } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Loader2, ArrowLeft, HeartPulse } from 'lucide-react';
import { toast } from 'sonner';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const URGENCIES = ['Normal', 'Urgent', 'Critical', 'O- Negative'];

export default function RequestBlood() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  
  const { register, handleSubmit, formState: { errors } } = useForm();

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const res = await createBloodRequest(data, user);

      if (res.error) throw res.error;
      
      toast.success('Blood request published successfully!');
      
      navigate('/requests');
      
    } catch (error) {
      toast.error(error.message || 'Failed to publish request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Request Blood</h1>
          <p className="text-muted-foreground">Post an urgent request to find donors in your area.</p>
        </div>
      </div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="border-destructive/20 overflow-hidden">
          <div className="h-2 w-full bg-destructive"></div>
          <form onSubmit={handleSubmit(onSubmit)}>
            <CardContent className="space-y-6 pt-6">
              
              <div className="grid md:grid-cols-2 gap-6">
                {/* Patient Name */}
                <div className="space-y-2">
                  <Label htmlFor="patientName">Patient Name <span className="text-destructive">*</span></Label>
                  <Input 
                    id="patientName" 
                    {...register('patientName', { required: 'Patient Name is required' })} 
                  />
                </div>

                {/* Blood Group */}
                <div className="space-y-2">
                  <Label htmlFor="bloodGroup">Blood Group Needed <span className="text-destructive">*</span></Label>
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
                </div>

                {/* Units Needed */}
                <div className="space-y-2">
                  <Label htmlFor="unitsNeeded">Units Needed <span className="text-destructive">*</span></Label>
                  <Input 
                    id="unitsNeeded" 
                    type="number" 
                    min="1"
                    {...register('unitsNeeded', { required: 'Units are required' })} 
                  />
                </div>

                {/* Urgency */}
                <div className="space-y-2">
                  <Label htmlFor="urgency">Urgency Level <span className="text-destructive">*</span></Label>
                  <select
                    id="urgency"
                    {...register('urgency', { required: 'Urgency is required' })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    {URGENCIES.map(u => (
                      <option key={u} value={u.toLowerCase()}>{u}</option>
                    ))}
                  </select>
                </div>

                {/* Required Date */}
                <div className="space-y-2">
                  <Label htmlFor="requiredDate">Required Date <span className="text-destructive">*</span></Label>
                  <Input 
                    id="requiredDate" 
                    type="date"
                    {...register('requiredDate', { required: 'Date is required' })} 
                  />
                </div>

                {/* Hospital Name */}
                <div className="space-y-2">
                  <Label htmlFor="hospitalName">Hospital Name <span className="text-destructive">*</span></Label>
                  <Input 
                    id="hospitalName" 
                    placeholder="e.g. Dhaka Medical College" 
                    {...register('hospitalName', { required: 'Hospital Name is required' })} 
                  />
                </div>

                {/* District */}
                <div className="space-y-2">
                  <Label htmlFor="district">District <span className="text-destructive">*</span></Label>
                  <Input 
                    id="district" 
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

                {/* Contact Person */}
                <div className="space-y-2">
                  <Label htmlFor="contactPerson">Contact Person <span className="text-destructive">*</span></Label>
                  <Input 
                    id="contactPerson" 
                    {...register('contactPerson', { required: 'Contact Person is required' })} 
                  />
                </div>

                {/* Contact Number */}
                <div className="space-y-2">
                  <Label htmlFor="contactNumber">Contact Number <span className="text-destructive">*</span></Label>
                  <Input 
                    id="contactNumber" 
                    {...register('contactNumber', { required: 'Contact Number is required' })} 
                  />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Detailed Description (Optional)</Label>
                <textarea
                  id="description"
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  placeholder="Any additional details about the patient or exact location..."
                  {...register('description')}
                />
              </div>

            </CardContent>
            <CardFooter className="flex justify-end gap-4 border-t pt-6 bg-muted/20">
              <Button type="button" variant="outline" onClick={() => navigate(-1)}>Cancel</Button>
              <Button type="submit" variant="destructive" disabled={loading} className="min-w-[150px]">
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <><HeartPulse className="mr-2 h-4 w-4"/> Publish Request</>}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </motion.div>
    </div>
  );
}
