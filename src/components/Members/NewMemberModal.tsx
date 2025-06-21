import React, { useState, useEffect, useRef } from 'react';
import { X, User, Phone, CreditCard, Camera, RotateCcw, Check, Car as CarIcon, Banknote, Smartphone, QrCode, AlertCircle } from 'lucide-react';
// Using a more standard icon for ID Card
import { VscVscode as IdCard } from 'react-icons/vsc';


// --- MOCK DATA AND SERVICES FOR DEMONSTRATION ---
// In your actual app, you would remove this section and use your real imports.

type MembershipPlan = {
  id: string;
  name: string;
  price: number;
  duration_months: number;
  has_registration_fee: boolean;
  free_months_on_signup: number;
  is_active: boolean;
};

const memberService = {
  getMembershipPlans: async (): Promise<MembershipPlan[]> => {
    console.log('Fetching membership plans...');
    await new Promise(res => setTimeout(res, 500)); // Simulate network delay
    return [
      { id: 'plan1', name: 'Monthly Basic', price: 50.00, duration_months: 1, has_registration_fee: true, free_months_on_signup: 0, is_active: true },
      { id: 'plan2', name: 'Quarterly Gold', price: 135.00, duration_months: 3, has_registration_fee: true, free_months_on_signup: 0, is_active: true },
      { id: 'plan3', name: 'Annual VIP (12 + 2)', price: 450.00, duration_months: 12, has_registration_fee: false, free_months_on_signup: 2, is_active: true },
    ];
  },
  getRegistrationFee: async (): Promise<number> => 50.00,
  generateMemberId: async (): Promise<string> => `FMF-${Date.now().toString().slice(-6)}`,
  createMember: async (data: any) => {
    console.log('Creating member:', data);
    await new Promise(res => setTimeout(res, 1000));
    return { ...data, id: `member-${Date.now()}` };
  },
  purchaseMembership: async (data: any) => {
    console.log('Purchasing membership:', data);
    await new Promise(res => setTimeout(res, 1000));
    return { success: true };
  }
};

const useShift = () => ({ activeShift: { id: 'shift-active-123' } });
const useAuth = () => ({ profile: { id: 'cs-user-456' } });

