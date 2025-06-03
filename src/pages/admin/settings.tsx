import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import { allRoles } from '@/lib/auth';
import type { AppSettings, UserRole } from '@/types';
import { Label } from '@/components/ui/label';

const defaultSettings: AppSettings = {
  fingerprinting_enabled: false,
  fingerprinting_roles: [],
  default_new_user_role: 'cashier',
  logo_text: '',
  logo_icon: '',
  primary_color: '#0f172a',
  adult_walk_in_price: 15.00,
  youth_walk_in_price: 10.00,
  adult_coupon_price: 120.00,
  youth_coupon_price: 80.00,
  coupon_max_uses: 10,
  grace_period_days: 3,
};

const SettingsPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data, error } = await supabase.rpc('get_settings');
        
        if (error) throw error;
        setSettings(data as unknown as AppSettings);
      } catch (error) {
        console.error('Error fetching settings:', error);
        toast({
          title: 'Error',
          description: 'Failed to load settings',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, [toast]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      console.log('Current settings before formatting:', settings);

      // Format settings for PostgreSQL
      const formattedSettings = {
        ...settings,
        // Format fingerprinting_roles as a PostgreSQL array
        fingerprinting_roles: settings.fingerprinting_enabled ? ['cashier'] : [],
        logo_text: settings.logo_text || '',
        logo_icon: settings.logo_icon || '',
        logo_url: settings.logo_url || '',
        primary_color: settings.primary_color || '#0f172a',
        adult_walk_in_price: settings.adult_walk_in_price || 15.00,
        youth_walk_in_price: settings.youth_walk_in_price || 10.00,
        adult_coupon_price: settings.adult_coupon_price || 120.00,
        youth_coupon_price: settings.youth_coupon_price || 80.00,
        coupon_max_uses: settings.coupon_max_uses || 10
      };

      console.log('Formatted settings:', formattedSettings);

      // Send the settings object directly without stringifying
      const { data, error } = await supabase.rpc('update_all_settings', {
        settings_json: formattedSettings
      });

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      console.log('Supabase response data:', data);

      // Update local state with the returned data
      if (data) {
        console.log('Updating local state with:', data);
        setSettings(data as unknown as AppSettings);
      }

      toast({
        title: 'Success',
        description: 'Settings updated successfully',
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to save settings',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      // Upload file to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('logos')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('logos')
        .getPublicUrl(filePath);

      console.log('Logo uploaded successfully:', publicUrl);

      // Update settings with new logo URL
      setSettings(prev => ({
        ...prev,
        logo_url: publicUrl
      }));

      toast({
        title: 'Success',
        description: 'Logo uploaded successfully',
      });
    } catch (error) {
      console.error('Error uploading logo:', error);
      toast({
        title: 'Error',
        description: 'Failed to upload logo. Please try again.',
        variant: 'destructive',
      });
    }
  };

  // Add effect to refresh settings when component mounts
  useEffect(() => {
    const loadSettings = async () => {
      setIsLoading(true);
      try {
        console.log('Fetching settings from Supabase...');
        const { data, error } = await supabase.rpc('get_settings');
        
        if (error) {
          console.error('Error fetching settings:', error);
          throw error;
        }

        console.log('Settings fetched from Supabase:', data);
        
        if (data) {
          setSettings(data as unknown as AppSettings);
        }
      } catch (error) {
        console.error('Error refreshing settings:', error);
        toast({
          title: 'Error',
          description: 'Failed to refresh settings',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, [toast]);

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-96" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardHeader>
            <CardTitle>Error</CardTitle>
            <CardDescription>Failed to load settings</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>General Settings</CardTitle>
          <CardDescription>
            Configure general application settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Logo</Label>
            <div className="flex items-center gap-4">
              {settings.logo_url && (
                <img 
                  src={settings.logo_url} 
                  alt="Logo" 
                  className="h-12 w-12 object-contain"
                />
              )}
              <Input
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="max-w-xs"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Logo Text</Label>
            <Input
              value={settings.logo_text || ''}
              onChange={e =>
                setSettings(prev => ({
                  ...prev,
                  logo_text: e.target.value,
                }))
              }
              placeholder="Enter logo text"
            />
          </div>
          <div className="space-y-2">
            <Label>Primary Color</Label>
            <Input
              type="color"
              value={settings.primary_color || '#0f172a'}
              onChange={e =>
                setSettings(prev => ({
                  ...prev,
                  primary_color: e.target.value,
                }))
              }
              className="h-10"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Security</CardTitle>
          <CardDescription>
            Configure security and authentication settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Device Fingerprinting</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Require device authorization for cashiers
              </p>
            </div>
            <Switch
              checked={settings.fingerprinting_enabled}
              onCheckedChange={checked =>
                setSettings(prev => ({
                  ...prev,
                  fingerprinting_enabled: checked,
                  fingerprinting_roles: checked ? ['cashier'] : [],
                }))
              }
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Default New User Role</label>
            <select
              value={settings.default_new_user_role}
              onChange={e =>
                setSettings(prev => ({
                  ...prev,
                  default_new_user_role: e.target.value as UserRole,
                }))
              }
              className="w-full rounded-md border border-input bg-background px-3 py-2"
            >
              {allRoles.map(role => (
                <option key={role} value={role}>
                  {role.charAt(0).toUpperCase() + role.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Membership & Walk-In Settings</CardTitle>
          <CardDescription>
            Configure membership grace period and walk-in rates
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Grace Period (days)</Label>
            <Input
              type="number"
              min={0}
              value={settings.grace_period_days || 0}
              onChange={e => setSettings(prev => ({ ...prev, grace_period_days: parseInt(e.target.value, 10) }))}
              placeholder="Enter grace period in days"
            />
          </div>
          <div className="space-y-2">
            <Label>Adult Walk-In Rate (RM)</Label>
            <Input
              type="number"
              min={0}
              step={0.01}
              value={settings.adult_walk_in_price || 0}
              onChange={e => setSettings(prev => ({ ...prev, adult_walk_in_price: parseFloat(e.target.value) }))}
              placeholder="Enter adult walk-in rate"
            />
          </div>
          <div className="space-y-2">
            <Label>Youth Walk-In Rate (RM)</Label>
            <Input
              type="number"
              min={0}
              step={0.01}
              value={settings.youth_walk_in_price || 0}
              onChange={e => setSettings(prev => ({ ...prev, youth_walk_in_price: parseFloat(e.target.value) }))}
              placeholder="Enter youth walk-in rate"
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  );
};

export default SettingsPage;