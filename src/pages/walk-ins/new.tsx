import { useState, useEffect } from 'react'; // Added useEffect
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
import { useToast } from '@/components/ui/use-toast';
import LoadingSpinner from '@/components/ui/loading-spinner';

const formSchema = z.object({
  name: z.string().optional(),
  ageGroup: z.enum(['adult', 'youth']),
  paymentMethod: z.enum(['cash', 'qr', 'bank_transfer']),
});

const NewWalkInPage = () => {
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

      toast({
        title: 'Success',
        description: 'Walk-in recorded successfully',
      });

      navigate('/walk-ins');
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
            <Link to="/walk-ins">
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
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link to="/walk-ins">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-3xl font-bold">New Walk-In</h1>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name (Optional)</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="John Doe" disabled={isSubmitting || isLoading} />
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
                <FormLabel>Age Group</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  disabled={isSubmitting || isLoading || !settings}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select age group" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="adult">
                      Adult (RM {settings?.adult_walk_in_price?.toFixed(2) ?? 'N/A'})
                    </SelectItem>
                    <SelectItem value="youth">
                      Youth (RM {settings?.youth_walk_in_price?.toFixed(2) ?? 'N/A'})
                    </SelectItem>
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
                <FormLabel>Payment Method</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  disabled={isSubmitting || isLoading}
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

          <div className="flex gap-2">
            <Button type="submit" disabled={isSubmitting || isLoading || !settings}>
              {isSubmitting ? (
                <div className="flex items-center">
                  <LoadingSpinner size="sm" className="mr-2" /> {/* Corrected size prop */}
                  <span>Processing</span>
                </div>
              ) : (
                'Record Walk-In'
              )}
            </Button>
            
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/walk-ins')}
              disabled={isSubmitting || isLoading}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default NewWalkInPage;