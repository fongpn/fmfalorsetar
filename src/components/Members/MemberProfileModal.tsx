import React, { useState, useEffect, useRef } from 'react';
import { X, User, Phone, Mail, Calendar, CreditCard, Camera, RotateCcw, Save, Edit3, AlertCircle, CheckCircle, Car as CarIcon } from 'lucide-react';
import { memberService, MemberWithStatus } from '../../services/memberService';
import { MembershipPlan } from '../../lib/supabase';

interface MemberProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: MemberWithStatus | null;
  onSuccess: () => void;
}

export function MemberProfileModal({ isOpen, onClose, member, onSuccess }: MemberProfileModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  
  // Camera state management
  const [cameraMode, setCameraMode] = useState<'none' | 'loading' | 'ready' | 'captured' | 'error'>('none');
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // Form data
  const [formData, setFormData] = useState({
    member_id_string: '',
    full_name: '',
    ic_passport_number: '',
    phone_number: '',
    photo_url: ''
  });

  // Renewal data
  const [renewalData, setRenewalData] = useState({
    plan_id: '',
    payment_method: 'CASH'
  });

  const [showRenewalForm, setShowRenewalForm] = useState(false);

  useEffect(() => {
    if (isOpen && member) {
      setFormData({
        member_id_string: member.member_id_string,
        full_name: member.full_name,
        ic_passport_number: member.ic_passport_number || '',
        phone_number: member.phone_number || '',
        photo_url: member.photo_url || ''
      });
      setPhotoDataUrl(member.photo_url || null);
      loadPlans();
      setError('');
      setSuccess('');
      setIsEditing(false);
      setShowRenewalForm(false);
    } else {
      cleanupCamera();
    }
  }, [isOpen, member]);

  useEffect(() => {
    return () => {
      cleanupCamera();
    };
  }, []);

  const loadPlans = async () => {
    try {
      const data = await memberService.getMembershipPlans();
      setPlans(data);
    } catch (err: any) {
      setError('Failed to load membership plans.');
    }
  };

  const cleanupCamera = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraMode('none');
  };

  const initializeCamera = async () => {
    if (cameraMode === 'loading' || cameraMode === 'ready') return;

    cleanupCamera();
    setCameraMode('loading');
    setError('');

    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Camera not supported in this browser.');
      setCameraMode('error');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
        audio: false
      });
      
      mediaStreamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.oncanplay = () => {
          setCameraMode('ready');
        };
      }
    } catch (err: any) {
      console.error('Camera initialization failed:', err);
      let message = `Camera failed: ${err.message}`;
      if (err.name === 'NotAllowedError') {
        message = 'Camera permission was denied. Please allow access in your browser settings.';
      } else if (err.name === 'NotFoundError') {
        message = 'No camera was found on this device.';
      }
      setError(message);
      setCameraMode('error');
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current && cameraMode === 'ready') {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      if (!context) {
        setError('Could not get canvas context.');
        return;
      }

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.translate(canvas.width, 0);
      context.scale(-1, 1);
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
      setPhotoDataUrl(dataUrl);
      setFormData(prev => ({ ...prev, photo_url: dataUrl }));
      setCameraMode('captured');
      
      cleanupCamera();
    }
  };

  const retakePhoto = () => {
    setPhotoDataUrl(null);
    setFormData(prev => ({ ...prev, photo_url: '' }));
    initializeCamera();
  };

  const handleSave = async () => {
    if (!member) return;

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await memberService.updateMember(member.id, formData);
      setSuccess('Member information updated successfully!');
      setIsEditing(false);
      onSuccess();
      
      setTimeout(() => {
        setSuccess('');
      }, 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to update member information.');
    } finally {
      setLoading(false);
    }
  };

  const handleRenewal = async () => {
    if (!member || !renewalData.plan_id) {
      setError('Please select a membership plan.');
      return;
    }

    // This would need to be implemented with proper shift and staff context
    setError('Renewal functionality requires active shift and staff context. Please use the main registration flow.');
  };

  const handleClose = () => {
    cleanupCamera();
    setIsEditing(false);
    setShowRenewalForm(false);
    setError('');
    setSuccess('');
    onClose();
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return {
          color: 'bg-green-100 text-green-800 border-green-200',
          icon: '✓',
          label: 'Active'
        };
      case 'IN_GRACE':
        return {
          color: 'bg-amber-100 text-amber-800 border-amber-200',
          icon: '⚠',
          label: 'Grace Period'
        };
      case 'EXPIRED':
        return {
          color: 'bg-red-100 text-red-800 border-red-200',
          icon: '✗',
          label: 'Expired'
        };
      default:
        return {
          color: 'bg-gray-100 text-gray-800 border-gray-200',
          icon: '?',
          label: 'Unknown'
        };
    }
  };

  if (!isOpen || !member) return null;

  const statusConfig = getStatusConfig(member.status);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[95vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <h2 className="text-xl font-semibold text-gray-800">Member Profile</h2>
            <div className={`px-3 py-1 rounded-full text-xs font-medium border ${statusConfig.color}`}>
              <span className="mr-1">{statusConfig.icon}</span>
              {statusConfig.label}
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {!isEditing && (
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

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column - Member Info */}
            <div className="space-y-6">
              {/* Photo Section */}
              <div className="text-center">
                <div className="relative inline-block">
                  {photoDataUrl ? (
                    <img 
                      src={photoDataUrl} 
                      alt={member.full_name}
                      className="w-32 h-32 rounded-full object-cover border-4 border-gray-200"
                    />
                  ) : (
                    <div className="w-32 h-32 bg-gray-200 rounded-full flex items-center justify-center">
                      <User className="h-16 w-16 text-gray-400" />
                    </div>
                  )}
                  
                  {isEditing && (
                    <div className="mt-3 flex justify-center space-x-2">
                      {cameraMode === 'none' && (
                        <button
                          type="button"
                          onClick={initializeCamera}
                          className="flex items-center px-3 py-2 text-sm font-medium text-orange-600 bg-orange-50 rounded-md hover:bg-orange-100"
                        >
                          <Camera className="h-4 w-4 mr-1" />
                          {photoDataUrl ? 'Update Photo' : 'Add Photo'}
                        </button>
                      )}
                      {photoDataUrl && cameraMode === 'none' && (
                        <button
                          type="button"
                          onClick={retakePhoto}
                          className="flex items-center px-3 py-2 text-sm font-medium text-gray-600 bg-gray-50 rounded-md hover:bg-gray-100"
                        >
                          <RotateCcw className="h-4 w-4 mr-1" />
                          Retake
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Camera Interface */}
                {isEditing && cameraMode !== 'none' && cameraMode !== 'captured' && (
                  <div className="mt-4 relative w-full aspect-video bg-gray-900 rounded-lg overflow-hidden">
                    <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" style={{ transform: 'scaleX(-1)' }} />
                    {cameraMode === 'loading' && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white"></div>
                      </div>
                    )}
                    <canvas ref={canvasRef} className="hidden" />
                    {cameraMode === 'ready' && (
                      <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
                        <button
                          type="button"
                          onClick={capturePhoto}
                          className="bg-orange-600 hover:bg-orange-700 text-white rounded-full p-4 h-16 w-16 flex items-center justify-center"
                        >
                          <Camera className="h-8 w-8" />
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Member Details Form */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Member ID</label>
                  <input
                    type="text"
                    value={formData.member_id_string}
                    onChange={(e) => setFormData(prev => ({ ...prev, member_id_string: e.target.value }))}
                    disabled={!isEditing}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500 disabled:bg-gray-50 disabled:text-gray-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    value={formData.full_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                    disabled={!isEditing}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500 disabled:bg-gray-50 disabled:text-gray-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">IC or Passport Number</label>
                  <div className="relative">
                    <CarIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      value={formData.ic_passport_number}
                      onChange={(e) => setFormData(prev => ({ ...prev, ic_passport_number: e.target.value }))}
                      disabled={!isEditing}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500 disabled:bg-gray-50 disabled:text-gray-500"
                      placeholder="123456-78-9012 or A12345678"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="tel"
                      value={formData.phone_number}
                      onChange={(e) => setFormData(prev => ({ ...prev, phone_number: e.target.value }))}
                      disabled={!isEditing}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500 disabled:bg-gray-50 disabled:text-gray-500"
                      placeholder="Enter phone number"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Membership Info */}
            <div className="space-y-6">
              {/* Membership Status */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Membership Status</h3>
                
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-600">Joined {new Date(member.join_date).toLocaleDateString()}</span>
                  </div>

                  {member.current_membership && (
                    <>
                      <div className="flex items-center space-x-2">
                        <CreditCard className="h-4 w-4 text-gray-500" />
                        <span className="text-sm text-gray-600">
                          {member.current_membership.plan.name}
                        </span>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-gray-500" />
                        <span className="text-sm text-gray-600">
                          Expires {new Date(member.current_membership.end_date).toLocaleDateString()}
                        </span>
                      </div>

                      {member.days_until_expiry !== undefined && (
                        <div className="flex items-center space-x-2">
                          <span className={`text-sm font-medium ${
                            member.days_until_expiry > 7 ? 'text-green-600' :
                            member.days_until_expiry > 0 ? 'text-amber-600' : 'text-red-600'
                          }`}>
                            {member.days_until_expiry > 0 
                              ? `${member.days_until_expiry} days remaining`
                              : member.status === 'IN_GRACE'
                                ? `${Math.abs(member.days_until_expiry)} days in grace period`
                                : 'Expired'
                            }
                          </span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Renewal Section */}
              {(member.status === 'IN_GRACE' || member.status === 'EXPIRED' || 
                (member.days_until_expiry !== undefined && member.days_until_expiry <= 30)) && (
                <div className="bg-orange-50 border border-orange-200 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-orange-900 mb-3">Membership Renewal</h3>
                  
                  {!showRenewalForm ? (
                    <div>
                      <p className="text-sm text-orange-700 mb-3">
                        {member.status === 'EXPIRED' ? 'Membership has expired.' :
                         member.status === 'IN_GRACE' ? 'Membership is in grace period.' :
                         'Membership expires soon.'}
                      </p>
                      <button
                        onClick={() => setShowRenewalForm(true)}
                        className="w-full px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 font-medium"
                      >
                        Renew Membership
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-orange-900 mb-2">Select Plan</label>
                        <select
                          value={renewalData.plan_id}
                          onChange={(e) => setRenewalData(prev => ({ ...prev, plan_id: e.target.value }))}
                          className="w-full px-3 py-2 border border-orange-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
                        >
                          <option value="">Choose a plan</option>
                          {plans.map((plan) => (
                            <option key={plan.id} value={plan.id}>
                              {plan.name} - RM{plan.price}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-orange-900 mb-2">Payment Method</label>
                        <select
                          value={renewalData.payment_method}
                          onChange={(e) => setRenewalData(prev => ({ ...prev, payment_method: e.target.value }))}
                          className="w-full px-3 py-2 border border-orange-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
                        >
                          <option value="CASH">Cash</option>
                          <option value="QR">QR Code</option>
                          <option value="BANK_TRANSFER">Bank Transfer</option>
                        </select>
                      </div>

                      <div className="flex space-x-2">
                        <button
                          onClick={() => setShowRenewalForm(false)}
                          className="flex-1 px-4 py-2 text-orange-600 bg-white border border-orange-300 rounded-md hover:bg-orange-50"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleRenewal}
                          className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700"
                        >
                          Process Renewal
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        {isEditing && (
          <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
            <button
              onClick={() => {
                setIsEditing(false);
                setFormData({
                  member_id_string: member.member_id_string,
                  full_name: member.full_name,
                  ic_passport_number: member.ic_passport_number || '',
                  phone_number: member.phone_number || '',
                  photo_url: member.photo_url || ''
                });
                setPhotoDataUrl(member.photo_url || null);
                cleanupCamera();
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