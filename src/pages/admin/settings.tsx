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
import type { AppSettings, UserRole, MembershipPlan, MembershipType } from '@/types';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useForm } from 'react-hook-form';
import { auditHelpers } from '@/lib/audit';

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
  const [isSaving, setIsSaving] = useState(false);
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [membershipPlans, setMembershipPlans] = useState<MembershipPlan[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const addForm = useForm<Partial<MembershipPlan>>({
    defaultValues: {
      type: 'standard',
      months: 1,
      price: 0,
      registration_fee: 0,
      free_months: 0,
      active: true,
    },
  });

  useEffect(() => {
    fetchSettings();
    fetchMembershipPlans();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase.rpc('get_settings');
      if (error) throw error;
      if (data) {
        setSettings(data as AppSettings);
      }
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

  const fetchMembershipPlans = async () => {
    try {
      const { data, error } = await supabase
        .from('membership_plans')
        .select('*')
        .order('type');
      
      if (error) throw error;
      setMembershipPlans((data || []).map(plan => ({
        ...plan,
        type: plan.type as MembershipType
      })));
    } catch (error) {
      console.error('Error fetching membership plans:', error);
      toast({
        title: 'Error',
        description: 'Failed to load membership plans',
        variant: 'destructive',
      });
    }
  };

  const handleMembershipPlanChange = async (type: MembershipType, field: keyof MembershipPlan, value: any) => {
    try {
      const existingPlan = membershipPlans.find(p => p.type === type);
      
      if (existingPlan) {
        // Update existing plan
        const { error } = await supabase
          .from('membership_plans')
          .update({ [field]: value })
          .eq('id', existingPlan.id);
        
        if (error) throw error;
        
        setMembershipPlans(prev => 
          prev.map(p => p.id === existingPlan.id ? { ...p, [field]: value } : p)
        );
      } else {
        // Create new plan
        const { data, error } = await supabase
          .from('membership_plans')
          .insert({
            type,
            months: field === 'months' ? value : 1,
            price: field === 'price' ? value : 0,
            registration_fee: field === 'registration_fee' ? value : 0,
            free_months: field === 'free_months' ? value : 0,
            active: field === 'active' ? value : true,
          })
          .select()
          .single();
        
        if (error) throw error;
        
        setMembershipPlans(prev => [...prev, { ...data, type: data.type as MembershipType }]);
      }
    } catch (error) {
      console.error('Error updating membership plan:', error);
      toast({
        title: 'Error',
        description: 'Failed to update membership plan',
        variant: 'destructive',
      });
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase.rpc('update_settings', { settings });
      if (error) throw error;

      // Create audit log for settings change
      if (user) {
        await auditHelpers.settingsChange(
          user.id,
          'membership_plans_and_settings',
          null,
          {
            membership_plans: membershipPlans,
            settings: {
              grace_period_days: settings.grace_period_days,
              adult_walk_in_price: settings.adult_walk_in_price,
              youth_walk_in_price: settings.youth_walk_in_price
            }
          }
        );
      }

      toast({
        title: 'Success',
        description: 'Settings saved successfully',
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

  const handleAddPlan = async (values: Partial<MembershipPlan>) => {
    try {
      const { data, error } = await supabase
        .from('membership_plans')
        .insert([
          {
            type: values.type as string,
            months: values.months ?? 1,
            price: values.price ?? 0,
            registration_fee: values.registration_fee ?? 0,
            free_months: values.free_months ?? 0,
            active: values.active ?? true,
          }
        ])
        .select()
        .single();
      if (error) throw error;
      setMembershipPlans(prev => [...prev, { ...data, type: data.type as MembershipType }]);
      setIsAddModalOpen(false);
      addForm.reset();
      toast({ title: 'Success', description: 'Membership plan added.' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to add membership plan', variant: 'destructive' });
    }
  };

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

      <Card>
        <CardHeader>
          <CardTitle>Coupon Settings</CardTitle>
          <CardDescription>
            Configure coupon pricing and usage limits
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Adult Coupon Price (RM)</Label>
            <Input
              type="number"
              min={0}
              step={0.01}
              value={settings.adult_coupon_price || 0}
              onChange={e => setSettings(prev => ({ ...prev, adult_coupon_price: parseFloat(e.target.value) }))}
              placeholder="Enter adult coupon price"
            />
          </div>
          <div className="space-y-2">
            <Label>Youth Coupon Price (RM)</Label>
            <Input
              type="number"
              min={0}
              step={0.01}
              value={settings.youth_coupon_price || 0}
              onChange={e => setSettings(prev => ({ ...prev, youth_coupon_price: parseFloat(e.target.value) }))}
              placeholder="Enter youth coupon price"
            />
          </div>
          <div className="space-y-2">
            <Label>Maximum Coupon Uses</Label>
            <Input
              type="number"
              min={1}
              value={settings.coupon_max_uses || 1}
              onChange={e => setSettings(prev => ({ ...prev, coupon_max_uses: parseInt(e.target.value, 10) }))}
              placeholder="Enter maximum number of uses per coupon"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Membership Package Settings</CardTitle>
          <CardDescription>
            Configure membership package types and pricing
          </CardDescription>
          <Button className="mt-4" onClick={() => setIsAddModalOpen(true)}>
            Add Membership Plan
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {membershipPlans.map((plan) => (
              <div key={plan.id} className="border rounded-lg p-4 space-y-4">
                <h3 className="font-medium capitalize">{plan.type} Package</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Duration (months)</Label>
                    <Input
                      type="number"
                      min={1}
                      value={plan.months}
                      onChange={e => handleMembershipPlanChange(plan.type, 'months', parseInt(e.target.value, 10))}
                      placeholder="Enter duration in months"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Price (RM)</Label>
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      value={plan.price}
                      onChange={e => handleMembershipPlanChange(plan.type, 'price', parseFloat(e.target.value))}
                      placeholder="Enter price"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Registration Fee (RM)</Label>
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      value={plan.registration_fee}
                      onChange={e => handleMembershipPlanChange(plan.type, 'registration_fee', parseFloat(e.target.value))}
                      placeholder="Enter registration fee"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Free Months</Label>
                    <Input
                      type="number"
                      min={0}
                      value={plan.free_months}
                      onChange={e => handleMembershipPlanChange(plan.type, 'free_months', parseInt(e.target.value, 10))}
                      placeholder="Enter number of free months"
                    />
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={plan.active}
                    onCheckedChange={(checked) => handleMembershipPlanChange(plan.type, 'active', checked)}
                  />
                  <Label>Active</Label>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Membership Plan</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={addForm.handleSubmit(handleAddPlan)}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label>Type</Label>
              <Input {...addForm.register('type', { required: true })} placeholder="e.g. standard, premium, family, student" />
            </div>
            <div className="space-y-2">
              <Label>Duration (months)</Label>
              <Input type="number" min={1} {...addForm.register('months', { valueAsNumber: true, required: true })} />
            </div>
            <div className="space-y-2">
              <Label>Price (RM)</Label>
              <Input type="number" min={0} step={0.01} {...addForm.register('price', { valueAsNumber: true, required: true })} />
            </div>
            <div className="space-y-2">
              <Label>Registration Fee (RM)</Label>
              <Input type="number" min={0} step={0.01} {...addForm.register('registration_fee', { valueAsNumber: true, required: true })} />
            </div>
            <div className="space-y-2">
              <Label>Free Months</Label>
              <Input type="number" min={0} {...addForm.register('free_months', { valueAsNumber: true, required: true })} />
            </div>
            <div className="flex items-center space-x-2">
              <Switch checked={addForm.watch('active')} onCheckedChange={checked => addForm.setValue('active', checked)} />
              <Label>Active</Label>
            </div>
            <DialogFooter>
              <Button type="submit">Add Plan</Button>
              <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)}>Cancel</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SettingsPage;