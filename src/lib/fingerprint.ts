import { supabase } from './supabase';
import type { DeviceFingerprint } from '@/types';

// Helper function to get browser information
const getBrowser = (): string => {
  const userAgent = navigator.userAgent;
  let browserName = 'Unknown';

  if (userAgent.match(/chrome|chromium|crios/i)) {
    browserName = 'Chrome';
  } else if (userAgent.match(/firefox|fxios/i)) {
    browserName = 'Firefox';
  } else if (userAgent.match(/safari/i)) {
    browserName = 'Safari';
  } else if (userAgent.match(/opr\//i)) {
    browserName = 'Opera';
  } else if (userAgent.match(/edg/i)) {
    browserName = 'Edge';
  }

  return browserName;
};

// Helper function to get OS information
const getOS = (): string => {
  const userAgent = navigator.userAgent;
  let osName = 'Unknown';

  if (userAgent.indexOf('Win') !== -1) {
    osName = 'Windows';
  } else if (userAgent.indexOf('Mac') !== -1) {
    osName = 'MacOS';
  } else if (userAgent.indexOf('Linux') !== -1) {
    osName = 'Linux';
  } else if (userAgent.indexOf('Android') !== -1) {
    osName = 'Android';
  } else if (userAgent.indexOf('iOS') !== -1 || /iPad|iPhone|iPod/.test(userAgent)) {
    osName = 'iOS';
  }

  return osName;
};

// Helper function to get device information
const getDevice = (): string => {
  const userAgent = navigator.userAgent;
  let deviceType = 'Unknown';

  if (/iPad|iPhone|iPod/.test(userAgent)) {
    deviceType = 'iOS Device';
  } else if (userAgent.match(/Android/i)) {
    deviceType = 'Android Device';
  } else if (userAgent.match(/webOS/i)) {
    deviceType = 'webOS Device';
  } else {
    if (window.innerWidth <= 768) {
      deviceType = 'Mobile';
    } else if (window.innerWidth <= 1024) {
      deviceType = 'Tablet';
    } else {
      deviceType = 'Desktop';
    }
  }

  return deviceType;
};

// Generate device fingerprint
export const generateFingerprint = (): DeviceFingerprint => {
  return {
    browser: getBrowser(),
    os: getOS(),
    device: getDevice(),
    timestamp: new Date().toISOString(),
  };
};

// Validate device fingerprint with Supabase
export const validateDeviceFingerprint = async (userId: string): Promise<{
  isAuthorized: boolean;
  requestId?: string;
  message?: string;
}> => {
  try {
    const fingerprint = generateFingerprint();
    console.log('Validating device fingerprint:', { userId, fingerprint });
    
    // Call the Supabase Edge Function to validate the device
    const { data, error } = await supabase.functions.invoke('validate-device', {
      body: { userId, fingerprint },
    });

    if (error) {
      console.error('Error validating device fingerprint:', error);
      // Don't block access on validation error
      return { isAuthorized: true, message: 'Error validating device, allowing access' };
    }

    console.log('Device validation response:', data);
    return data;
  } catch (error) {
    console.error('Unexpected error during device validation:', error);
    // Don't block access on unexpected errors
    return { isAuthorized: true, message: 'Unexpected error during device validation, allowing access' };
  }
};

// Request device authorization
export const requestDeviceAuthorization = async (userId: string): Promise<{
  success: boolean;
  requestId?: string;
  message?: string;
}> => {
  try {
    const fingerprint = generateFingerprint();
    
    // Insert a new device authorization request
    const { data, error } = await supabase
      .from('device_authorization_requests')
      .insert({
        user_id: userId,
        browser: fingerprint.browser,
        os: fingerprint.os,
        device: fingerprint.device,
        timestamp: fingerprint.timestamp,
        requested_at: new Date().toISOString(),
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      console.error('Error requesting device authorization:', error);
      return { success: false, message: 'Error requesting device authorization' };
    }

    return { success: true, requestId: data.id };
  } catch (error) {
    console.error('Unexpected error during device authorization request:', error);
    return { success: false, message: 'Unexpected error during device authorization request' };
  }
};

// Check device authorization status
export const checkDeviceAuthorizationStatus = async (requestId: string): Promise<{
  status: 'pending' | 'approved' | 'denied';
  message?: string;
}> => {
  try {
    const { data, error } = await supabase
      .from('device_authorization_requests')
      .select('status')
      .eq('id', requestId)
      .single();

    if (error) {
      console.error('Error checking device authorization status:', error);
      return { status: 'pending', message: 'Error checking status' };
    }

    return { status: data.status as 'pending' | 'approved' | 'denied' };
  } catch (error) {
    console.error('Unexpected error checking device authorization status:', error);
    return { status: 'pending', message: 'Unexpected error checking status' };
  }
};

// Subscribe to device authorization status changes
export const subscribeToDeviceStatus = (
  requestId: string,
  callback: (status: 'pending' | 'approved' | 'denied') => void
) => {
  const subscription = supabase
    .channel(`device_request_${requestId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'device_authorization_requests',
        filter: `id=eq.${requestId}`,
      },
      (payload) => {
        callback(payload.new.status);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(subscription);
  };
};