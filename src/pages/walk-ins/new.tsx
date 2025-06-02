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
  const [isLoading, setIsLoading] = useState(false);
  const [settings, setSettings] = useState<{
    adult_walk_in_price: number;
    youth_walk_in_price: number;
  } | null>(null);

  // Load settings for pricing
  useState(() => {
    const fetchSettings = async () => {
      try {
        const { data, error } = await supabase.rpc('get_settings');
        if (error) throw error;
        setSettings(data);
      } catch (error) {
        console.error('Error fetching settings:', error);
        toast({
          title: 'Error',
          description: 'Failed to load pricing settings',
          variant: 'destructive',
        });
      }
    };
    fetchSettings();
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      ageGroup: 'adult',
      paymentMethod: 'cash',
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!settings) return;
    setIsLoading(true);

    try {
      // Get active shift
      const { data: shiftData, error: shiftError } = await supabase
        .from('shifts')
        .select('id')
        .eq('user_id', user!.id)
        .is('end_time', null)
        .single();

      if (shiftError) throw shiftError;

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
          created_by: user!.id,
          shift_id: shiftData.id,
        });

      if (walkInError) throw walkInError;

      // Record payment
      const { error: paymentError } = await supabase
        .from('payments')
        .insert({
          amount,
          method: values.paymentMethod,
          payment_for: 'walk_in',
          created_by: user!.id,
          shift_id: shiftData.id,
        });

      if (paymentError) throw paymentError;

      toast({
        title: 'Success',
        description: 'Walk-in recorded successfully',
      });

      navigate('/walk-ins');
    } catch (error) {
      console.error('Error recording walk-in:', error);
      toast({
        title: 'Error',
        description: 'Failed to record walk-in',
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
                  <Input {...field} placeholder="John Doe" disabled={isLoading} />
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
                  disabled={isLoading}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select age group" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="adult">
                      Adult (RM {settings?.adult_walk_in_price.toFixed(2)})
                    </SelectItem>
                    <SelectItem value="youth">
                      Youth (RM {settings?.youth_walk_in_price.toFixed(2)})
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

          <div className="flex gap-2">
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <div className="flex items-center">
                  <LoadingSpinner size="sm\" className="mr-2" />
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

export default NewWalkInPage;