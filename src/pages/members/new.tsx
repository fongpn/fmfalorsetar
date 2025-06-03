import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Camera } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@/lib/auth';
import { useSettings } from '@/contexts/SettingsContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import LoadingSpinner from '@/components/ui/loading-spinner';
import { validateNRIC } from '@/lib/utils';
import type { MembershipType, PaymentMethod, Member } from '@/types';
import type { Database } from '@/types/supabase';

type MemberInsert = Database['public']['Tables']['members']['Insert'];
type MembershipPlan = Database['public']['Tables']['membership_plans']['Row'];

const formSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  member_id: z.string().optional(),
  nric: z.string().min(1, 'NRIC / Passport is required'),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().min(1, 'Phone number is required'),
  address: z.string().optional().or(z.literal('')),
  membership_type: z.string().min(1, 'Membership type is required'),
  paymentMethod: z.enum(['cash', 'qr', 'bank_transfer'] as const),
  photo: z.instanceof(File).optional(),
});

const NewMemberPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { settings } = useSettings();
  const [isLoading, setIsLoading] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [membershipPlans, setMembershipPlans] = useState<MembershipPlan[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [shiftError, setShiftError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMembershipPlans = async () => {
      const { data, error } = await supabase
        .from('membership_plans')
        .select('*')
        .eq('active', true)
        .order('price', { ascending: true });

      if (error) {
        toast({
          title: 'Error',
          description: 'Failed to load membership plans',
          variant: 'destructive',
        });
        return;
      }

      setMembershipPlans(data || []);
    };

    fetchMembershipPlans();
  }, [toast]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      member_id: '',
      nric: '',
      email: '',
      phone: '',
      address: '',
      membership_type: '',
      paymentMethod: 'cash',
    },
  });

  const selectedPlan = useMemo(() =>
    membershipPlans.find(plan => plan.type === form.watch('membership_type')),
    [membershipPlans, form.watch('membership_type')]
  );
  const membershipFee = selectedPlan ? selectedPlan.price : 0;
  const registrationFee = selectedPlan ? selectedPlan.registration_fee : 0;
  const totalPayable = membershipFee + registrationFee;

  const startCamera = async () => {
    setCameraError(null);
    setShowCamera(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
      } else {
        setCameraError('Video element not ready.');
        stream.getTracks().forEach(track => track.stop());
      }
    } catch (error: any) {
      console.error('Camera error:', error);
      setCameraError(error?.message || 'Could not access camera');
      setShowCamera(false);
      toast({
        title: 'Camera Error',
        description: error?.message || 'Could not access camera',
        variant: 'destructive',
      });
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setShowCamera(false);
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0);
        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], 'member-photo.jpg', { type: 'image/jpeg' });
            form.setValue('photo', file);
            setPhotoPreview(URL.createObjectURL(blob));
            stopCamera();
          }
        }, 'image/jpeg', 0.95);
      }
    }
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!user) {
      toast({
        title: 'Error',
        description: 'You must be logged in to register a new member.',
        variant: 'destructive',
      });
      return;
    }
    setIsLoading(true);

    try {
      // Get active shift for the current user
      let { data: shiftData, error: shiftError } = await supabase
        .from('shifts')
        .select('id')
        .eq('user_id', user.id)
        .is('end_time', null)
        .single();

      let activeShiftId = shiftData?.id;
      if (shiftError || !shiftData) {
        // If no active shift, automatically start one
        const { data: newShift, error: newShiftError } = await supabase
          .from('shifts')
          .insert({ user_id: user.id, start_time: new Date().toISOString() })
          .select('id')
          .single();
        if (newShiftError || !newShift) {
          toast({
            title: 'Error',
            description: newShiftError?.message || 'Failed to start a new shift',
            variant: 'destructive',
          });
          setIsLoading(false);
          return;
        }
        activeShiftId = newShift.id;
      }
      if (!activeShiftId) {
        toast({
          title: 'Error',
          description: 'No shift ID available for payment record.',
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }

      // Get membership plan details
      if (!selectedPlan) {
        toast({
          title: 'Error',
          description: 'Selected membership plan not found',
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }

      // Upload photo if exists
      let photoUrl = null;
      if (values.photo) {
        const fileExt = values.photo.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const { error: uploadError, data: uploadData } = await supabase.storage
          .from('member-photos')
          .upload(fileName, values.photo);

        if (uploadError) throw uploadError;
        photoUrl = uploadData.path;
      }

      // Generate or use provided member ID
      let memberId = values.member_id;
      if (!memberId) {
        const { data: generatedId, error: generateError } = await supabase.rpc('generate_member_id');
        if (generateError || !generatedId) throw generateError || new Error('Failed to generate member ID');
        memberId = generatedId;
      }

      // Calculate expiry date (same date next month minus one day)
      const startDate = new Date();
      const expiryDate = new Date(startDate);
      expiryDate.setMonth(expiryDate.getMonth() + selectedPlan.months);
      expiryDate.setDate(expiryDate.getDate() - 1);

      // Insert new member
      const memberData: MemberInsert = {
        name: values.name,
        member_id: memberId,
        nric: values.nric,
        email: values.email || null,
        phone: values.phone,
        address: values.address || null,
        membership_type: values.membership_type,
        photo_url: photoUrl,
        start_date: startDate.toISOString(),
        end_date: expiryDate.toISOString(),
        status: 'active',
        registration_fee_paid: true,
        created_by: user.id,
      };

      const { data: insertedMember, error: memberError } = await supabase
        .from('members')
        .insert(memberData)
        .select()
        .single();

      if (memberError || !insertedMember) {
        throw memberError || new Error('Failed to insert member data.');
      }

      // Add to membership history
      const { error: historyError } = await supabase
        .from('membership_history')
        .insert({
          member_id: insertedMember.id,
          membership_type: values.membership_type as MembershipType,
          start_date: startDate.toISOString(),
          end_date: expiryDate.toISOString(),
          payment_amount: totalPayable,
          payment_method: values.paymentMethod,
          is_renewal: false,
          created_by: user.id,
        });

      if (historyError) throw historyError;

      // Record payment in the payments table
      const { error: paymentRecordError } = await supabase
        .from('payments')
        .insert({
          member_id: insertedMember.id,
          amount: totalPayable,
          method: values.paymentMethod,
          payment_for: 'initial_registration_membership',
          shift_id: activeShiftId,
          created_by: user.id,
        });

      if (paymentRecordError) throw paymentRecordError;

      toast({
        title: 'Success',
        description: 'New member registered successfully',
      });

      navigate(`/members/${insertedMember.id}`);
    } catch (error) {
      console.error('Error registering new member:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to register new member';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-start min-h-screen py-8">
      <div className="w-full max-w-2xl bg-white rounded-xl shadow-lg p-8">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="outline" size="icon" asChild>
            <Link to="/members">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">New Member</h1>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            {/* Photo Section - Moved to top */}
            <div className="flex flex-col items-center mb-8">
              <h2 className="text-lg font-semibold mb-4">Photo</h2>
              <div className="flex flex-col items-center gap-4">
                <div className="w-40 h-40 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50 relative overflow-hidden">
                  {photoPreview ? (
                    <>
                      <img
                        src={photoPreview}
                        alt="Member photo preview"
                        className="w-full h-full object-cover rounded-lg"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="absolute top-2 right-2"
                        onClick={() => {
                          setPhotoPreview(null);
                          form.setValue('photo', undefined);
                        }}
                      >
                        Remove
                      </Button>
                    </>
                  ) : (
                    <span className="text-gray-400">No Photo</span>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={startCamera}
                    disabled={isLoading}
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    Take Photo
                  </Button>
                  {photoPreview && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={startCamera}
                      disabled={isLoading}
                    >
                      <Camera className="h-4 w-4 mr-2" />
                      Retake Photo
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Member Details Section */}
            <div>
              <h2 className="text-lg font-semibold mb-4">Member Details</h2>
              <div className="grid gap-6 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-medium">Name</FormLabel>
                      <FormControl>
                        <Input {...field} disabled={isLoading} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="member_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-medium">Member ID (Optional)</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Leave blank for auto-assignment" disabled={isLoading} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="nric"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-medium">NRIC / Passport</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="000000-00-0000" disabled={isLoading} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-medium">Phone</FormLabel>
                      <FormControl>
                        <Input {...field} disabled={isLoading} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-medium">Email (Optional)</FormLabel>
                      <FormControl>
                        <Input type="email" {...field} disabled={isLoading} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel className="font-medium">Address (Optional)</FormLabel>
                      <FormControl>
                        <Textarea {...field} disabled={isLoading} rows={3} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Membership Plan Section */}
            <div>
              <h2 className="text-lg font-semibold mb-4">Membership Plan</h2>
              <div className="grid gap-6 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="membership_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-medium">Membership Type</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        disabled={isLoading}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select membership type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {membershipPlans.map((plan) => (
                            <SelectItem key={plan.id} value={plan.type}>
                              {plan.type} - RM{plan.price}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="paymentMethod"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-medium">Payment Method</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        disabled={isLoading}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select payment method" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="cash">Cash</SelectItem>
                          <SelectItem value="qr">QR Payment</SelectItem>
                          <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              {/* Total Payable Breakdown Display */}
              {selectedPlan && (
                <div className="mt-6 flex flex-col items-end">
                  <div className="w-full bg-gray-50 border border-gray-200 rounded-lg p-4 mb-2">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 w-full">
                      <div className="flex flex-col items-start md:items-center md:flex-row gap-2 md:gap-2">
                        <span className="text-gray-700">Membership Fee</span>
                        <span className="font-semibold">RM {membershipFee.toFixed(2)}</span>
                      </div>
                      <div className="flex flex-col items-start md:items-center md:flex-row gap-2 md:gap-2">
                        <span className="text-gray-700">Registration Fee</span>
                        <span className="font-semibold">RM {registrationFee.toFixed(2)}</span>
                      </div>
                      <div className="flex flex-col items-start md:items-center md:flex-row gap-2 md:gap-2">
                        <span className="text-lg font-bold text-primary">Total Payable</span>
                        <span className="text-2xl font-extrabold text-green-600">RM {totalPayable.toFixed(2)}</span>
                      </div>
                      <div className="flex flex-col items-start md:items-center md:flex-row gap-2 md:gap-2 text-sm text-gray-600">
                        <span>Expiry Date</span>
                        <span className="font-medium">
                          {(() => {
                            const start = new Date();
                            const expiry = new Date(start);
                            expiry.setMonth(expiry.getMonth() + selectedPlan.months);
                            expiry.setDate(expiry.getDate() - 1);
                            return expiry.toLocaleDateString();
                          })()}
                        </span>
                      </div>
                      <div className="flex flex-col items-start md:items-center md:flex-row gap-2 md:gap-2 text-sm text-gray-600">
                        <span>Grace Period Ends</span>
                        <span className="font-medium">
                          {(() => {
                            const start = new Date();
                            const expiry = new Date(start);
                            expiry.setMonth(expiry.getMonth() + selectedPlan.months);
                            const grace = settings?.grace_period_days ?? 3;
                            expiry.setDate(expiry.getDate() - 1 + grace);
                            return expiry.toLocaleDateString();
                          })()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-2 pt-4">
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <div className="flex items-center">
                    <LoadingSpinner size="sm" className="mr-2" />
                    <span>Registering</span>
                  </div>
                ) : (
                  'Register Member'
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/members')}
                disabled={isLoading}
              >
                Cancel
              </Button>
            </div>
          </form>
        </Form>

        {/* Camera Modal */}
        {showCamera && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-4 rounded-lg shadow-lg w-full max-w-md">
              {cameraError ? (
                <div className="text-red-600 mb-2">{cameraError}</div>
              ) : null}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full max-w-md rounded-lg"
              />
              <div className="flex justify-end gap-2 mt-4">
                <Button variant="outline" onClick={stopCamera}>
                  Cancel
                </Button>
                <Button onClick={capturePhoto}>
                  Capture
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NewMemberPage;