import { useState } from 'react';
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
import type { MembershipType } from '@/types';

const formSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  nric: z.string().refine(validateNRIC, 'Invalid NRIC format'),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  address: z.string().optional().or(z.literal('')),
  membership_type: z.enum(['standard', 'premium', 'family', 'student'] as const),
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
      notes: '',
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsLoading(true);

    try {
      // Get membership plan details
      const { data: planData, error: planError } = await supabase
        .from('membership_plans')
        .select('*')
        .eq('type', values.membership_type)
        .eq('active', true)
        .single();

      if (planError) throw planError;

      const startDate = new Date();
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + planData.months + planData.free_months);

      // Insert new member
      const { data: memberData, error: memberError } = await supabase
        .from('members')
        .insert({
          ...values,
          member_id: await supabase.rpc('generate_member_id'),
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          status: 'active',
          registration_fee_paid: false,
          created_by: user!.id,
        })
        .select()
        .single();

      if (memberError) throw memberError;

      // Add to membership history
      const { error: historyError } = await supabase
        .from('membership_history')
        .insert({
          member_id: memberData.id,
          membership_type: values.membership_type as MembershipType,
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          payment_amount: planData.price + planData.registration_fee,
          payment_method: 'cash',
          is_renewal: false,
          created_by: user!.id,
        });

      if (historyError) throw historyError;

      toast({
        title: 'Success',
        description: 'New member registered successfully',
      });

      navigate(`/members/${memberData.id}`);
    } catch (error) {
      console.error('Error registering new member:', error);
      toast({
        title: 'Error',
        description: 'Failed to register new member',
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

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address (Optional)</FormLabel>
                  <FormControl>
                    <Textarea {...field} disabled={isLoading} />
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
                  <Textarea {...field} disabled={isLoading} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex gap-2">
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <div className="flex items-center">
                  <LoadingSpinner size="sm\" className="mr-2" />
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