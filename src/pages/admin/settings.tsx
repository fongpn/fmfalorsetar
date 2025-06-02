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
import type { AppSettings } from '@/types';

const SettingsPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data, error } = await supabase.rpc('get_settings');
        
        if (error) throw error;
        setSettings(data as AppSettings);
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

  const handleSaveSettings = async () => {
    if (!settings) return;
    
    setIsSaving(true);

    try {
      const { error } = await supabase.rpc('update_all_settings', {
        settings_json: settings,
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Settings updated successfully',
      });
    } catch (error) {
      console.error('Error updating settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to update settings',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Settings</h1>
        <div className="space-y-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-1/4" />
                <Skeleton className="h-4 w-1/3" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-10 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        Failed to load settings
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Settings</h1>
        <Button onClick={handleSaveSettings} disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Branding</CardTitle>
            <CardDescription>
              Configure your application's branding settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Logo Text</label>
              <Input
                value={settings.logo_text}
                onChange={e =>
                  setSettings(prev => prev ? {
                    ...prev,
                    logo_text: e.target.value,
                  } : null)
                }
                placeholder="My Gym"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Logo Icon (Emoji)</label>
              <Input
                value={settings.logo_icon || ''}
                onChange={e =>
                  setSettings(prev => prev ? {
                    ...prev,
                    logo_icon: e.target.value,
                  } : null)
                }
                placeholder="💪"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Primary Color</label>
              <Input
                type="color"
                value={settings.primary_color}
                onChange={e =>
                  setSettings(prev => prev ? {
                    ...prev,
                    primary_color: e.target.value,
                  } : null)
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
                  Require device authorization for selected roles
                </p>
              </div>
              <Switch
                checked={settings.fingerprinting_enabled}
                onCheckedChange={checked =>
                  setSettings(prev => prev ? {
                    ...prev,
                    fingerprinting_enabled: checked,
                  } : null)
                }
              />
            </div>
            {settings.fingerprinting_enabled && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Roles Requiring Authorization</label>
                <div className="space-y-2">
                  {allRoles.map(role => (
                    <div key={role} className="flex items-center gap-2">
                      <Switch
                        checked={settings.fingerprinting_roles.includes(role)}
                        onCheckedChange={checked =>
                          setSettings(prev => {
                            if (!prev) return null;
                            const roles = checked
                              ? [...prev.fingerprinting_roles, role]
                              : prev.fingerprinting_roles.filter(r => r !== role);
                            return {
                              ...prev,
                              fingerprinting_roles: roles,
                            };
                          })
                        }
                      />
                      <span className="capitalize">{role}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-medium">Default New User Role</label>
              <select
                value={settings.default_new_user_role}
                onChange={e =>
                  setSettings(prev => prev ? {
                    ...prev,
                    default_new_user_role: e.target.value as any,
                  } : null)
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
            <CardTitle>Pricing</CardTitle>
            <CardDescription>
              Configure walk-in and coupon pricing
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Adult Walk-in Price</label>
                <Input
                  type="number"
                  step="0.01"
                  value={settings.adult_walk_in_price}
                  onChange={e =>
                    setSettings(prev => prev ? {
                      ...prev,
                      adult_walk_in_price: parseFloat(e.target.value),
                    } : null)
                  }
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Youth Walk-in Price</label>
                <Input
                  type="number"
                  step="0.01"
                  value={settings.youth_walk_in_price}
                  onChange={e =>
                    setSettings(prev => prev ? {
                      ...prev,
                      youth_walk_in_price: parseFloat(e.target.value),
                    } : null)
                  }
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Adult Coupon Price</label>
                <Input
                  type="number"
                  step="0.01"
                  value={settings.adult_coupon_price}
                  onChange={e =>
                    setSettings(prev => prev ? {
                      ...prev,
                      adult_coupon_price: parseFloat(e.target.value),
                    } : null)
                  }
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Youth Coupon Price</label>
                <Input
                  type="number"
                  step="0.01"
                  value={settings.youth_coupon_price}
                  onChange={e =>
                    setSettings(prev => prev ? {
                      ...prev,
                      youth_coupon_price: parseFloat(e.target.value),
                    } : null)
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Default Coupon Max Uses</label>
              <Input
                type="number"
                value={settings.coupon_max_uses}
                onChange={e =>
                  setSettings(prev => prev ? {
                    ...prev,
                    coupon_max_uses: parseInt(e.target.value),
                  } : null)
                }
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SettingsPage;