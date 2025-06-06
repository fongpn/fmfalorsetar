import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import LoadingSpinner from '@/components/ui/loading-spinner';
import { formatDate, formatCurrency } from '@/lib/utils';
import type { Member, MembershipPlan, MembershipType } from '@/types';
import { addDays, differenceInDays, isAfter } from 'date-fns';
import { auditHelpers } from '@/lib/audit';

const formSchema = z.object({
  membership_type: z.enum(['standard', 'premium', 'family', 'student'] as const),
  payment_method: z.enum(['cash', 'qr', 'bank_transfer'] as const),
});

const RenewMembershipPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [member, setMember] = useState<Member | null>(null);
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<MembershipPlan | null>(null);
  const [graceAccesses, setGraceAccesses] = useState<any[]>([]);
  const [settings, setSettings] = useState<{ grace_period_days: number }>({ grace_period_days: 7 });
  const [activeShiftId, setActiveShiftId] = useState<string | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      membership_type: 'standard',
      payment_method: 'cash',
    },
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch member details
        const { data: memberData, error: memberError } = await supabase
          .from('members')
          .select('*')
          .eq('id', id!)
          .single();

        if (memberError) throw memberError;
        setMember(memberData as Member);
        form.setValue('membership_type', memberData.membership_type as MembershipType);

        // Fetch membership plans
        const { data: plansData, error: plansError } = await supabase
          .from('membership_plans')
          .select('*')
          .eq('active', true);

        if (plansError) throw plansError;
        setPlans(plansData as MembershipPlan[]);
        
        // Set initial selected plan
        const initialPlan = plansData.find(
          plan => plan.type === memberData.membership_type
        );
        setSelectedPlan(initialPlan as MembershipPlan | null);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast({
          title: 'Error',
          description: 'Failed to load member details',
          variant: 'destructive',
        });
        navigate('/members');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [id, navigate, toast, form]);

  // Update selected plan when membership type changes
  useEffect(() => {
    const type = form.watch('membership_type');
    const plan = plans.find(p => p.type === type);
    setSelectedPlan(plan || null);
  }, [form.watch('membership_type'), plans]);

  useEffect(() => {
    // Fetch grace period days from settings (optional, default 7)
    const fetchSettings = async () => {
      const { data, error } = await supabase.rpc('get_settings');
      if (!error && data) {
        setSettings({ grace_period_days: (data as any).grace_period_days || 7 });
      }
    };
    fetchSettings();
  }, []);

  useEffect(() => {
    // Fetch grace period access records for this member
    const fetchGraceAccesses = async () => {
      if (!member) return;
      const { data, error } = await (supabase as any)
        .from('grace_period_access')
        .select('*')
        .eq('member_id', member.id);
      if (!error && data) setGraceAccesses(data);
    };
    fetchGraceAccesses();
  }, [member]);

  useEffect(() => {
    // Fetch active shift for the user
    const fetchActiveShift = async () => {
      if (!user) return;
      const { data, error } = await supabase
        .from('shifts')
        .select('id')
        .eq('user_id', user.id)
        .is('end_time', null)
        .single();
      if (!error && data) setActiveShiftId(data.id as string);
    };
    fetchActiveShift();
  }, [user]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!selectedPlan || !member) return;
    setIsLoading(true);
    try {
      if (!activeShiftId) {
        toast({
          title: 'No Active Shift',
          description: 'You must have an active shift to renew a membership.',
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }
      // Calculate grace period end date
      const prevExpiry = new Date(member.end_date);
      const gracePeriodEnd = addDays(prevExpiry, settings.grace_period_days);
      const now = new Date();
      let startDate: Date;
      let endDate: Date;
      let walkInCharges = 0;
      let walkInChargeCount = 0;
      // If renewal is within grace period (or before expiry)
      if (now <= gracePeriodEnd) {
        startDate = prevExpiry;
        endDate = new Date(prevExpiry);
        endDate.setMonth(endDate.getMonth() + selectedPlan.months + selectedPlan.free_months);
        // Same date next month minus one day logic
        endDate.setDate(endDate.getDate() - 1);
        // Clear grace period access records
        if (graceAccesses.length > 0) {
          await (supabase as any)
            .from('grace_period_access')
            .delete()
            .eq('member_id', member.id);
        }
      } else {
        // Renewal after grace period: charge for all grace accesses
        startDate = now;
        endDate = new Date(now);
        endDate.setMonth(endDate.getMonth() + selectedPlan.months + selectedPlan.free_months);
        endDate.setDate(endDate.getDate() - 1);
        for (const access of graceAccesses) {
          walkInCharges += Number(access.walk_in_price);
          walkInChargeCount++;
          // Insert payment for each grace access
          await supabase.from('payments').insert({
            member_id: member.id as string,
            amount: access.walk_in_price,
            method: 'cash',
            payment_for: 'grace_period_walk_in',
            created_by: user!.id,
            shift_id: activeShiftId,
          });
        }
        // Clear grace period access records
        if (graceAccesses.length > 0) {
          await (supabase as any)
            .from('grace_period_access')
            .delete()
            .eq('member_id', member.id);
        }
      }
      // Update member
      const { error: memberError } = await supabase
        .from('members')
        .update({
          membership_type: values.membership_type,
          end_date: endDate.toISOString(),
          status: 'active',
          updated_at: new Date().toISOString(),
        })
        .eq('id', id!);
      if (memberError) throw memberError;
      // Add to membership history
      const { error: historyError } = await supabase
        .from('membership_history')
        .insert({
          member_id: member.id,
          membership_type: values.membership_type,
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          payment_amount: selectedPlan.price,
          payment_method: values.payment_method,
          is_renewal: true,
          created_by: user!.id,
        });
      if (historyError) throw historyError;
      // Record payment for renewal
      const { error: paymentError } = await supabase
        .from('payments')
        .insert({
          member_id: member.id as string,
          amount: selectedPlan.price,
          method: values.payment_method,
          payment_for: 'renewal',
          created_by: user!.id,
          shift_id: activeShiftId,
        });
      if (paymentError) throw paymentError;

      // Create audit log for member renewal
      await auditHelpers.memberRenewal(
        user!.id,
        member.id,
        member.name,
        {
          membership_type: values.membership_type,
          payment_method: values.payment_method,
          amount: selectedPlan.price,
          shift_id: activeShiftId,
          walk_in_charges: walkInCharges,
          walk_in_charge_count: walkInChargeCount
        }
      );

      let toastMsg = 'Membership renewed successfully';
      if (walkInChargeCount > 0) {
        toastMsg += `. Walk-in charges for grace period: RM ${walkInCharges.toFixed(2)} (${walkInChargeCount} access${walkInChargeCount > 1 ? 'es' : ''})`;
      }
      toast({
        title: 'Success',
        description: toastMsg,
      });
      navigate(`/members/${id}`);
    } catch (error) {
      console.error('Error renewing membership:', error);
      toast({
        title: 'Error',
        description: 'Failed to renew membership',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!member) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500 dark:text-gray-400">Member not found</p>
        <Button asChild className="mt-4">
          <Link to="/members">Back to Members</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link to={`/members/${id}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-3xl font-bold">Renew Membership</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Current Membership</CardTitle>
          <CardDescription>
            Member: {member.name} (ID: {member.member_id})
          </CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-4">
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Type
              </dt>
              <dd className="text-lg">
                {member.membership_type.charAt(0).toUpperCase() + member.membership_type.slice(1)}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Valid Until
              </dt>
              <dd className="text-lg">{formatDate(member.end_date)}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Renewal Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
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
                        {plans.map((plan) => (
                          <SelectItem key={plan.type} value={plan.type}>
                            {plan.type.charAt(0).toUpperCase() + plan.type.slice(1)} - {formatCurrency(plan.price)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {selectedPlan && (
                <div className="rounded-lg border p-4 space-y-3">
                  <h3 className="font-medium">Plan Details</h3>
                  <dl className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <dt className="text-gray-500 dark:text-gray-400">Duration</dt>
                      <dd>{selectedPlan.months} months</dd>
                    </div>
                    <div>
                      <dt className="text-gray-500 dark:text-gray-400">Free Months</dt>
                      <dd>{selectedPlan.free_months} months</dd>
                    </div>
                    <div>
                      <dt className="text-gray-500 dark:text-gray-400">Total Duration</dt>
                      <dd>{selectedPlan.months + selectedPlan.free_months} months</dd>
                    </div>
                    <div>
                      <dt className="text-gray-500 dark:text-gray-400">Price</dt>
                      <dd className="font-medium">{formatCurrency(selectedPlan.price)}</dd>
                    </div>
                  </dl>
                </div>
              )}

              <FormField
                control={form.control}
                name="payment_method"
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
            </CardContent>
          </Card>

          <div className="flex gap-2">
            <Button type="submit" disabled={isLoading || !selectedPlan}>
              {isLoading ? (
                <div className="flex items-center">
                  <LoadingSpinner size="sm" className="mr-2" />
                  <span>Processing</span>
                </div>
              ) : (
                'Renew Membership'
              )}
            </Button>
            
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(`/members/${id}`)}
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

export default RenewMembershipPage;