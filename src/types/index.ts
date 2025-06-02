export type UserRole = 'admin' | 'superadmin' | 'cashier';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  active: boolean;
  created_at: string;
  updated_at: string;
  name?: string;
  last_login_at?: string;
}

export interface Member {
  id: string;
  member_id: string;
  name: string;
  email?: string;
  phone?: string;
  nric: string;
  address?: string;
  photo_url?: string;
  membership_type: MembershipType;
  start_date: string;
  end_date: string;
  status: MemberStatus;
  registration_fee_paid: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
  created_by: string;
}

export type MembershipType = 'standard' | 'premium' | 'family' | 'student';
export type MemberStatus = 'active' | 'grace' | 'expired' | 'suspended';

export interface MembershipPlan {
  id: string;
  type: MembershipType;
  months: number;
  price: number;
  registration_fee: number;
  free_months: number;
  active: boolean;
}

export interface CheckIn {
  id: string;
  member_id: string;
  check_in_time: string;
  created_by: string;
  is_grace_period: boolean;
  grace_period_charge?: number;
}

export interface WalkIn {
  id: string;
  name?: string;
  age_group: 'adult' | 'youth';
  amount: number;
  payment_method: PaymentMethod;
  created_at: string;
  created_by: string;
}

export interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  stock: number;
  image_url?: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export type PaymentMethod = 'cash' | 'qr' | 'bank_transfer';

export interface Sale {
  id: string;
  items: CartItem[];
  total: number;
  payment_method: PaymentMethod;
  created_at: string;
  created_by: string;
  shift_id: string;
}

export interface StockUpdate {
  id: string;
  product_id: string;
  previous_stock: number;
  new_stock: number;
  reason: string;
  created_at: string;
  created_by: string;
}

export interface Coupon {
  id: string;
  code: string;
  type: 'adult' | 'youth';
  price: number;
  valid_from: string;
  valid_to: string;
  max_uses: number;
  current_uses: number;
  active: boolean;
  owner_name: string;
  created_at: string;
  created_by: string;
}

export interface CouponUse {
  id: string;
  coupon_id: string;
  used_at: string;
  used_by: string;
}

export interface Shift {
  id: string;
  user_id: string;
  start_time: string;
  end_time?: string;
  declared_cash?: number;
  declared_qr?: number;
  declared_bank_transfer?: number;
  system_cash?: number;
  system_qr?: number;
  system_bank_transfer?: number;
  notes?: string;
  handover_to?: string;
  manually_ended?: boolean;
  manually_ended_by?: string;
}

export interface DeviceFingerprint {
  browser: string;
  os: string;
  device: string;
  ip?: string;
  location?: string;
  timestamp: string;
}

export interface DeviceAuthRequest {
  id: string;
  user_id: string;
  fingerprint: DeviceFingerprint;
  status: 'pending' | 'approved' | 'denied';
  requested_at: string;
  processed_at?: string;
  processed_by?: string;
}

export interface AuthorizedDevice {
  id: string;
  user_id: string;
  fingerprint: DeviceFingerprint;
  authorized_at: string;
  authorized_by?: string;
}

export interface AppSettings {
  fingerprinting_enabled: boolean;
  fingerprinting_roles: UserRole[];
  default_new_user_role: UserRole;
  logo_text: string;
  logo_icon: string;
  primary_color: string;
  logo_url?: string;
  adult_walk_in_price: number;
  youth_walk_in_price: number;
  adult_coupon_price: number;
  youth_coupon_price: number;
  coupon_max_uses: number;
}

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

export interface FinancialReport {
  registrations: number;
  renewals: number;
  walkIns: number;
  pos: number;
  coupons: number;
  totalCash: number;
  totalQr: number;
  totalBankTransfer: number;
  totalRevenue: number;
}

export interface SalesReport {
  totalSales: number;
  productPerformance: {
    product_id: string;
    product_name: string;
    quantity_sold: number;
    revenue: number;
  }[];
  stockStatus: {
    product_id: string;
    product_name: string;
    current_stock: number;
    low_stock: boolean;
  }[];
}

export interface MembershipReport {
  newMembers: number;
  renewals: {
    type: MembershipType;
    count: number;
  }[];
}

export interface AttendanceReport {
  members: number;
  walkIns: number;
  total: number;
}