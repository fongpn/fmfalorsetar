import React, { useState, useEffect } from 'react';
import { X, Ticket, Save, AlertCircle, Search, User, Banknote, QrCode, Smartphone } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { memberService } from '../../services/memberService';
import { useShift } from '../../hooks/useShift';
import { useAuth } from '../../contexts/AuthContext';

interface SellCouponModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function SellCouponModal({ isOpen, onClose, onSuccess }: SellCouponModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [templates, setTemplates] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showMemberSearch, setShowMemberSearch] = useState(false);
  const [nextCouponNumber, setNextCouponNumber] = useState<number>(1);
  const { activeShift } = useShift();
  const { profile } = useAuth();

  const [formData, setFormData] = useState({
    template_id: '',
    coupon_code: '',
    member_id: '',
    payment_method: 'CASH',
    customer_name: ''
  });

  useEffect(() => {
    if (isOpen) {
      loadTemplates();
      loadNextCouponNumber();
      setSearchQuery('');
      setMembers([]);
      setShowMemberSearch(false);
      setError('');
    }
  }, [isOpen]);

  useEffect(() => {
    // Set default template when templates are loaded
    if (templates.length > 0 && !formData.template_id) {
      // Find the 6-Visit template or use the first one
      const defaultTemplate = templates.find(t => 
        t.name.toLowerCase().includes('6') && 
        t.name.toLowerCase().includes('visit')
      ) || templates[0];
      
      if (defaultTemplate) {
        setFormData(prev => ({ 
          ...prev, 
          template_id: defaultTemplate.id,
          coupon_code: generateNextCouponCode()
        }));
      }
    }
  }, [templates, nextCouponNumber]);

  const loadNextCouponNumber = async () => {
    try {
      // Get the highest existing coupon code number
      const { data, error } = await supabase
        .from('sold_coupons')
        .select('code')
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) throw error;

      let nextNumber = 1;
      if (data && data.length > 0) {
        // Extract number from the last coupon code (assuming format like "1234" or "CPN-1234")
        const lastCode = data[0].code;
        const numberMatch = lastCode.match(/(\d{4})$/); // Get last 4 digits
        if (numberMatch) {
          const lastNumber = parseInt(numberMatch[1]);
          nextNumber = lastNumber + 1;
        }
      }

      setNextCouponNumber(nextNumber);
    } catch (err: any) {
      console.error('Error loading next coupon number:', err);
      setNextCouponNumber(1); // Fallback to 1
    }
  };
  const loadTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('coupon_templates')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setTemplates(data || []);
    } catch (err: any) {
      setError('Failed to load coupon templates');
    }
  };

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

  const generateNextCouponCode = () => {
    // Generate 4-digit padded number
    return nextCouponNumber.toString().padStart(4, '0');
  };

  const generateNewCouponCode = () => {
    const newCode = generateNextCouponCode();
    setFormData(prev => ({ ...prev, coupon_code: newCode }));
    setNextCouponNumber(prev => prev + 1);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!activeShift) {
      setError('No active shift found. Please start a shift first.');
      return;
    }

    if (!profile) {
      setError('User profile not found');
      return;
    }

    if (!formData.template_id) {
      setError('Please select a coupon template');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Get template details
      const { data: template, error: templateError } = await supabase
        .from('coupon_templates')
        .select('*')
        .eq('id', formData.template_id)
        .single();

      if (templateError) throw templateError;

      // Calculate expiry date
      const purchaseDate = new Date();
      const expiryDate = new Date(purchaseDate);
      // Set expiry to 3 months from purchase date
      expiryDate.setMonth(expiryDate.getMonth() + 3);

      // Use the coupon code from form data or generate new one
      const couponCode = formData.coupon_code.trim() || generateNextCouponCode();

      // Create sold coupon
      const { data: soldCoupon, error: couponError } = await supabase
        .from('sold_coupons')
        .insert([{
          template_id: formData.template_id,
          code: couponCode,
          member_id: formData.member_id || null,
          purchase_date: purchaseDate.toISOString().split('T')[0],
          expiry_date: expiryDate.toISOString().split('T')[0],
          entries_remaining: template.max_entries
        }])
        .select()
        .single();

      if (couponError) throw couponError;

      // Create transaction
      const { error: transactionError } = await supabase
        .from('transactions')
        .insert([{
          shift_id: activeShift.id,
          amount: template.price,
          payment_method: formData.payment_method,
          type: 'COUPON_SALE',
          related_id: soldCoupon.id,
          processed_by: profile.id,
          status: 'PAID',
          notes: formData.customer_name ? `Coupon sold to ${formData.customer_name}` : 'Coupon sale'
        }]);

      if (transactionError) throw transactionError;

      // If customer name is provided but no member is selected, store the name
      if (formData.customer_name && !formData.member_id) {
        const { error: updateError } = await supabase
          .from('sold_coupons')
          .update({ customer_name: formData.customer_name })
          .eq('id', soldCoupon.id);

        if (updateError) console.warn('Failed to update customer name:', updateError);
      } else if (formData.member_id && formData.customer_name) {
        // If both member and customer name are provided, clear customer name since member takes priority
        const { error: clearError } = await supabase
          .from('sold_coupons')
          .update({ customer_name: null })
          .eq('id', soldCoupon.id);

        if (clearError) console.warn('Failed to clear customer name:', clearError);
      }

      onSuccess();
      handleClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      template_id: '',
      coupon_code: '',
      member_id: '',
      payment_method: 'CASH',
      customer_name: ''
    });
    setSearchQuery('');
    setMembers([]);
    setShowMemberSearch(false);
    setError('');
    onClose();
  };

  const selectedTemplate = templates.find(t => t.id === formData.template_id);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Sell Coupon</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md flex items-center space-x-2">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Coupon Template *
            </label>
            <select
              value={formData.template_id}
              onChange={(e) => {
                setFormData(prev => ({ 
                  ...prev, 
                  template_id: e.target.value,
                  coupon_code: prev.coupon_code || generateNextCouponCode()
                }));
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
              required
            >
              <option value="">Choose a template</option>
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name} - RM{template.price} ({template.max_entries} entries, {template.duration_days} days)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Coupon Code *
            </label>
            <div className="flex space-x-2">
              <input
                type="text"
                value={formData.coupon_code}
                onChange={(e) => setFormData(prev => ({ ...prev, coupon_code: e.target.value }))}
                placeholder="Enter coupon code"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
                required
              />
              <button
                type="button"
                onClick={generateNewCouponCode}
                className="px-3 py-2 text-sm font-medium text-orange-600 bg-orange-50 border border-orange-200 rounded-md hover:bg-orange-100"
              >
                Generate
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Enter a 4-digit number or click "Generate" for next available number
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Customer (Optional)
            </label>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowMemberSearch(true);
                  searchMembers(e.target.value);
                  if (!e.target.value) {
                    setFormData(prev => ({ ...prev, member_id: '', customer_name: '' }));
                  }
                }}
                placeholder="Search member or enter name"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
              />
              
              {showMemberSearch && members.length > 0 && (
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
              Search for existing member or leave blank for walk-in customer
            </p>
          </div>

          <div className="space-y-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Payment Method *
            </label>
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, payment_method: 'CASH' }))}
                className={`flex flex-col items-center p-4 border-2 rounded-lg transition-all ${
                  formData.payment_method === 'CASH'
                    ? 'border-orange-500 bg-orange-50 text-orange-700'
                    : 'border-gray-200 hover:border-gray-300 text-gray-600'
                }`}
              >
                <Banknote className="h-6 w-6 mb-2" />
                <span className="text-sm font-medium">Cash</span>
              </button>
              
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, payment_method: 'QR' }))}
                className={`flex flex-col items-center p-4 border-2 rounded-lg transition-all ${
                  formData.payment_method === 'QR'
                    ? 'border-orange-500 bg-orange-50 text-orange-700'
                    : 'border-gray-200 hover:border-gray-300 text-gray-600'
                }`}
              >
                <QrCode className="h-6 w-6 mb-2" />
                <span className="text-sm font-medium">QR</span>
              </button>
              
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, payment_method: 'BANK_TRANSFER' }))}
                className={`flex flex-col items-center p-4 border-2 rounded-lg transition-all ${
                  formData.payment_method === 'BANK_TRANSFER'
                    ? 'border-orange-500 bg-orange-50 text-orange-700'
                    : 'border-gray-200 hover:border-gray-300 text-gray-600'
                }`}
              >
                <Smartphone className="h-6 w-6 mb-2" />
                <span className="text-sm font-medium">Bank Transfer</span>
              </button>
            </div>
          </div>

          {selectedTemplate && (
            (() => {
              // Calculate expiry date for display
              const purchaseDate = new Date();
              const expiryDate = new Date(purchaseDate);
              // Set expiry to 3 months from purchase date
              expiryDate.setMonth(expiryDate.getMonth() + 3);
              
              return (
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">Coupon Details</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Template:</span>
                  <span>{selectedTemplate.name}</span>
                </div>
                <div className="flex justify-between">
                  <span>Price:</span>
                  <span>RM{selectedTemplate.price}</span>
                </div>
                <div className="flex justify-between">
                  <span>Entries:</span>
                  <span>{selectedTemplate.max_entries}</span>
                </div>
                <div className="flex justify-between">
                  <span>Validity:</span>
                  <span>Until {expiryDate.toLocaleDateString('en-GB', { 
                    day: '2-digit', 
                    month: 'short', 
                    year: 'numeric' 
                  })}</span>
                </div>
              </div>
            </div>
              );
            })()
          )}

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !formData.template_id || !formData.coupon_code.trim()}
              className="flex items-center px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-md hover:bg-orange-700 disabled:opacity-50"
            >
              {loading && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>}
              <Ticket className="h-4 w-4 mr-2" />
              {loading ? 'Processing...' : 'Sell Coupon'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}