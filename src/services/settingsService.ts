import { supabase } from '../lib/supabase';

export interface SystemSetting {
  key: string;
  value: string;
  description?: string;
}

export interface SettingsData {
  // General Settings
  gym_name: string;
  gym_address: string;
  gym_phone: string;
  gym_email: string;
  timezone: string;
  
  // Financial Settings
  walk_in_rate: number;
  walk_in_student_rate: number;
  registration_fee_default: number;
  grace_period_days: number;
  late_fee_amount: number;
  
  // Notification Settings
  email_notifications: boolean;
  sms_notifications: boolean;
  expiry_reminder_days: number;
  low_stock_threshold: number;
  
  // Security Settings
  session_timeout: number;
  require_password_change: boolean;
  two_factor_auth: boolean;
}

class SettingsService {
  async getAllSettings(): Promise<SettingsData> {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('key, value');

      if (error) throw error;

      // Convert array of settings to object with default values
      const settingsMap: { [key: string]: string } = {};
      data?.forEach(setting => {
        settingsMap[setting.key] = setting.value;
      });

      return {
        // General Settings
        gym_name: settingsMap.gym_name || 'FMF Gym',
        gym_address: settingsMap.gym_address || '123 Fitness Street, City, State 12345',
        gym_phone: settingsMap.gym_phone || '+60 12-345 6789',
        gym_email: settingsMap.gym_email || 'info@fmfgym.com',
        timezone: settingsMap.timezone || 'Asia/Kuala_Lumpur',
        
        // Financial Settings
        walk_in_rate: parseFloat(settingsMap.walk_in_rate) || 15.00,
        walk_in_student_rate: parseFloat(settingsMap.walk_in_student_rate) || 8.00,
        registration_fee_default: parseFloat(settingsMap.registration_fee_default) || 50.00,
        grace_period_days: parseInt(settingsMap.grace_period_days) || 7,
        late_fee_amount: parseFloat(settingsMap.late_fee_amount) || 10.00,
        
        // Notification Settings
        email_notifications: settingsMap.email_notifications === 'true',
        sms_notifications: settingsMap.sms_notifications === 'true',
        expiry_reminder_days: parseInt(settingsMap.expiry_reminder_days) || 7,
        low_stock_threshold: parseInt(settingsMap.low_stock_threshold) || 10,
        
        // Security Settings
        session_timeout: parseInt(settingsMap.session_timeout) || 60,
        require_password_change: settingsMap.require_password_change === 'true',
        two_factor_auth: settingsMap.two_factor_auth === 'true'
      };
    } catch (error: any) {
      throw new Error(`Failed to load settings: ${error.message}`);
    }
  }

  async updateSettings(settings: SettingsData): Promise<{ success: boolean; message: string }> {
    try {
      // Convert settings object to array of key-value pairs
      const settingsArray: SystemSetting[] = [
        // General Settings
        { key: 'gym_name', value: settings.gym_name, description: 'Gym name displayed throughout the system' },
        { key: 'gym_address', value: settings.gym_address, description: 'Physical address of the gym' },
        { key: 'gym_phone', value: settings.gym_phone, description: 'Primary contact phone number' },
        { key: 'gym_email', value: settings.gym_email, description: 'Primary contact email address' },
        { key: 'timezone', value: settings.timezone, description: 'System timezone for date/time display' },
        
        // Financial Settings
        { key: 'walk_in_rate', value: settings.walk_in_rate.toString(), description: 'Daily rate for walk-in gym access' },
        { key: 'walk_in_student_rate', value: settings.walk_in_student_rate.toString(), description: 'Daily rate for student walk-in gym access' },
        { key: 'registration_fee_default', value: settings.registration_fee_default.toString(), description: 'Default one-time registration fee for new members' },
        { key: 'grace_period_days', value: settings.grace_period_days.toString(), description: 'Number of days members can access gym after membership expires' },
        { key: 'late_fee_amount', value: settings.late_fee_amount.toString(), description: 'Late fee amount for overdue payments' },
        
        // Notification Settings
        { key: 'email_notifications', value: settings.email_notifications.toString(), description: 'Enable email notifications' },
        { key: 'sms_notifications', value: settings.sms_notifications.toString(), description: 'Enable SMS notifications' },
        { key: 'expiry_reminder_days', value: settings.expiry_reminder_days.toString(), description: 'Days before membership expiry to send reminders' },
        { key: 'low_stock_threshold', value: settings.low_stock_threshold.toString(), description: 'Stock level threshold for low stock alerts' },
        
        // Security Settings
        { key: 'session_timeout', value: settings.session_timeout.toString(), description: 'Session timeout in minutes' },
        { key: 'require_password_change', value: settings.require_password_change.toString(), description: 'Force users to change password on next login' },
        { key: 'two_factor_auth', value: settings.two_factor_auth.toString(), description: 'Require two-factor authentication for all staff accounts' }
      ];

      // Update each setting using upsert
      for (const setting of settingsArray) {
        const { error } = await supabase
          .from('system_settings')
          .upsert({
            key: setting.key,
            value: setting.value,
            description: setting.description,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'key'
          });

        if (error) throw error;
      }

      return {
        success: true,
        message: 'Settings saved successfully!'
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Failed to save settings: ${error.message}`
      };
    }
  }

  async getSetting(key: string): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', key)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        throw error;
      }

      return data.value;
    } catch (error: any) {
      throw new Error(`Failed to get setting ${key}: ${error.message}`);
    }
  }

  async updateSetting(key: string, value: string, description?: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('system_settings')
        .upsert({
          key,
          value,
          description,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'key'
        });

      if (error) throw error;
    } catch (error: any) {
      throw new Error(`Failed to update setting ${key}: ${error.message}`);
    }
  }
}

export const settingsService = new SettingsService();