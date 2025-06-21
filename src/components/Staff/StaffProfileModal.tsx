import React, { useState, useEffect } from 'react';
import { X, User, Mail, Shield, Save, AlertCircle, CheckCircle, Key, Edit3 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface StaffProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  staff: any | null;
  onSuccess: () => void;
}

export function StaffProfileModal({ isOpen, onClose, staff, onSuccess }: StaffProfileModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const { profile: currentUser } = useAuth();

  const [formData, setFormData] = useState({
    full_name: '',
    role: 'CS' as 'ADMIN' | 'CS'
  });

  useEffect(() => {
    if (isOpen && staff) {
      setFormData({
        full_name: staff.full_name,
        role: staff.role
      });
      setError('');
      setSuccess('');
      setIsEditing(false);
      setShowPasswordReset(false);
      setNewPassword('');
    }
  }, [isOpen, staff]);

  const handleSave = async () => {
    if (!staff) return;

    if (!formData.full_name.trim()) {
      setError('Full name is required');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name,
          role: formData.role,
          updated_at: new Date().toISOString()
        })
        .eq('id', staff.id);

      if (updateError) throw updateError;

      setSuccess('Staff profile updated successfully!');
      setIsEditing(false);
      onSuccess();
      
      setTimeout(() => {
        setSuccess('');
      }, 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to update staff profile.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!staff) return;

    if (!newPassword.trim()) {
      setError('New password is required');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Use Supabase Admin API to update user password
      const { error: passwordError } = await supabase.auth.admin.updateUserById(
        staff.id,
        { password: newPassword }
      );

      if (passwordError) throw passwordError;

      setSuccess('Password reset successfully!');
      setShowPasswordReset(false);
      setNewPassword('');
      
      setTimeout(() => {
        setSuccess('');
      }, 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to reset password.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setIsEditing(false);
    setShowPasswordReset(false);
    setError('');
    setSuccess('');
    setNewPassword('');
    onClose();
  };

  const getRoleConfig = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return {
          color: 'bg-red-100 text-red-800 border-red-200',
          icon: Shield,
          label: 'Administrator'
        };
      case 'CS':
        return {
          color: 'bg-blue-100 text-blue-800 border-blue-200',
          icon: User,
          label: 'Customer Service'
        };
      default:
        return {
          color: 'bg-gray-100 text-gray-800 border-gray-200',
          icon: User,
          label: role
        };
    }
  };

  const canEdit = currentUser?.role === 'ADMIN';

  if (!isOpen || !staff) return null;

  const roleConfig = getRoleConfig(staff.role);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[95vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
              <User className="h-6 w-6 text-gray-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-800">Staff Profile</h2>
              <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-1 border ${roleConfig.color}`}>
                <roleConfig.icon className="h-3 w-3 mr-1" />
                {roleConfig.label}
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {canEdit && !isEditing && !showPasswordReset && (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center px-3 py-2 text-sm font-medium text-orange-600 bg-orange-50 rounded-md hover:bg-orange-100"
              >
                <Edit3 className="h-4 w-4 mr-1" />
                Edit
              </button>
            )}
            <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 rounded-full p-1">
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto p-6 space-y-6">
          {/* Status Messages */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-2">
              <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {success && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-start space-x-2">
              <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-green-700">{success}</p>
            </div>
          )}

          {!canEdit && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-700">
                You don't have permission to edit staff profiles. Only administrators can modify staff information.
              </p>
            </div>
          )}

          {/* Staff Information */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                  disabled={!isEditing}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500 disabled:bg-gray-50 disabled:text-gray-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="email"
                  value={staff.email || 'No email available'}
                  disabled
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
            </div>

            {isEditing && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                <div className="space-y-3">
                  <label className={`flex items-center p-4 border rounded-lg cursor-pointer transition-colors ${
                    formData.role === 'ADMIN'
                      ? 'border-red-500 bg-red-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}>
                    <input
                      type="radio"
                      name="role"
                      value="ADMIN"
                      checked={formData.role === 'ADMIN'}
                      onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value as 'ADMIN' | 'CS' }))}
                      className="sr-only"
                    />
                    <div className="flex items-center">
                      <Shield className="h-5 w-5 text-red-600 mr-3" />
                      <div>
                        <h4 className="font-medium text-gray-900">Administrator</h4>
                        <p className="text-sm text-gray-500">Full system access and management</p>
                      </div>
                    </div>
                  </label>

                  <label className={`flex items-center p-4 border rounded-lg cursor-pointer transition-colors ${
                    formData.role === 'CS'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}>
                    <input
                      type="radio"
                      name="role"
                      value="CS"
                      checked={formData.role === 'CS'}
                      onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value as 'ADMIN' | 'CS' }))}
                      className="sr-only"
                    />
                    <div className="flex items-center">
                      <User className="h-5 w-5 text-blue-600 mr-3" />
                      <div>
                        <h4 className="font-medium text-gray-900">Customer Service</h4>
                        <p className="text-sm text-gray-500">Member management and daily operations</p>
                      </div>
                    </div>
                  </label>
                </div>
              </div>
            )}

            {!isEditing && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <div className={`inline-flex items-center px-3 py-2 rounded-lg border ${roleConfig.color}`}>
                  <roleConfig.icon className="h-4 w-4 mr-2" />
                  <span className="font-medium">{roleConfig.label}</span>
                </div>
              </div>
            )}
          </div>

          {/* Account Information */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Account Information</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Created:</span>
                <span className="font-medium">{new Date(staff.created_at).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Last Updated:</span>
                <span className="font-medium">{new Date(staff.updated_at).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Staff ID:</span>
                <span className="font-medium font-mono text-xs">{staff.id.slice(0, 8)}...</span>
              </div>
            </div>
          </div>

          {/* Password Reset Section */}
          {canEdit && !isEditing && (
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-amber-900 mb-3">Password Management</h3>
              
              {!showPasswordReset ? (
                <div>
                  <p className="text-sm text-amber-700 mb-3">
                    Reset the staff member's password. They will need to use the new password to log in.
                  </p>
                  <button
                    onClick={() => setShowPasswordReset(true)}
                    className="flex items-center px-4 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700 font-medium"
                  >
                    <Key className="h-4 w-4 mr-2" />
                    Reset Password
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-amber-900 mb-2">New Password</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password"
                      className="w-full px-3 py-2 border border-amber-300 rounded-md focus:ring-amber-500 focus:border-amber-500"
                      minLength={6}
                    />
                    <p className="text-xs text-amber-600 mt-1">Minimum 6 characters</p>
                  </div>

                  <div className="flex space-x-2">
                    <button
                      onClick={() => {
                        setShowPasswordReset(false);
                        setNewPassword('');
                        setError('');
                      }}
                      className="flex-1 px-4 py-2 text-amber-600 bg-white border border-amber-300 rounded-md hover:bg-amber-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handlePasswordReset}
                      disabled={loading || !newPassword.trim() || newPassword.length < 6}
                      className="flex-1 px-4 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700 disabled:opacity-50"
                    >
                      {loading ? 'Resetting...' : 'Reset Password'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        {isEditing && (
          <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
            <button
              onClick={() => {
                setIsEditing(false);
                setFormData({
                  full_name: staff.full_name,
                  role: staff.role
                });
                setError('');
              }}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              className="flex items-center px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-md hover:bg-orange-700 disabled:opacity-50"
            >
              {loading && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>}
              <Save className="h-4 w-4 mr-1" />
              Save Changes
            </button>
          </div>
        )}
      </div>
    </div>
  );
}