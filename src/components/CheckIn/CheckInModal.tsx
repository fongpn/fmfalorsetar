import React, { useState, useEffect } from 'react';
import { X, User, Ticket, DollarSign, Search, CheckCircle, AlertCircle } from 'lucide-react';
import { checkinService, CheckInData } from '../../services/checkinService';
import { memberService } from '../../services/memberService';
import { useShift } from '../../hooks/useShift';
import { useAuth } from '../../contexts/AuthContext';

interface CheckInModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type CheckInType = 'MEMBER' | 'COUPON' | 'WALK_IN';

export function CheckInModal({ isOpen, onClose, onSuccess }: CheckInModalProps) {
  const [activeTab, setActiveTab] = useState<CheckInType>('MEMBER');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { activeShift } = useShift();
  const { profile } = useAuth();

  // Member check-in state
  const [memberIdInput, setMemberIdInput] = useState('');
  const [memberValidation, setMemberValidation] = useState<any>(null);
  const [memberSearchResults, setMemberSearchResults] = useState<any[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);

  // Coupon check-in state
  const [couponCodeInput, setCouponCodeInput] = useState('');
  const [couponValidation, setCouponValidation] = useState<any>(null);

  // Walk-in state
  const [walkInNotes, setWalkInNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH');

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) return;

      // ESC key - Clear all input values
      if (event.key === 'Escape') {
        event.preventDefault();
        clearAllInputs();
        return;
      }

      // Enter key - Check In (only if validation is successful)
      if (event.key === 'Enter') {
        event.preventDefault();
        
        // Check if we can process check-in based on current tab and validation state
        const canCheckIn = 
          (activeTab === 'MEMBER' && memberValidation?.valid) ||
          (activeTab === 'COUPON' && couponValidation?.valid) ||
          (activeTab === 'WALK_IN');
        
        if (canCheckIn && !loading) {
          processCheckIn();
        }
        return;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, activeTab, memberValidation, couponValidation, loading]);

  const clearAllInputs = () => {
    // Clear member tab inputs
    setMemberIdInput('');
    setMemberValidation(null);
    setMemberSearchResults([]);
    setShowSearchResults(false);
    
    // Clear coupon tab inputs
    setCouponCodeInput('');
    setCouponValidation(null);
    
    // Clear walk-in tab inputs
    setWalkInNotes('');
    setPaymentMethod('CASH');
    
    // Clear error messages
    setError('');
    setSuccess('');
  };

  const resetForm = () => {
    clearAllInputs();
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const validateMember = async () => {
    const query = memberIdInput.trim();
    if (!query) {
      setError('Please enter Member ID, Phone Number, or Name');
      return;
    }

    setLoading(true);
    setError('');
    setMemberSearchResults([]);
    setShowSearchResults(false);
    
    try {
      // First try exact member ID match
      let validation = await checkinService.validateMemberAccess(query);
      
      if (validation.valid) {
        setMemberValidation(validation);
        setShowSearchResults(false);
      } else {
        // If exact match fails, search by multiple criteria
        const searchResults = await memberService.searchMembers(query);
        
        if (searchResults.length === 0) {
          setError('No members found matching your search');
          setMemberValidation(null);
        } else if (searchResults.length === 1) {
          // Single result - validate directly
          const singleMember = searchResults[0];
          const singleValidation = await checkinService.validateMemberAccess(singleMember.member_id_string);
          setMemberValidation(singleValidation);
          setMemberIdInput(singleMember.member_id_string);
          setShowSearchResults(false);
        } else {
          // Multiple results - show selection list
          setMemberSearchResults(searchResults);
          setShowSearchResults(true);
          setMemberValidation(null);
        }
      }
    } catch (err: any) {
      setError(err.message);
      setMemberValidation(null);
      setMemberSearchResults([]);
      setShowSearchResults(false);
    } finally {
      setLoading(false);
    }
  };

  const selectMember = async (member: any) => {
    setMemberIdInput(member.member_id_string);
    setShowSearchResults(false);
    setMemberSearchResults([]);
    
    try {
      const validation = await checkinService.validateMemberAccess(member.member_id_string);
      setMemberValidation(validation);
      
      if (!validation.valid) {
        setError(validation.message);
      }
    } catch (err: any) {
      setError(err.message);
      setMemberValidation(null);
    }
  };
  const validateCoupon = async () => {
    if (!couponCodeInput.trim()) {
      setError('Please enter a coupon code');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const validation = await checkinService.validateCouponAccess(couponCodeInput.trim());
      setCouponValidation(validation);
      
      if (!validation.valid) {
        setError(validation.message);
      }
    } catch (err: any) {
      setError(err.message);
      setCouponValidation(null);
    } finally {
      setLoading(false);
    }
  };

  const processCheckIn = async () => {
    if (!activeShift) {
      setError('No active shift found. Please start a shift first.');
      return;
    }

    if (!profile) {
      setError('User profile not found');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      let checkInData: CheckInData;

      switch (activeTab) {
        case 'MEMBER':
          if (!memberValidation?.valid || !memberValidation.member) {
            setError('Please validate member access first');
            return;
          }
          checkInData = {
            type: 'MEMBER',
            member_id: memberValidation.member.id,
            shift_id: activeShift.id,
            processed_by: profile.id
          };
          break;

        case 'COUPON':
          if (!couponValidation?.valid || !couponValidation.coupon) {
            setError('Please validate coupon first');
            return;
          }
          checkInData = {
            type: 'COUPON',
            sold_coupon_id: couponValidation.coupon.id,
            shift_id: activeShift.id,
            processed_by: profile.id
          };
          break;

        case 'WALK_IN':
          checkInData = {
            type: 'WALK_IN',
            shift_id: activeShift.id,
            processed_by: profile.id,
            notes: walkInNotes
          };
          break;

        default:
          throw new Error('Invalid check-in type');
      }

      const result = await checkinService.processCheckIn(checkInData);
      
      if (result.success) {
        setSuccess(result.message);
        setTimeout(() => {
          onSuccess();
          handleClose();
        }, 1500);
      } else {
        setError(result.message);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const tabs = [
    { id: 'MEMBER', label: 'Member', icon: User },
    { id: 'COUPON', label: 'Coupon', icon: Ticket },
    { id: 'WALK_IN', label: 'Walk-in', icon: DollarSign },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Check-in</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="border-b">
          <div className="flex">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as CheckInType);
                  resetForm();
                }}
                className={`flex-1 px-4 py-3 text-sm font-medium flex items-center justify-center space-x-2 ${
                  activeTab === tab.id
                    ? 'border-b-2 border-orange-500 text-orange-600 bg-orange-50'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="p-6">
          {/* Keyboard Shortcuts Info */}
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <div className="flex items-center justify-between text-sm text-blue-700">
              <span>💡 Keyboard shortcuts:</span>
              <div className="flex space-x-4">
                <span><kbd className="px-2 py-1 bg-blue-100 rounded text-xs">Enter</kbd> Check In</span>
                <span><kbd className="px-2 py-1 bg-blue-100 rounded text-xs">ESC</kbd> Clear All</span>
              </div>
            </div>
          </div>

          {/* Status Messages */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-center space-x-2">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <p className="text-sm text-green-600">{success}</p>
            </div>
          )}

          {/* Member Check-in */}
          {activeTab === 'MEMBER' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Member ID / Phone Number / Name
                </label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={memberIdInput}
                    onChange={(e) => {
                      setMemberIdInput(e.target.value);
                      setMemberValidation(null);
                      setMemberSearchResults([]);
                      setShowSearchResults(false);
                      setError('');
                    }}
                    placeholder="Enter Member ID, Phone, or Name"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        validateMember();
                      }
                    }}
                  />
                  <button
                    onClick={validateMember}
                    disabled={loading || !memberIdInput.trim()}
                    className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50"
                  >
                    <Search className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Search Results */}
              {showSearchResults && memberSearchResults.length > 0 && (
                <div className="border border-gray-200 rounded-lg max-h-60 overflow-y-auto">
                  <div className="p-3 bg-gray-50 border-b border-gray-200">
                    <h4 className="text-sm font-medium text-gray-900">
                      Found {memberSearchResults.length} member{memberSearchResults.length !== 1 ? 's' : ''}
                    </h4>
                    <p className="text-xs text-gray-500">Click to select a member</p>
                  </div>
                  <div className="divide-y divide-gray-200">
                    {memberSearchResults.map((member) => (
                      <button
                        key={member.id}
                        onClick={() => selectMember(member)}
                        className="w-full p-3 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 flex-shrink-0">
                              {member.photo_url ? (
                                <img 
                                  src={member.photo_url} 
                                  alt={member.full_name}
                                  className="w-10 h-10 rounded-full object-cover border border-gray-200"
                                  onError={(e) => {
                                    // Fallback to default avatar if image fails to load
                                    e.currentTarget.style.display = 'none';
                                    e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                  }}
                                />
                              ) : (
                                <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center border border-gray-200">
                                  <User className="h-5 w-5 text-gray-400" />
                                </div>
                              )}
                              {/* Fallback avatar (hidden by default, shown if image fails) */}
                              <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center border border-gray-200 hidden">
                                <User className="h-5 w-5 text-gray-400" />
                              </div>
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{member.full_name}</p>
                              <p className="text-sm text-gray-500">ID: {member.member_id_string}</p>
                              {member.phone_number && (
                                <p className="text-xs text-gray-400">Phone: {member.phone_number}</p>
                              )}
                            </div>
                          </div>
                          <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                            member.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                            member.status === 'IN_GRACE' ? 'bg-amber-100 text-amber-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {member.status === 'ACTIVE' ? 'Active' :
                             member.status === 'IN_GRACE' ? 'Grace' : 'Expired'}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {memberValidation && (
                <div className={`p-4 rounded-lg border ${
                  memberValidation.valid 
                    ? 'bg-green-50 border-green-200' 
                    : 'bg-red-50 border-red-200'
                }`}>
                  {memberValidation.member && (
                    <div className="mb-2">
                      <h4 className="font-medium text-gray-900">{memberValidation.member.full_name}</h4>
                      <p className="text-sm text-gray-600">{memberValidation.member.member_id_string}</p>
                      {memberValidation.member.current_membership && (
                        <p className="text-xs text-gray-500">
                          {memberValidation.member.current_membership.plan.name} - 
                          Expires {new Date(memberValidation.member.current_membership.end_date).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  )}
                  <p className={`text-sm ${
                    memberValidation.valid ? 'text-green-700' : 'text-red-700'
                  }`}>
                    {memberValidation.message}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Coupon Check-in */}
          {activeTab === 'COUPON' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Coupon Code
                </label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={couponCodeInput}
                    onChange={(e) => {
                      setCouponCodeInput(e.target.value);
                      setCouponValidation(null);
                      setError('');
                    }}
                    placeholder="Enter coupon code"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
                    onKeyPress={(e) => e.key === 'Enter' && validateCoupon()}
                  />
                  <button
                    onClick={validateCoupon}
                    disabled={loading || !couponCodeInput.trim()}
                    className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50"
                  >
                    <Search className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {couponValidation && (
                <div className={`p-4 rounded-lg border ${
                  couponValidation.valid 
                    ? 'bg-green-50 border-green-200' 
                    : 'bg-red-50 border-red-200'
                }`}>
                  {couponValidation.coupon && (
                    <div className="mb-2">
                      <h4 className="font-medium text-gray-900">{couponValidation.coupon.template.name}</h4>
                      <p className="text-sm text-gray-600">
                        {couponValidation.coupon.entries_remaining} entries remaining
                      </p>
                      <p className="text-xs text-gray-500">
                        Expires {new Date(couponValidation.coupon.expiry_date).toLocaleDateString()}
                      </p>
                      {couponValidation.member && (
                        <p className="text-xs text-gray-500 mt-1">
                          Owner: {couponValidation.member.full_name}
                        </p>
                      )}
                    </div>
                  )}
                  <p className={`text-sm ${
                    couponValidation.valid ? 'text-green-700' : 'text-red-700'
                  }`}>
                    {couponValidation.message}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Walk-in Check-in */}
          {activeTab === 'WALK_IN' && (
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Walk-in Rate</h4>
                <p className="text-sm text-blue-700">
                  Daily gym access fee will be charged according to system settings.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Method
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
                >
                  <option value="CASH">Cash</option>
                  <option value="CARD">Card</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  value={walkInNotes}
                  onChange={(e) => setWalkInNotes(e.target.value)}
                  placeholder="Any additional notes..."
                  rows={3}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      validateCoupon();
                    }
                  }}
                />
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-6">
            <button
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={processCheckIn}
              disabled={loading || 
                (activeTab === 'MEMBER' && !memberValidation?.valid) ||
                (activeTab === 'COUPON' && !couponValidation?.valid)
              }
              className="px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-md hover:bg-orange-700 disabled:opacity-50 flex items-center"
            >
              {loading ? 'Processing...' : 'Check In'}
              {!loading && (
                <kbd className="ml-2 px-1.5 py-0.5 bg-orange-700 rounded text-xs">↵</kbd>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}