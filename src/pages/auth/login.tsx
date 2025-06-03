import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
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
import { useToast } from '@/components/ui/use-toast';
import LoadingSpinner from '@/components/ui/loading-spinner';
import Logo from '@/components/Logo';
import { useSettings } from '@/contexts/SettingsContext';

// Form validation schema
const formSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email address' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters' }),
});

const LoginPage = () => {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { settings } = useSettings();
  const [isLoading, setIsLoading] = useState(false);
  const [appSettings, setAppSettings] = useState<{ logo_text?: string; logo_icon?: string } | null>(null);

  // Load app settings for branding
  useState(() => {
    const fetchSettings = async () => {
      try {
        const { data: settings } = await supabase.rpc('get_settings');
        if (settings) {
          setAppSettings(settings);
          if (settings.logo_text) {
            document.title = settings.logo_text;
          }
        }
      } catch (error) {
        console.error('Error fetching app settings:', error);
      }
    };
    
    fetchSettings();
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsLoading(true);

    try {
      console.log('Attempting to sign in...');
      const { error } = await signIn(values.email, values.password);

      if (error) {
        console.error('Sign in error:', error);
        toast({
          title: 'Authentication failed',
          description: error,
          variant: 'destructive',
        });
        return;
      }

      console.log('Sign in successful, waiting for redirect...');
      // Successful login will redirect via the AuthProvider
    } catch (error) {
      console.error('Unexpected error during sign in:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
      <div className="w-full max-w-md space-y-8 bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md">
        <div className="text-center">
          <div className="flex justify-center mb-2">
            <Logo className="h-32 w-56" />
          </div>
          {!settings?.logo_url && (
            <h2 className="mt-4 text-3xl font-bold text-gray-900 dark:text-gray-100">
              {settings?.logo_text || 'Membership App'}
            </h2>
          )}
          <p className="mt-2 text-lg font-semibold text-gray-700 dark:text-gray-300">
  Membership Management System
</p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="Enter E-mail Provided"
                      {...field}
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel>Password</FormLabel>
                  </div>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      {...field}
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <LoadingSpinner size="sm" className="mr-2" />
                  <span>Signing in</span>
                </div>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
};

export default LoginPage;