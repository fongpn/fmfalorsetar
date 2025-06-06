import { useState, useEffect } from 'react'; // Added useEffect
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Wallet, QrCode, Banknote } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { auditHelpers } from '@/lib/audit';
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
import { useToast } from '@/components/ui/use-toast';
import LoadingSpinner from '@/components/ui/loading-spinner';

// Add prop types
interface NewWalkInPageProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

const formSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  ageGroup: z.enum(['adult', 'youth']),
  paymentMethod: z.enum(['cash', 'qr', 'bank_transfer']),
});

const NewWalkInPage = ({ onSuccess, onCancel }: NewWalkInPageProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false); // This will be true while settings are loading initially too
  const [isSubmitting, setIsSubmitting] = useState(false); // Separate state for form submission
  const [settings, setSettings] = useState<{
    adult_walk_in_price: number;
    youth_walk_in_price: number;
  } | null>(null);

  // Load settings for pricing using useEffect
  useEffect(() => {
    const fetchSettings = async () => {
      setIsLoading(true); // Set loading true when starting to fetch
      try {
        const { data, error } = await supabase.rpc('get_settings');
        if (error) throw error;
        if (data) {
          setSettings({
            adult_walk_in_price: data.adult_walk_in_price,
            youth_walk_in_price: data.youth_walk_in_price,
          });
        } else {
          throw new Error("Failed to retrieve settings data.");
        }
      } catch (error) {
        console.error('Error fetching settings:', error);
        toast({
          title: 'Error',
          description: 'Failed to load pricing settings. Please try again.',
          variant: 'destructive',
        });
        // Optionally, navigate away or disable form if settings are crucial
        // navigate('/walk-ins'); 
      } finally {
        setIsLoading(false); // Set loading false after fetch attempt
      }
    };
    fetchSettings();
  }, [toast]); // supabase is a stable client, toast is also generally stable

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      ageGroup: 'adult',
      paymentMethod: 'cash',
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!settings) {
      toast({
        title: 'Error',
        description: 'Pricing settings are not loaded. Cannot record walk-in.',
        variant: 'destructive',
      });
      return;
    }
    if (!user) {
      toast({
        title: 'Error',
        description: 'User not authenticated.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true); // Use isSubmitting for form processing

    try {
      // Get active shift
      const { data: shiftData, error: shiftError } = await supabase
        .from('shifts')
        .select('id')
        .eq('user_id', user.id)
        .is('end_time', null)
        .single();

      if (shiftError || !shiftData) {
        toast({
          title: 'No Active Shift',
          description: 'You must have an active shift to record a walk-in.',
          variant: 'destructive',
        });
        throw shiftError || new Error('No active shift found.');
      }

      // Record walk-in
      const amount = values.ageGroup === 'adult'
        ? settings.adult_walk_in_price
        : settings.youth_walk_in_price;

      const { error: walkInError } = await supabase
        .from('walk_ins')
        .insert({
          name: values.name || null,
          age_group: values.ageGroup,
          amount,
          payment_method: values.paymentMethod,
          created_by: user.id,
          shift_id: shiftData.id,
        });

      if (walkInError) throw walkInError;

      // Record payment
      const { error: paymentError } = await supabase
        .from('payments')
        .insert({
          amount,
          method: values.paymentMethod,
          payment_for: 'walk_in', // Ensure this matches your payment_for types
          created_by: user.id,
          shift_id: shiftData.id,
          // member_id is null for walk_ins
        });

      if (paymentError) throw paymentError;

      // Create audit log entry
      await auditHelpers.walkIn(
        user.id,
        values.name || 'Anonymous',
        values.ageGroup,
        amount,
        {
          payment_method: values.paymentMethod,
          shift_id: shiftData.id
        }
      );

      toast({
        title: 'Success',
        description: 'Walk-in recorded successfully',
      });

      if (onSuccess) {
        onSuccess();
      } else {
        navigate('/walk-ins/list');
      }
    } catch (error) {
      console.error('Error recording walk-in:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to record walk-in';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false); // Use isSubmitting for form processing
    }
  };

  // Show loading spinner if settings are still loading
  if (isLoading && !settings) {
    return (
      <div className="flex justify-center items-center h-full">
        <LoadingSpinner size="lg" />
      </div>
    );
  }
  
  // Optional: Show an error or a specific UI if settings failed to load but we are not in isLoading state anymore
  if (!settings && !isLoading) {
     return (
      <div className="space-y-6 text-center">
         <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <Link to="/walk-ins/list">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-3xl font-bold">New Walk-In</h1>
        </div>
        <p className="text-red-500">Failed to load pricing settings. Please try refreshing the page or contact support.</p>
      </div>
     )
  }


  return (
    <div className="flex justify-center items-start min-h-[80vh] bg-gray-50 py-10">
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-lg p-8">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" asChild className="border-none shadow-none">
            <Link to="/walk-ins/list">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">New Walk-In</h1>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-medium">Name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="John Doe" disabled={isSubmitting || isLoading} className="rounded-lg bg-gray-100 focus:bg-white focus:ring-2 focus:ring-orange-400 border-none" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="ageGroup"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-medium">Age Group</FormLabel>
                  <div className="flex gap-3 mt-2">
                    <Button
                      type="button"
                      variant={field.value === 'adult' ? 'default' : 'outline'}
                      className={`rounded-md px-6 py-2 font-semibold transition-colors ${field.value === 'adult' ? 'bg-orange-500 text-white hover:bg-orange-600' : 'bg-gray-100 text-gray-700 hover:bg-orange-100'}`}
                      onClick={() => field.onChange('adult')}
                      disabled={isSubmitting || isLoading || !settings}
                    >
                      Adult (RM {settings?.adult_walk_in_price?.toFixed(2) ?? 'N/A'})
                    </Button>
                    <Button
                      type="button"
                      variant={field.value === 'youth' ? 'default' : 'outline'}
                      className={`rounded-md px-6 py-2 font-semibold transition-colors ${field.value === 'youth' ? 'bg-orange-500 text-white hover:bg-orange-600' : 'bg-gray-100 text-gray-700 hover:bg-orange-100'}`}
                      onClick={() => field.onChange('youth')}
                      disabled={isSubmitting || isLoading || !settings}
                    >
                      Youth (RM {settings?.youth_walk_in_price?.toFixed(2) ?? 'N/A'})
                    </Button>
                  </div>
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
                  <div className="flex gap-3 mt-2">
                    <Button
                      type="button"
                      variant={field.value === 'cash' ? 'default' : 'outline'}
                      className={`rounded-md px-6 py-2 font-semibold transition-colors flex items-center gap-2 ${field.value === 'cash' ? 'bg-orange-500 text-white hover:bg-orange-600' : 'bg-gray-100 text-gray-700 hover:bg-orange-100'}`}
                      onClick={() => field.onChange('cash')}
                      disabled={isSubmitting || isLoading}
                    >
                      <Wallet className="w-4 h-4" />
                      Cash
                    </Button>
                    <Button
                      type="button"
                      variant={field.value === 'qr' ? 'default' : 'outline'}
                      className={`rounded-md px-6 py-2 font-semibold transition-colors flex items-center gap-2 ${field.value === 'qr' ? 'bg-orange-500 text-white hover:bg-orange-600' : 'bg-gray-100 text-gray-700 hover:bg-orange-100'}`}
                      onClick={() => field.onChange('qr')}
                      disabled={isSubmitting || isLoading}
                    >
                      <QrCode className="w-4 h-4" />
                      QR Payment
                    </Button>
                    <Button
                      type="button"
                      variant={field.value === 'bank_transfer' ? 'default' : 'outline'}
                      className={`rounded-md px-6 py-2 font-semibold transition-colors flex items-center gap-2 ${field.value === 'bank_transfer' ? 'bg-orange-500 text-white hover:bg-orange-600' : 'bg-gray-100 text-gray-700 hover:bg-orange-100'}`}
                      onClick={() => field.onChange('bank_transfer')}
                      disabled={isSubmitting || isLoading}
                    >
                      <Banknote className="w-4 h-4" />
                      Bank Transfer
                    </Button>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-3 mt-6">
              <Button type="submit" disabled={isSubmitting || isLoading || !settings} className="rounded-full px-8 py-2 font-semibold bg-orange-500 hover:bg-orange-600 transition-colors">
                {isSubmitting ? (
                  <div className="flex items-center">
                    <LoadingSpinner size="sm" className="mr-2" />
                    <span>Processing</span>
                  </div>
                ) : (
                  'Record Walk-In'
                )}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => { if (onCancel) { onCancel(); } else { navigate('/walk-ins/list'); } }}
                disabled={isSubmitting || isLoading}
                className="rounded-full px-8 py-2 font-semibold text-gray-500 hover:bg-gray-100 border-none shadow-none"
              >
                Cancel
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
};

export default NewWalkInPage;