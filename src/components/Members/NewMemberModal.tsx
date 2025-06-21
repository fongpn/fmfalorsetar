import React, { useState, useEffect, useRef } from 'react';
import { X, User, Mail, Phone, CreditCard, Camera, RotateCcw, Check, Car as IdCard, Banknote, Smartphone, QrCode, AlertCircle } from 'lucide-react';
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

  // Camera states
  const [showCamera, setShowCamera] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

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
      setCapturedPhoto(null);
      setCameraError('');
    }
  }, [isOpen]);

  useEffect(() => {
    // Cleanup camera stream when component unmounts or modal closes
    return () => {
      if (stream) {
        console.log('Cleaning up camera stream');
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

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
      setRegistrationFee(50.00);
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

  const startCamera = async () => {
    try {
      setError('');
      setCameraError('');
      setCameraReady(false);
      
      // Stop any existing stream first
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }

      // Check if getUserMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access is not supported in this browser');
      }

      console.log('Requesting camera access...');
      
      // Request camera with multiple fallback options
      let mediaStream;
      try {
        // Try with ideal constraints first
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640, max: 1280 },
            height: { ideal: 480, max: 720 },
            facingMode: 'user'
          },
          audio: false
        });
      } catch (err) {
        console.log('Ideal constraints failed, trying basic constraints:', err);
        // Fallback to basic constraints
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false
        });
      }

      console.log('Camera access granted, setting up video element...');
      setStream(mediaStream);
      
      if (videoRef.current) {
      // Wait for next tick to ensure video element is rendered
      setTimeout(() => {
        videoRef.current.srcObject = mediaStream;
        
          // Set up event listeners
          const video = videoRef.current;
          
          const handleLoadedMetadata = () => {
          console.log('Video metadata loaded');
            // Try to play the video
            video.play().then(() => {
              console.log('Video playing successfully');
              setCameraReady(true);
            }).catch((playError) => {
              console.error('Error playing video:', playError);
              setCameraError('Failed to start video playback');
            });
        };
        
          const handleCanPlay = () => {
          console.log('Video can play');
          setCameraReady(true);
        };
          
          const handleError = (e: any) => {
            console.error('Video error:', e);
            setCameraError('Video playback error occurred');
          };
          
          // Add event listeners
          video.addEventListener('loadedmetadata', handleLoadedMetadata);
          video.addEventListener('canplay', handleCanPlay);
          video.addEventListener('error', handleError);
          
          // Store cleanup function
          video.dataset.cleanupAdded = 'true';
      }
      }, 100);
      
    } catch (err: any) {
      console.error('Camera access error:', err);
      setCameraError(`Camera access failed: ${err.message}. Please check permissions and try again.`);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    
    // Clean up video element
    if (videoRef.current) {
      const video = videoRef.current;
      video.srcObject = null;
      
      // Remove event listeners if they were added
      if (video.dataset.cleanupAdded) {
        video.removeEventListener('loadedmetadata', () => {});
        video.removeEventListener('canplay', () => {});
        video.removeEventListener('error', () => {});
        delete video.dataset.cleanupAdded;
      }
    }
    
    setCameraReady(false);
    setCameraError('');
    setShowCamera(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      
      if (video.videoWidth === 0 || video.videoHeight === 0) {
        setCameraError('Video not ready. Please wait a moment and try again.');
        return;
      }
      
      const context = canvas.getContext('2d');
      
      // Set canvas dimensions to match video display size
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      if (context) {
        // Draw the video frame to canvas
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const photoDataUrl = canvas.toDataURL('image/jpeg', 0.8);
        setCapturedPhoto(photoDataUrl);
        setMemberData(prev => ({ ...prev, photo_url: photoDataUrl }));
        stopCamera();
      }
    }
  };

  const retakePhoto = () => {
    setCapturedPhoto(null);
    setMemberData(prev => ({ ...prev, photo_url: '' }));
    setCameraError('');
    startCamera();
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
    setCapturedPhoto(null);
    stopCamera();
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

  // Calculate membership expiry date
  const calculateExpiryDate = () => {
    if (!selectedPlan) return null;
    
    const startDate = new Date();
    const totalMonths = selectedPlan.duration_months + selectedPlan.free_months_on_signup;
    const expiryDate = new Date(startDate);
    expiryDate.setMonth(expiryDate.getMonth() + totalMonths);
    
    return expiryDate;
  };

  const expiryDate = calculateExpiryDate();

  if (!isOpen) return null;

  const paymentMethods = [
    { value: 'CASH', label: 'Cash', icon: Banknote },
    { value: 'QR', label: 'QR Code', icon: QrCode },
    { value: 'BANK_TRANSFER', label: 'Bank Transfer', icon: Smartphone },
  ];

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
              <h3 className="text-lg font-medium text-gray-900">Member Information</h3>
              <p className="text-sm text-gray-500">Step 1 of 2</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Member ID (4-digit number)
              </label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={memberData.member_id_string}
                  onChange={(e) => {
                    // Only allow 4-digit numbers
                    const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                    setMemberData(prev => ({ ...prev, member_id_string: value }));
                  }}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
                  placeholder="0001"
                  maxLength={4}
                  required
                />
                <button
                  type="button"
                  onClick={generateMemberId}
                  className="px-3 py-2 text-sm text-orange-600 border border-orange-200 rounded-md hover:bg-orange-50"
                >
                  Generate
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">Next available ID loaded by default</p>
            </div>

            {/* Photo Section - Centered */}
            <div className="flex flex-col items-center space-y-4">
              {capturedPhoto ? (
                <div className="relative">
                  <img 
                    src={capturedPhoto} 
                    alt="Member photo"
                    className="w-32 h-32 rounded-full mx-auto object-cover border-4 border-orange-200 shadow-lg"
                  />
                  <button
                    type="button"
                    onClick={retakePhoto}
                    className="absolute bottom-0 right-0 p-2 bg-orange-600 text-white rounded-full hover:bg-orange-700 shadow-lg"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </button>
                </div>
              ) : showCamera ? (
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
                    {!cameraReady && (
                      <div className="absolute inset-0 flex items-center justify-center bg-gray-200">
                        <div className="text-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto mb-2"></div>
                          <p className="text-sm text-gray-600">Loading camera...</p>
                        </div>
                      </div>
                    )}
                  </div>
                  <canvas ref={canvasRef} className="hidden" />
                  <div className="flex justify-center space-x-3 mt-3">
                    <button
                      type="button"
                      onClick={capturePhoto}
                      disabled={!cameraReady}
                      className="flex items-center px-4 py-2 bg-white text-orange-600 border-2 border-orange-600 rounded-md hover:bg-orange-50 text-sm font-medium disabled:opacity-50"
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Capture
                    </button>
                    <button
                      type="button"
                      onClick={() => { stopCamera(); startCamera(); }}
                      className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
                    >
                      <RotateCcw className="h-4 w-4 mr-1" />
                      Retry
                    </button>
                    <button
                      type="button"
                      onClick={stopCamera}
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
              
              {!capturedPhoto && !showCamera && (
                <button
                  type="button"
                  onClick={startCamera}
                  className="flex items-center justify-center mx-auto px-4 py-2 text-sm font-medium text-orange-600 bg-orange-50 rounded-md hover:bg-orange-100 border border-orange-200"
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Take Photo
                </button>
              )}
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
                        ? 'border-orange-500 bg-orange-50 ring-2 ring-orange-200'
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
                        <div className="text-sm text-gray-500 space-y-1">
                          <p>{plan.duration_months} month{plan.duration_months !== 1 ? 's' : ''}</p>
                          {plan.free_months_on_signup > 0 && (
                            <p className="text-green-600 font-medium">
                              + {plan.free_months_on_signup} free month{plan.free_months_on_signup !== 1 ? 's' : ''}
                            </p>
                          )}
                          {plan.has_registration_fee && (
                            <p className="text-amber-600 text-xs">+ RM{registrationFee} registration fee</p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900 text-lg">RM{plan.price}</p>
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
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Payment Method *
              </label>
              <div className="grid grid-cols-3 gap-3">
                {paymentMethods.map((method) => (
                  <button
                    key={method.value}
                    type="button"
                    onClick={() => setPurchaseData(prev => ({ ...prev, payment_method: method.value }))}
                    className={`flex flex-col items-center p-4 border-2 rounded-lg transition-all ${
                      purchaseData.payment_method === method.value
                        ? 'border-orange-500 bg-orange-50 text-orange-700'
                        : 'border-gray-200 hover:border-gray-300 text-gray-600'
                    }`}
                  >
                    <method.icon className="h-6 w-6 mb-2" />
                    <span className="text-sm font-medium">{method.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {selectedPlan && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-3">Order Summary</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>{selectedPlan.name}</span>
                    <span>RM{selectedPlan.price}</span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Duration: {selectedPlan.duration_months} month{selectedPlan.duration_months !== 1 ? 's' : ''}</span>
                    {selectedPlan.free_months_on_signup > 0 && (
                      <span>+ {selectedPlan.free_months_on_signup} free month{selectedPlan.free_months_on_signup !== 1 ? 's' : ''}</span>
                    )}
                  </div>
                  {regFeeAmount > 0 && (
                    <div className="flex justify-between">
                      <span>Registration Fee</span>
                      <span>RM{regFeeAmount}</span>
                    </div>
                  )}
                  <div className="border-t pt-2 flex justify-between font-medium">
                    <span>Total</span>
                    <span>RM{totalAmount}</span>
                  </div>
                  {expiryDate && (
                    <div className="flex justify-between text-xs text-green-600 font-medium pt-1 border-t border-gray-200">
                      <span>Membership expires:</span>
                      <span>{expiryDate.toLocaleDateString('en-GB', { 
                        day: '2-digit', 
                        month: 'short', 
                        year: 'numeric' 
                      })}</span>
                    </div>
                  )}
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