// --- END OF MOCK DATA AND SERVICES ---


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

  // Camera state management
  const [cameraMode, setCameraMode] = useState<'none' | 'loading' | 'ready' | 'captured' | 'error'>('none');
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // Form data states
  const [memberData, setMemberData] = useState({
    member_id_string: '',
    full_name: '',
    ic_passport_number: '',
    phone_number: '',
    photo_url: ''
  });
  const [purchaseData, setPurchaseData] = useState({
    plan_id: '',
    payment_method: 'CASH'
  });

  // Effect to reset the form and load initial data when the modal is opened
  useEffect(() => {
    if (isOpen) {
      resetForm(false); // Reset without closing
      loadInitialData();
    } else {
      cleanupCamera(); // Ensure camera is off when modal is not open
    }
  }, [isOpen]);

  // Effect to handle component unmount cleanup
  useEffect(() => {
    return () => {
      cleanupCamera();
    };
  }, []);
  
  const loadInitialData = async () => {
    await loadPlans();
    await loadRegistrationFee();
    await generateMemberId();
  };

  /**
   * Stops all camera tracks and resets the video element.
   * This is the single source of truth for turning off the camera.
   */
  const cleanupCamera = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  /**
   * Initializes and starts the camera stream.
   * This function now follows a clean state flow to prevent race conditions.
   */
  const initializeCamera = async () => {
    if (cameraMode === 'loading' || cameraMode === 'ready') return;

    cleanupCamera(); // Ensure any previous stream is stopped
    setCameraMode('loading');
    setCameraError('');
    setPhotoDataUrl(null);

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('Camera not supported in this browser.');
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
      setCameraError(message);
      setCameraMode('error');
    }
  };

  /**
   * Captures a frame from the video stream and sets it as the member's photo.
   */
  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current && cameraMode === 'ready') {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      if (!context) {
        setCameraError('Could not get canvas context.');
        return;
      }

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      // Flip the context horizontally to un-mirror the captured image
      context.translate(canvas.width, 0);
      context.scale(-1, 1);
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
      setPhotoDataUrl(dataUrl);
      setMemberData(prev => ({ ...prev, photo_url: dataUrl }));
      setCameraMode('captured');
      
      cleanupCamera(); // Stop the stream after capturing
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
      setError('Failed to load membership plans.');
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
      setError('Failed to generate Member ID.');
    }
  };

  const handleMemberSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberData.full_name.trim()) {
      setError('Full name is required.');
      return;
    }
    if (!memberData.member_id_string.trim()) {
        setError('Member ID is required.');
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
      setError('User profile not found. Please log in again.');
      return;
    }
    if (!purchaseData.plan_id) {
      setError('Please select a membership plan.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const member = await memberService.createMember(memberData);
      await memberService.purchaseMembership({
        member_id: member.id,
        plan_id: purchaseData.plan_id,
        payment_method: purchaseData.payment_method,
        shift_id: activeShift.id,
        processed_by: profile.id,
        is_renewal: false
      });
      onSuccess();
      handleClose();
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred during purchase.');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = (shouldCloseModal = true) => {
    setStep(1);
    setLoading(false);
    setError('');
    setCameraError('');
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
    if (shouldCloseModal) {
      onClose();
    }
  };

  const handleClose = () => {
    resetForm(true);
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50 transition-opacity duration-300">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[95vh] flex flex-col transform transition-all duration-300 scale-95 animate-fade-in-up">
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800">New Member Registration</h2>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 rounded-full p-1 transition-colors">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-2">
              <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
          
          {step === 1 && (
            <form onSubmit={handleMemberSubmit} className="space-y-6">
                 {/* Photo Section - MODIFIED FOR CENTERING */}
                 <div className="space-y-3">
                    <label className="block text-sm font-medium text-gray-700 text-center">Member Photo</label>
                    <div className="flex flex-col items-center gap-4">
                        {photoDataUrl ? (
                            <img src={photoDataUrl} alt="Member" className="w-24 h-24 rounded-full object-cover border-4 border-green-500" />
                        ) : (
                            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center border">
                                <User className="h-12 w-12 text-gray-400" />
                            </div>
                        )}
                        <div className="flex-1 flex justify-center">
                            {cameraMode === 'none' && !photoDataUrl && (
                                <Button type="button" variant="outline" onClick={initializeCamera}>
                                    <Camera className="h-4 w-4 mr-2" />
                                    Take Photo
                                </Button>
                            )}
                            {photoDataUrl && (
                                <Button type="button" variant="outline" onClick={retakePhoto}>
                                    <RotateCcw className="h-4 w-4 mr-2" />
                                    Retake
                                </Button>
                            )}
                        </div>
                    </div>

                    {cameraMode !== 'none' && cameraMode !== 'captured' && (
                        <div className="relative w-full aspect-video bg-gray-900 rounded-lg overflow-hidden mt-2">
                            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" style={{ transform: 'scaleX(-1)' }} />
                            {cameraMode === 'loading' && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
                                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white"></div>
                                </div>
                            )}
                            <canvas ref={canvasRef} className="hidden" />
                            {cameraMode === 'ready' && (
                                <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
                                    <Button type="button" onClick={capturePhoto} className="!rounded-full !p-4 h-16 w-16">
                                        <Camera className="h-8 w-8" />
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}
                    {cameraError && (
                        <p className="text-xs text-red-600 text-center">{cameraError}</p>
                    )}
                </div>
              
              {/* Member Details */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Member ID</label>
                  <div className="flex gap-2">
                    <input type="text" value={memberData.member_id_string} onChange={(e) => setMemberData(prev => ({ ...prev, member_id_string: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500" placeholder="Auto-generated ID" required />
                    <Button type="button" variant="outline" onClick={generateMemberId}>Generate</Button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                  <input type="text" value={memberData.full_name} onChange={(e) => setMemberData(prev => ({ ...prev, full_name: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500" placeholder="e.g. John Doe" required />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">IC or Passport Number</label>
                  <input type="text" value={memberData.ic_passport_number} onChange={(e) => setMemberData(prev => ({ ...prev, ic_passport_number: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500" placeholder="Optional"/>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                  <input type="tel" value={memberData.phone_number} onChange={(e) => setMemberData(prev => ({ ...prev, phone_number: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500" placeholder="Optional" />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
                <Button type="submit" variant="primary">Next: Select Plan</Button>
              </div>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handlePurchaseSubmit} className="space-y-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Select Membership Plan *</label>
                    <div className="space-y-3">
                        {plans.map((plan) => (
                            <label key={plan.id} className={`flex justify-between items-center p-4 border rounded-lg cursor-pointer transition-all ${purchaseData.plan_id === plan.id ? 'border-orange-500 bg-orange-50 ring-2 ring-orange-200' : 'border-gray-200 hover:border-gray-300'}`}>
                                <input type="radio" name="plan" value={plan.id} checked={purchaseData.plan_id === plan.id} onChange={(e) => setPurchaseData(prev => ({ ...prev, plan_id: e.target.value }))} className="sr-only" />
                                <div>
                                    <h4 className="font-semibold text-gray-800">{plan.name}</h4>
                                    <p className="text-sm text-gray-500">{plan.duration_months} month(s)</p>
                                </div>
                                <p className="font-semibold text-lg text-gray-800">RM{plan.price.toFixed(2)}</p>
                            </label>
                        ))}
                    </div>
                  <div className="grid grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => setPurchaseData(prev => ({ ...prev, payment_method: 'CASH' }))}
                      className={`flex flex-col items-center p-4 border-2 rounded-lg transition-all ${
                        purchaseData.payment_method === 'CASH'
                          ? 'border-orange-500 bg-orange-50 text-orange-700'
                          : 'border-gray-200 hover:border-gray-300 text-gray-600'
                      }`}
                    >
                      <Banknote className="h-6 w-6 mb-2" />
                      <span className="text-sm font-medium">Cash</span>
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => setPurchaseData(prev => ({ ...prev, payment_method: 'QR' }))}
                      className={`flex flex-col items-center p-4 border-2 rounded-lg transition-all ${
                        purchaseData.payment_method === 'QR'
                          ? 'border-orange-500 bg-orange-50 text-orange-700'
                          : 'border-gray-200 hover:border-gray-300 text-gray-600'
                      }`}
                    >
                      <QrCode className="h-6 w-6 mb-2" />
                      <span className="text-sm font-medium">QR</span>
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => setPurchaseData(prev => ({ ...prev, payment_method: 'BANK_TRANSFER' }))}
                      className={`flex flex-col items-center p-4 border-2 rounded-lg transition-all ${
                        purchaseData.payment_method === 'BANK_TRANSFER'
                          ? 'border-orange-500 bg-orange-50 text-orange-700'
                          : 'border-gray-200 hover:border-gray-300 text-gray-600'
                      }`}
                    >
                      <Smartphone className="h-6 w-6 mb-2" />
                      <span className="text-sm font-medium">Bank Transfer</span>
                    </button>
                  </div>
                </div>

                {selectedPlan && (
                    <div className="bg-gray-50 p-4 rounded-lg border">
                        <h4 className="font-medium text-gray-900 mb-3 text-lg">Order Summary</h4>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-600">{selectedPlan.name}</span>
                                <span className="font-medium">RM{selectedPlan.price.toFixed(2)}</span>
                            </div>
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>Duration: {selectedPlan.duration_months} month{selectedPlan.duration_months !== 1 ? 's' : ''}</span>
                        {selectedPlan.free_months_on_signup > 0 && (
                          <span>+ {selectedPlan.free_months_on_signup} free month{selectedPlan.free_months_on_signup !== 1 ? 's' : ''}</span>
                        )}
                      </div>
                            {regFeeAmount > 0 && (
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Registration Fee</span>
                                    <span className="font-medium">RM{regFeeAmount.toFixed(2)}</span>
                                </div>
                            )}
                            <div className="border-t pt-2 mt-2 flex justify-between font-bold text-lg">
                                <span>Total</span>
                                <span>RM{totalAmount.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>
                )}
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
              
              <div className="flex justify-between items-center pt-4">
                <Button type="button" variant="outline" onClick={() => setStep(1)}>Back</Button>
                <Button type="submit" variant="primary" loading={loading} disabled={loading || !purchaseData.plan_id}>
                  {loading ? 'Processing...' : `Complete Registration`}
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

// Custom Button component for better styling control
function Button({ children, variant = 'primary', loading = false, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'outline', loading?: boolean }) {
    const baseClasses = "inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors";
    const variantClasses = {
        primary: 'bg-orange-600 text-white hover:bg-orange-700 focus:ring-orange-500',
        outline: 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 focus:ring-orange-500',
    };
    return (
        <button className={`${baseClasses} ${variantClasses[variant]}`} disabled={loading} {...props}>
            {loading && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>}
            {children}
        </button>
    );
}