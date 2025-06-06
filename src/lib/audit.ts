import { supabase } from './supabase'

export type AuditLogType = 'success' | 'warning' | 'error' | 'info'

export type AuditAction = 
  | 'member_registration'
  | 'member_renewal'
  | 'member_import'
  | 'walk_in'
  | 'payment'
  | 'shift_start'
  | 'shift_end'
  | 'shift_handover'
  | 'settings_change'
  | 'user_management'
  | 'device_authorization'
  | 'coupon_creation'
  | 'coupon_usage'
  | 'product_management'
  | 'stock_adjustment'

interface CreateAuditLogParams {
  type: AuditLogType
  action: AuditAction
  description: string
  userId: string
  metadata?: Record<string, any>
}

export async function createAuditLog({ type, action, description, userId, metadata }: CreateAuditLogParams) {
  try {
    const { error } = await supabase
      .from('audit_log')
      .insert({
        type,
        action,
        description,
        user_id: userId,
        metadata: {
          ...metadata,
          action,
          timestamp: new Date().toISOString()
        }
      })

    if (error) {
      console.error('Error creating audit log:', error)
    }
  } catch (error) {
    console.error('Error creating audit log:', error)
  }
}

// Helper functions for common audit actions
export const auditHelpers = {
  memberRegistration: (userId: string, memberId: string, memberName: string, metadata?: Record<string, any>) => 
    createAuditLog({
      type: 'success',
      action: 'member_registration',
      description: `Registered new member: ${memberName} (${memberId})`,
      userId,
      metadata
    }),

  memberRenewal: (userId: string, memberId: string, memberName: string, metadata?: Record<string, any>) =>
    createAuditLog({
      type: 'success',
      action: 'member_renewal',
      description: `Renewed membership for: ${memberName} (${memberId})`,
      userId,
      metadata
    }),

  memberImport: (userId: string, memberId: string, memberName: string, metadata?: Record<string, any>) =>
    createAuditLog({
      type: 'success',
      action: 'member_import',
      description: `Imported member: ${memberName} (${memberId})`,
      userId,
      metadata
    }),

  walkIn: (userId: string, name: string, ageGroup: string, amount: number, metadata?: Record<string, any>) =>
    createAuditLog({
      type: 'success',
      action: 'walk_in',
      description: `Recorded walk-in for ${name || 'Anonymous'} (${ageGroup}) - RM${amount.toFixed(2)}`,
      userId,
      metadata
    }),

  payment: (userId: string, amount: number, method: string, purpose: string, metadata?: Record<string, any>) =>
    createAuditLog({
      type: 'success',
      action: 'payment',
      description: `Recorded ${purpose} payment of RM${amount.toFixed(2)} via ${method}`,
      userId,
      metadata
    }),

  shiftStart: (userId: string, shiftId: string, metadata?: Record<string, any>) =>
    createAuditLog({
      type: 'info',
      action: 'shift_start',
      description: 'Started new shift',
      userId,
      metadata: { ...metadata, shiftId }
    }),

  shiftEnd: (userId: string, shiftId: string, metadata?: Record<string, any>) =>
    createAuditLog({
      type: 'info',
      action: 'shift_end',
      description: 'Ended shift',
      userId,
      metadata: { ...metadata, shiftId }
    }),

  shiftHandover: (userId: string, shiftId: string, toUserId: string, metadata?: Record<string, any>) =>
    createAuditLog({
      type: 'info',
      action: 'shift_handover',
      description: 'Handed over shift',
      userId,
      metadata: { ...metadata, shiftId, toUserId }
    }),

  settingsChange: (userId: string, setting: string, oldValue: any, newValue: any, metadata?: Record<string, any>) =>
    createAuditLog({
      type: 'warning',
      action: 'settings_change',
      description: `Changed setting: ${setting}`,
      userId,
      metadata: { ...metadata, oldValue, newValue }
    }),

  userManagement: (userId: string, action: string, targetUserId: string, metadata?: Record<string, any>) =>
    createAuditLog({
      type: 'warning',
      action: 'user_management',
      description: `${action} user`,
      userId,
      metadata: { ...metadata, targetUserId }
    }),

  deviceAuthorization: (userId: string, action: string, deviceId: string, metadata?: Record<string, any>) =>
    createAuditLog({
      type: 'warning',
      action: 'device_authorization',
      description: `${action} device authorization`,
      userId,
      metadata: { ...metadata, deviceId }
    }),

  couponCreation: (userId: string, couponCode: string, metadata?: Record<string, any>) =>
    createAuditLog({
      type: 'success',
      action: 'coupon_creation',
      description: `Created coupon: ${couponCode}`,
      userId,
      metadata
    }),

  couponUsage: (userId: string, couponCode: string, metadata?: Record<string, any>) =>
    createAuditLog({
      type: 'success',
      action: 'coupon_usage',
      description: `Used coupon: ${couponCode}`,
      userId,
      metadata
    }),

  productManagement: (userId: string, action: string, productName: string, metadata?: Record<string, any>) =>
    createAuditLog({
      type: 'warning',
      action: 'product_management',
      description: `${action} product: ${productName}`,
      userId,
      metadata
    }),

  stockAdjustment: (userId: string, productName: string, oldStock: number, newStock: number, metadata?: Record<string, any>) =>
    createAuditLog({
      type: 'warning',
      action: 'stock_adjustment',
      description: `Adjusted stock for ${productName}: ${oldStock} → ${newStock}`,
      userId,
      metadata
    })
} 