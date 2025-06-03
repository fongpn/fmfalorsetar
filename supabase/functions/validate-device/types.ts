export interface DeviceFingerprint {
  browser: string;
  os: string;
  device: string;
  timestamp: string;
}

export interface AuthorizedDevice {
  id: string;
  user_id: string;
  browser: string;
  os: string;
  device: string;
  authorized_at: string;
  last_used_at: string;
  created_at: string;
  updated_at: string;
}

export interface DeviceAuthorizationRequest {
  id: string;
  user_id: string;
  browser: string;
  os: string;
  device: string;
  timestamp: string;
  requested_at: string;
  status: 'pending' | 'approved' | 'denied';
  reviewed_at: string | null;
  reviewed_by: string | null;
  created_at: string;
  updated_at: string;
} 