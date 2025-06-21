import React, { useState, useEffect } from 'react';
import { X, User, Mail, Phone, CreditCard } from 'lucide-react';
import { memberService } from '../../services/memberService';
import { useShift } from '../../hooks/useShift';
import { useAuth } from '../../contexts/AuthContext';
import { MembershipPlan } from '../../lib/supabase';

interface NewMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function NewMemberModal({ isOpen, onClose, onSuccess }: NewMemberModalProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const { activeShift } = useShift();
  const { profile } = useAuth();

  // Member data
  const [memberData, setMemberData] = useState({
    member_id_string: '',
    full_name: '',
    email: '',
    phone_number: '',
    photo_url: ''
  });

  // Purchase data
  const [purchaseData, setPurchaseData] = useState({
    plan_id: '',
    payment_method: 'CASH'
  });

  useEffect(() => {
    if (isOpen) {
      loadPlans();
      generateMemberId();
      setStep(1);
      setError('');
    }
  }, [isOpen]);

  const loadPlans = async () => {
    try {
      const data = await memberService.getMembershipPlans();
      setPlans(data);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const generateMemberId = async () => {
    try {
      const memberId = await memberService.generateMemberId();
      setMemberData(prev => ({ ...prev, member_id_string: memberId }));
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleMemberSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberData.full_name.trim()) {
      setError('Full name is required');
      return;
    }
    setStep(2);
    setError('');
  };

  const handlePurchaseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!activeShift) {
      setError('No active shift found. Please start a shift first.');
      return;
    }

    if (!profile) {
      setError('User profile not found');
      return;
    }

    if (!purchaseData.plan_id) {
      setError('Please select a membership plan');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Create member
      const member = await memberService.createMember(memberData);

      // Purchase membership
      await memberService.purchaseMembership({
        member_id: member.id,
        plan_id: purchaseData.plan_id,
        payment_method: purchaseData.payment_method,
        shift_id: activeShift.id,
        processed_by: profile.id,
        is_renewal: false
      });

      onSuccess();
      onClose();
      resetForm();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setMemberData({
      member_id_string: '',
      full_name: '',
      email: '',
      phone_number: '',
      photo_url: ''
    });
    setPurchaseData({
      plan_id: '',
      payment_method: 'CASH'
    });
    setStep(1);
  };

  const selectedPlan = plans.find(p => p.id === purchaseData.plan_id);
  const registrationFee = selectedPlan?.has_registration_fee ? 25.00 : 0;
  const totalAmount = (selectedPlan?.price || 0) + registrationFee;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">New Member Registration</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {step === 1 && (
          <form onSubmit={handleMemberSubmit} className="p-6 space-y-4">
            <div className="text-center mb-6">
              <div className="w-20 h-20 bg-gray-200 rounded-full mx-auto mb-4 flex items-center justify-center">
                <User className="h-10 w-10 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900">Member Information</h3>
              <p className="text-sm text-gray-500">Step 1 of 2</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Member ID
              </label>
              <input
                type="text"
                value={memberData.member_id_string}
                onChange={(e) => setMemberData(prev => ({ ...prev, member_id_string: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
                placeholder="FMF-001"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Full Name *
              </label>
              <input
                type="text"
                value={memberData.full_name}
                onChange={(e) => setMemberData(prev => ({ ...prev, full_name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
                placeholder="Enter full name"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="email"
                  value={memberData.email}
                  onChange={(e) => setMemberData(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
                  placeholder="email@example.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="tel"
                  value={memberData.phone_number}
                  onChange={(e) => setMemberData(prev => ({ ...prev, phone_number: e.target.value }))}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
                  placeholder="+1 (555) 123-4567"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-md hover:bg-orange-700"
              >
                Next: Select Plan
              </button>
            </div>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handlePurchaseSubmit} className="p-6 space-y-4">
            <div className="text-center mb-6">
              <CreditCard className="h-12 w-12 text-orange-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900">Membership Plan</h3>
              <p className="text-sm text-gray-500">Step 2 of 2</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Select Membership Plan *
              </label>
              <div className="space-y-3">
                {plans.map((plan) => (
                  <label
                    key={plan.id}
                    className={`block p-4 border rounded-lg cursor-pointer transition-colors ${
                      purchaseData.plan_id === plan.id
                        ? 'border-orange-500 bg-orange-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="plan"
                      value={plan.id}
                      checked={purchaseData.plan_id === plan.id}
                      onChange={(e) => setPurchaseData(prev => ({ ...prev, plan_id: e.target.value }))}
                      className="sr-only"
                    />
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium text-gray-900">{plan.name}</h4>
                        <p className="text-sm text-gray-500">
                          {plan.duration_months} month{plan.duration_months !== 1 ? 's' : ''}
                          {plan.free_months_on_signup > 0 && (
                            <span className="text-green-600 ml-1">
                              + {plan.free_months_on_signup} free month{plan.free_months_on_signup !== 1 ? 's' : ''}
                            </span>
                          )}
                        </p>
                        {plan.has_registration_fee && (
                          <p className="text-xs text-amber-600">+ Registration fee</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">RM{plan.price}</p>
                        {plan.has_registration_fee && (
                          <p className="text-xs text-gray-500">+ RM25 reg fee</p>
                        )}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Payment Method *
              </label>
              <select
                value={purchaseData.payment_method}
                onChange={(e) => setPurchaseData(prev => ({ ...prev, payment_method: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
                required
              >
                <option value="CASH">Cash</option>
                <option value="CARD">Card</option>
                <option value="BANK_TRANSFER">Bank Transfer</option>
              </select>
            </div>

            {selectedPlan && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Order Summary</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>{selectedPlan.name}</span>
                    <span>RM{selectedPlan.price}</span>
                  </div>
                  {registrationFee > 0 && (
                    <div className="flex justify-between">
                      <span>Registration Fee</span>
                      <span>RM{registrationFee}</span>
                    </div>
                  )}
                  <div className="border-t pt-1 flex justify-between font-medium">
                    <span>Total</span>
                    <span>RM{totalAmount}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-between space-x-3 pt-4">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={loading || !purchaseData.plan_id}
                className="px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-md hover:bg-orange-700 disabled:opacity-50"
              >
                {loading ? 'Processing...' : `Complete Registration (RM${totalAmount})`}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}