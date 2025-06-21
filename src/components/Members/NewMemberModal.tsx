import React, { useState, useEffect, useRef } from 'react';
import { X, User, Mail, Phone, CreditCard, Camera, RotateCcw, Check, Car as IdCard } from 'lucide-react';
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
  const [registrationFee, setRegistrationFee] = useState<number>(50.00);
  const [cameraError, setCameraError] = useState('');
  const { activeShift } = useShift();
  const { profile } = useAuth();

  // Simplified camera states
  const [cameraMode, setCameraMode] = useState<'none' | 'loading' | 'ready' | 'captured' | 'error'>('none');
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Member data
  const [memberData, setMemberData] = useState({
    member_id_string: '',
    full_name: '',
    ic_passport_number: '',
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
      loadRegistrationFee();
      generateMemberId();
      setStep(1);
      setError('');
      setPhotoDataUrl(null);
      setCameraMode('none');
      setCameraError('');
    }
  }, [isOpen]);

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      cleanupCamera();
    };
  }, []);

  const cleanupCamera = () => {
    if (mediaStream) {
      mediaStream.getTracks().forEach(track => {
        track.stop();
      });
      setMediaStream(null);
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraMode('none');
    setCameraError('');
  };

  const initializeCamera = async () => {
    try {
      setCameraMode('loading');
      setCameraError('');
      
      // Clean up any existing stream
      cleanupCamera();
      setCameraMode('loading');

      // Check if getUserMedia is available
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Camera not supported in this browser');
      }

      // Set timeout for camera initialization
      timeoutRef.current = setTimeout(() => {
        setCameraError('Camera is taking too long to load. You can skip the photo.');
        setCameraMode('error');
      }, 10000);

      // Request camera access
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        },
        audio: false
      });

      setMediaStream(stream);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        
        // Wait for video to load
        const video = videoRef.current;
        
        const handleLoadedData = () => {
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
          }
          setCameraMode('ready');
          video.removeEventListener('loadeddata', handleLoadedData);
        };

        video.addEventListener('loadeddata', handleLoadedData);
        
        // Fallback timeout
        setTimeout(() => {
          if (video.readyState >= 2) { // HAVE_CURRENT_DATA
            handleLoadedData();
          }
        }, 2000);
      }

    } catch (error: any) {
      console.error('Camera initialization failed:', error);
      setCameraError(`Camera failed: ${error.message}`);
      setCameraMode('error');
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current || cameraMode !== 'ready') {
      setCameraError('Camera not ready for capture');
      return;
    }

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      if (!context) {
        throw new Error('Could not get canvas context');
      }

      // Set canvas size
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;

      // Draw video frame to canvas
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Get image data
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
      setPhotoDataUrl(dataUrl);
      setMemberData(prev => ({ ...prev, photo_url: dataUrl }));
      setCameraMode('captured');
      
      // Clean up camera
      cleanupCamera();
      
    } catch (error: any) {
      console.error('Photo capture failed:', error);
      setCameraError(`Capture failed: ${error.message}`);
    }
  };

  const retakePhoto = () => {
    setPhotoDataUrl(null);
    setMemberData(prev => ({ ...prev, photo_url: '' }));
    initializeCamera();
  };

  const loadPlans = async () => {
    try {
      const data = await memberService.getMembershipPlans();
      setPlans(data);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const loadRegistrationFee = async () => {
    try {
      const fee = await memberService.getRegistrationFee();
      setRegistrationFee(fee);
    } catch (err: any) {
      console.warn('Could not load registration fee:', err);
      setRegistrationFee(50.00); // Fallback to your preferred default
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
      ic_passport_number: '',
      phone_number: '',
      photo_url: ''
    });
    setPurchaseData({
      plan_id: '',
      payment_method: 'CASH'
    });
    setPhotoDataUrl(null);
    cleanupCamera();
    setCameraError('');
    setStep(1);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const selectedPlan = plans.find(p => p.id === purchaseData.plan_id);
  const regFeeAmount = selectedPlan?.has_registration_fee ? registrationFee : 0;
  const totalAmount = (selectedPlan?.price || 0) + regFeeAmount;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">New Member Registration</h2>
          <button
            onClick={handleClose}
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

        {cameraError && (
          <div className="mx-6 mt-4 p-3 bg-amber-50 border border-amber-200 rounded-md">
            <p className="text-sm text-amber-600">{cameraError}</p>
            <button onClick={() => setCameraError('')} className="text-xs text-amber-700 underline mt-1">Dismiss</button>
          </div>
        )}

        {step === 1 && (
          <form onSubmit={handleMemberSubmit} className="p-6 space-y-4">
            <div className="text-center mb-6">
              {/* Photo Section */}
              <div className="relative mb-4">
                {photoDataUrl ? (
                  <div className="relative">
                    <img 
                      src={photoDataUrl} 
                      alt="Member photo"
                      className="w-32 h-32 rounded-full mx-auto object-cover border-4 border-orange-200"
                    />
                    <button
                      type="button"
                      onClick={retakePhoto}
                      className="absolute bottom-0 right-0 p-2 bg-orange-600 text-white rounded-full hover:bg-orange-700 shadow-lg"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </button>
                  </div>
                ) : cameraMode === 'loading' || cameraMode === 'ready' ? (
                  <div className="relative">
                    <div className="relative w-64 h-48 mx-auto bg-gray-200 rounded-lg overflow-hidden">
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover"
                        style={{ transform: 'scaleX(-1)' }} // Mirror the video for better UX
                      />
                      {cameraMode === 'loading' && (
                        <div className="absolute inset-0 flex items-center justify-center bg-gray-200">
                          <div className="text-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto mb-2"></div>
                            <p className="text-sm text-gray-600">Loading camera...</p>
                            <p className="text-xs text-gray-500 mt-1">This may take a moment...</p>
                          </div>
                        </div>
                      )}
                    </div>
                    <canvas ref={canvasRef} className="hidden" />
                    <div className="flex justify-center space-x-3 mt-3">
                      <button
                        type="button"
                        onClick={capturePhoto}
                        disabled={cameraMode !== 'ready'}
                        className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 text-sm font-medium"
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Capture
                      </button>
                      <button
                        type="button"
                        onClick={initializeCamera}
                        className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
                      >
                        <RotateCcw className="h-4 w-4 mr-1" />
                        Retry
                      </button>
                      <button
                        type="button"
                        onClick={cleanupCamera}
                        className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-sm font-medium"
                      >
                        <X className="h-4 w-4 mr-1" />
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="w-32 h-32 bg-gray-200 rounded-full mx-auto mb-4 flex items-center justify-center">
                    <User className="h-16 w-16 text-gray-400" />
                  </div>
                )}
                
                {cameraMode === 'none' && (
                  <button
                    type="button"
                    onClick={initializeCamera}
                    className="flex items-center justify-center mx-auto px-4 py-2 text-sm font-medium text-orange-600 bg-orange-50 rounded-md hover:bg-orange-100 border border-orange-200"
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    Take Photo
                  </button>
                )}
                
                {!photoDataUrl && (
                  <p className="text-xs text-gray-500 text-center mt-2">
                    Photo is optional - you can continue without taking a photo
                  </p>
                )}
              </div>

              <h3 className="text-lg font-medium text-gray-900">Member Information</h3>
              <p className="text-sm text-gray-500">Step 1 of 2</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Member ID (4-digit number)
              </label>
              <input
                type="text"
                value={memberData.member_id_string}
                onChange={(e) => setMemberData(prev => ({ ...prev, member_id_string: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500 bg-gray-50"
                placeholder="Enter member ID or leave for auto-generation"
                required
              />
              <div className="flex items-center justify-between mt-1">
                <p className="text-xs text-gray-500">Can be manually entered or auto-generated</p>
                <button
                  type="button"
                  onClick={generateMemberId}
                  className="text-xs text-orange-600 hover:text-orange-700 underline"
                >
                  Auto-generate
                </button>
              </div>
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
                IC or Passport Number
              </label>
              <div className="relative">
                <IdCard className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={memberData.ic_passport_number}
                  onChange={(e) => setMemberData(prev => ({ ...prev, ic_passport_number: e.target.value }))}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
                  placeholder="123456-78-9012 or A12345678"
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
                  placeholder="Enter phone number"
                />
              </div>
            </div>

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
                          <p className="text-xs text-amber-600">+ RM{registrationFee} registration fee</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">RM{plan.price}</p>
                        {plan.has_registration_fee && (
                          <p className="text-xs text-gray-500">+ RM{registrationFee} reg fee</p>
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
                  {regFeeAmount > 0 && (
                    <div className="flex justify-between">
                      <span>Registration Fee</span>
                      <span>RM{regFeeAmount}</span>
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