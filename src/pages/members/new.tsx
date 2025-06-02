import { useState, useEffect } from 'react'; // Added useEffect for potential future use, though not strictly needed for this fix
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@/lib/auth';
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
import type { MembershipType, PaymentMethod } from '@/types'; // Added PaymentMethod

const formSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  nric: z.string().refine(validateNRIC, 'Invalid NRIC format'),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  address: z.string().optional().or(z.literal('')),
  membership_type: z.enum(['standard', 'premium', 'family', 'student'] as const),
  paymentMethod: z.enum(['cash', 'qr', 'bank_transfer'] as const), // Added paymentMethod
  notes: z.string().optional().or(z.literal('')),
});

const NewMemberPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      nric: '',
      email: '',
      phone: '',
      address: '',
      membership_type: 'standard',
      paymentMethod: 'cash', // Default payment method
      notes: '',
    },
  });

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
      const { data: shiftData, error: shiftError } = await supabase
        .from('shifts')
        .select('id')
        .eq('user_id', user.id)
        .is('end_time', null)
        .single();

      if (shiftError || !shiftData) {
        toast({
          title: 'No Active Shift',
          description: 'An active shift is required to register a new member and record payment.',
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }
      const activeShiftId = shiftData.id;

      // Get membership plan details
      const { data: planData, error: planError } = await supabase
        .from('membership_plans')
        .select('*')
        .eq('type', values.membership_type)
        .eq('active', true)
        .single();

      if (planError || !planData) {
        toast({
          title: 'Error',
          description: 'Could not retrieve membership plan details. Please try again.',
          variant: 'destructive',
        });
        throw planError || new Error('Membership plan not found');
      }

      const startDate = new Date();
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + planData.months + planData.free_months);
      const totalAmountPaid = planData.price + planData.registration_fee;

      // Insert new member
      const { data: memberData, error: memberError } = await supabase
        .from('members')
        .insert({
          name: values.name,
          nric: values.nric,
          email: values.email || null,
          phone: values.phone || null,
          address: values.address || null,
          membership_type: values.membership_type,
          notes: values.notes || null,
          member_id: await supabase.rpc('generate_member_id'), // Assumes this RPC exists and works
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          status: 'active',
          registration_fee_paid: true, // Corrected: Fee is paid now
          created_by: user.id,
        })
        .select()
        .single();

      if (memberError || !memberData) {
        throw memberError || new Error('Failed to insert member data.');
      }

      // Add to membership history
      const { error: historyError } = await supabase
        .from('membership_history')
        .insert({
          member_id: memberData.id,
          membership_type: values.membership_type as MembershipType,
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          payment_amount: totalAmountPaid, // Reflects total amount for this initial transaction
          payment_method: values.paymentMethod, // Use selected payment method
          is_renewal: false,
          created_by: user.id,
        });

      if (historyError) throw historyError;

      // Record payment in the payments table
      const { error: paymentRecordError } = await supabase
        .from('payments')
        .insert({
          member_id: memberData.id,
          amount: totalAmountPaid,
          method: values.paymentMethod,
          payment_for: 'initial_registration_membership', // Or a more descriptive term
          shift_id: activeShiftId,
          created_by: user.id,
        });

      if (paymentRecordError) throw paymentRecordError;

      toast({
        title: 'Success',
        description: 'New member registered successfully',
      });

      navigate(`/members/${memberData.id}`);
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
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link to="/members">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-3xl font-bold">New Member</h1>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input {...field} disabled={isLoading} />
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
                  <FormLabel>NRIC</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="000000-00-0000"
                      disabled={isLoading}
                    />
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
                  <FormLabel>Email (Optional)</FormLabel>
                  <FormControl>
                    <Input type="email" {...field} disabled={isLoading} />
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
                  <FormLabel>Phone (Optional)</FormLabel>
                  <FormControl>
                    <Input {...field} disabled={isLoading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="membership_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Membership Type</FormLabel>
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
                      <SelectItem value="standard">Standard</SelectItem>
                      <SelectItem value="premium">Premium</SelectItem>
                      <SelectItem value="family">Family</SelectItem>
                      <SelectItem value="student">Student</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Added Payment Method Field */}
            <FormField
              control={form.control}
              name="paymentMethod"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Method</FormLabel>
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
            
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem className="md:col-span-2"> {/* Adjusted for layout */}
                  <FormLabel>Address (Optional)</FormLabel>
                  <FormControl>
                    <Textarea {...field} disabled={isLoading} rows={3} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Notes (Optional)</FormLabel>
                <FormControl>
                  <Textarea {...field} disabled={isLoading} rows={3} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex gap-2">
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
    </div>
  );
};

export default NewMemberPage;