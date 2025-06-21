import React, { useState, useEffect } from 'react';
import { X, Ticket, Save, AlertCircle, CheckCircle, User, Calendar, Hash, CreditCard } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { memberService } from '../../services/memberService';

interface CouponDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  coupon: any | null;
  onSuccess: () => void;
}

export function CouponDetailsModal({ isOpen, onClose, coupon, onSuccess }: CouponDetailsModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [members, setMembers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showMemberSearch, setShowMemberSearch] = useState(false);

  const [formData, setFormData] = useState({
    code: '',
    member_id: '',
    entries_remaining: 0,
    expiry_date: '',
    customer_name: ''
  });

  useEffect(() => {
    if (isOpen && coupon) {
      const ownerName = coupon.member?.full_name || coupon.customer_name || '';
      setFormData({
        code: coupon.code,
        member_id: coupon.member_id || '',
        entries_remaining: coupon.entries_remaining,
        expiry_date: coupon.expiry_date,
        customer_name: ownerName
      });
      setSearchQuery(ownerName);
      setError('');
      setSuccess('');
      setIsEditing(false);
      setShowMemberSearch(false);
    }
  }, [isOpen, coupon]);

  const searchMembers = async (query: string) => {
    if (!query.trim()) {
      setMembers([]);
      return;
    }

    try {
      const results = await memberService.searchMembers(query);
      setMembers(results);
    } catch (err: any) {
      console.error('Error searching members:', err);
      setMembers([]);
    }
  };

  const handleMemberSelect = (member: any) => {
    setFormData(prev => ({ 
      ...prev, 
      member_id: member.id,
      customer_name: member.full_name
    }));
    setSearchQuery(member.full_name);
    setShowMemberSearch(false);
    setMembers([]);
  };

  const handleSave = async () => {
    if (!coupon) return;

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Prepare update data
      const updateData: any = {
        code: formData.code.trim(),
        entries_remaining: formData.entries_remaining,
        expiry_date: formData.expiry_date,
        updated_at: new Date().toISOString()
      };

      // Handle member assignment
      if (formData.member_id) {
        updateData.member_id = formData.member_id;
        updateData.customer_name = null; // Clear customer name if member is assigned
      } else if (formData.customer_name.trim()) {
        updateData.member_id = null;
        updateData.customer_name = formData.customer_name.trim();
      } else {
        updateData.member_id = null;
        updateData.customer_name = null;
      }

      console.log('Saving coupon with data:', updateData);
      const { error: updateError } = await supabase
        .from('sold_coupons')
        .update(updateData)
        .eq('id', coupon.id);

      if (updateError) throw updateError;

      setSuccess('Coupon updated successfully!');
      setIsEditing(false);
      onSuccess();
      
      setTimeout(() => {
        setSuccess('');
      }, 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to update coupon.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setIsEditing(false);
    setError('');
    setSuccess('');
    setShowMemberSearch(false);
    setMembers([]);
    onClose();
  };

  const isExpired = () => {
    if (!coupon) return false;
    return new Date(coupon.expiry_date) < new Date() || coupon.entries_remaining <= 0;
  };

  const getStatusConfig = () => {
    if (!coupon) return { color: 'bg-gray-100 text-gray-800', label: 'Unknown' };
    
    if (coupon.entries_remaining > 0 && new Date(coupon.expiry_date) > new Date()) {
      return { color: 'bg-green-100 text-green-800', label: 'Active' };
    } else {
      return { color: 'bg-red-100 text-red-800', label: 'Expired' };
    }
  };

  if (!isOpen || !coupon) return null;

  const statusConfig = getStatusConfig();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[95vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Ticket className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-800">Coupon Details</h2>
              <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-1 ${statusConfig.color}`}>
                {statusConfig.label}
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center px-3 py-2 text-sm font-medium text-orange-600 bg-orange-50 rounded-md hover:bg-orange-100"
              >
                <Save className="h-4 w-4 mr-1" />
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

          {/* Coupon Information */}
          <div className="grid grid-cols-1 gap-6">
            {/* Template Information */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Template Information</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Template:</span>
                  <span className="font-medium">{coupon.template?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Purchase Date:</span>
                  <span className="font-medium">{new Date(coupon.purchase_date).toLocaleDateString()}</span>
                </div>
              </div>
            </div>

            {/* Editable Fields */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Coupon Code
                </label>
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
                    disabled={!isEditing}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500 disabled:bg-gray-50 disabled:text-gray-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Coupon Owner
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={isEditing ? searchQuery : (formData.customer_name || 'No owner assigned')}
                    onChange={(e) => {
                      if (isEditing) {
                        setSearchQuery(e.target.value);
                        setFormData(prev => ({ ...prev, customer_name: e.target.value }));
                        setShowMemberSearch(true);
                        searchMembers(e.target.value);
                        if (!e.target.value) {
                          setFormData(prev => ({ ...prev, member_id: '', customer_name: '' }));
                        }
                      }
                    }}
                    disabled={!isEditing}
                    placeholder="Search member or enter name"
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500 disabled:bg-gray-50 disabled:text-gray-500"
                  />
                  
                  {isEditing && showMemberSearch && members.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                      {members.map((member) => (
                        <button
                          key={member.id}
                          type="button"
                          onClick={() => handleMemberSelect(member)}
                          className="w-full p-3 text-left hover:bg-gray-50 flex items-center space-x-3"
                        >
                          <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                            <User className="h-4 w-4 text-gray-400" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{member.full_name}</p>
                            <p className="text-sm text-gray-500">ID: {member.member_id_string}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {isEditing ? 'Search for a member or enter a customer name' : 'Current coupon owner'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Entries Remaining
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.entries_remaining}
                    onChange={(e) => setFormData(prev => ({ ...prev, entries_remaining: parseInt(e.target.value) || 0 }))}
                    disabled={!isEditing}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500 disabled:bg-gray-50 disabled:text-gray-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Expiry Date
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="date"
                      value={formData.expiry_date}
                      onChange={(e) => setFormData(prev => ({ ...prev, expiry_date: e.target.value }))}
                      disabled={!isEditing}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500 disabled:bg-gray-50 disabled:text-gray-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Usage Information */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-blue-900 mb-3">Usage Information</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-blue-700">Total Entries:</span>
                  <span className="font-medium">{coupon.template?.max_entries || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-700">Used Entries:</span>
                  <span className="font-medium">{(coupon.template?.max_entries || 0) - coupon.entries_remaining}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-700">Remaining Entries:</span>
                  <span className="font-medium">{coupon.entries_remaining}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-700">Days Until Expiry:</span>
                  <span className={`font-medium ${
                    new Date(coupon.expiry_date) < new Date() ? 'text-red-600' : 'text-blue-900'
                  }`}>
                    {Math.ceil((new Date(coupon.expiry_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} days
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        {isEditing && (
          <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
            <button
              onClick={() => {
                setIsEditing(false);
                const ownerName = coupon.member?.full_name || coupon.customer_name || '';
                setFormData({
                  code: coupon.code,
                  member_id: coupon.member_id || '',
                  entries_remaining: coupon.entries_remaining,
                  expiry_date: coupon.expiry_date,
                  customer_name: ownerName
                });
                setSearchQuery(ownerName);
                setShowMemberSearch(false);
                setMembers([]);
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