import React, { useState, useRef, useEffect } from 'react';
import { Layout } from '../components/Layout/Layout';
import { Save, Settings as SettingsIcon, DollarSign, Clock, Mail, Shield, CheckCircle, AlertCircle, Camera, RotateCcw, Upload, Image } from 'lucide-react';
import { settingsService, SettingsData } from '../services/settingsService';

export function Settings() {
  const [activeTab, setActiveTab] = useState<'general' | 'financial' | 'notifications' | 'security'>('general');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Logo upload state
  const [cameraMode, setCameraMode] = useState<'none' | 'loading' | 'ready' | 'captured' | 'error'>('none');
  const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  const [settings, setSettings] = useState<SettingsData>({
    // General Settings
    gym_name: 'FMF Gym',
    gym_logo_url: '',
    gym_address: '123 Fitness Street, Alor Setar, Kedah',
    gym_phone: '+60 12-345 6789',
    gym_email: 'info@fmfgym.com',
    timezone: 'Asia/Kuala_Lumpur',
    
    // Financial Settings
    walk_in_rate: 15.00,
    walk_in_student_rate: 8.00,
    registration_fee_default: 25.00,
    grace_period_days: 7,
    late_fee_amount: 10.00,
    
    // Notification Settings
    email_notifications: true,
    sms_notifications: false,
    expiry_reminder_days: 7,
    low_stock_threshold: 10,
    
    // Security Settings
    session_timeout: 60,
    require_password_change: false,
    two_factor_auth: false
  });

  React.useEffect(() => {
    loadSettings();
  }, []);
  
  useEffect(() => {
    // Set logo data URL from settings when loaded
    if (settings.gym_logo_url) {
      setLogoDataUrl(settings.gym_logo_url);
    }
    
    // Cleanup camera on unmount
    return () => {
      cleanupCamera();
    };
  }, [settings.gym_logo_url]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await settingsService.getAllSettings();
      setSettings(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSettingChange = (key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    // Clear success message when user makes changes
    if (success) setSuccess(null);
  };

  // Camera and image handling functions
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
    setError(null);

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
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
      setLogoDataUrl(dataUrl);
      setSettings(prev => ({ ...prev, gym_logo_url: dataUrl }));
      setCameraMode('captured');
      
      cleanupCamera();
    }
  };

  const retakePhoto = () => {
    setLogoDataUrl(null);
    setSettings(prev => ({ ...prev, gym_logo_url: '' }));
    initializeCamera();
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        setError('Image file size must be less than 5MB');
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        setLogoDataUrl(dataUrl);
        setSettings(prev => ({ ...prev, gym_logo_url: dataUrl }));
        setCameraMode('captured');
      };
      reader.readAsDataURL(file);
    }
  };

  const removeLogo = () => {
    setLogoDataUrl(null);
    setSettings(prev => ({ ...prev, gym_logo_url: '' }));
    setCameraMode('none');
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);
      
      const result = await settingsService.updateSettings(settings);
      
      if (result.success) {
        setSuccess(result.message);
        // Clear success message after 3 seconds
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(result.message);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Layout title="System Settings" subtitle="Configure system preferences and business rules">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="System Settings" subtitle="Configure system preferences and business rules">
      <div className="space-y-6">
        {/* Status Messages */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center space-x-2">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <div>
              <p className="text-red-600 font-medium">Error</p>
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center space-x-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <div>
              <p className="text-green-600 font-medium">Success</p>
              <p className="text-green-600 text-sm">{success}</p>
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="bg-white rounded-lg border border-gray-200 p-1">
          <div className="flex space-x-1">
            <button
              onClick={() => setActiveTab('general')}
              className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'general'
                  ? 'bg-orange-100 text-orange-700'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <SettingsIcon className="h-4 w-4 mr-2 inline" />
              General
            </button>
            <button
              onClick={() => setActiveTab('financial')}
              className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'financial'
                  ? 'bg-orange-100 text-orange-700'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <DollarSign className="h-4 w-4 mr-2 inline" />
              Financial
            </button>
            <button
              onClick={() => setActiveTab('notifications')}
              className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'notifications'
                  ? 'bg-orange-100 text-orange-700'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Mail className="h-4 w-4 mr-2 inline" />
              Notifications
            </button>
            <button
              onClick={() => setActiveTab('security')}
              className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'security'
                  ? 'bg-orange-100 text-orange-700'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Shield className="h-4 w-4 mr-2 inline" />
              Security
            </button>
          </div>
        </div>

        {/* General Settings */}
        {activeTab === 'general' && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">General Settings</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Logo Upload Section */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Gym Logo
                </label>
                <div className="flex flex-col items-center gap-4">
                  {logoDataUrl ? (
                    <div className="relative">
                      <img 
                        src={logoDataUrl} 
                        alt="Gym Logo" 
                        className="w-32 h-32 object-contain border-2 border-gray-200 rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={removeLogo}
                        className="absolute -top-2 -right-2 p-1 bg-red-100 text-red-600 rounded-full hover:bg-red-200"
                        title="Remove logo"
                      >
                        <AlertCircle className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="w-32 h-32 bg-gray-100 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300">
                      <Image className="h-12 w-12 text-gray-400" />
                    </div>
                  )}
                  
                  <div className="flex gap-2">
                    {cameraMode === 'none' && (
                      <>
                        <button
                          type="button"
                          onClick={initializeCamera}
                          className="flex items-center px-3 py-2 text-sm font-medium text-orange-600 bg-orange-50 rounded-md hover:bg-orange-100 border border-orange-200"
                        >
                          <Camera className="h-4 w-4 mr-1" />
                          {logoDataUrl ? 'Change Logo' : 'Take Photo'}
                        </button>
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="flex items-center px-3 py-2 text-sm font-medium text-gray-600 bg-gray-50 rounded-md hover:bg-gray-100 border border-gray-200"
                        >
                          <Upload className="h-4 w-4 mr-1" />
                          Upload Logo
                        </button>
                      </>
                    )}
                    {logoDataUrl && cameraMode === 'none' && (
                      <button
                        type="button"
                        onClick={removeLogo}
                        className="flex items-center px-3 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-md hover:bg-red-100 border border-red-200"
                      >
                        <AlertCircle className="h-4 w-4 mr-1" />
                        Remove
                      </button>
                    )}
                  </div>
                </div>

                {/* Camera Interface */}
                {cameraMode !== 'none' && cameraMode !== 'captured' && (
                  <div className="mt-4 relative w-full aspect-video max-w-md mx-auto bg-gray-900 rounded-lg overflow-hidden">
                    <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                    {cameraMode === 'loading' && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white"></div>
                      </div>
                    )}
                    <canvas ref={canvasRef} className="hidden" />
                    {cameraMode === 'ready' && (
                      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex space-x-4">
                        <button
                          type="button"
                          onClick={capturePhoto}
                          className="bg-orange-600 hover:bg-orange-700 text-white rounded-full p-4 h-16 w-16 flex items-center justify-center shadow-lg"
                        >
                          <Camera className="h-8 w-8" />
                        </button>
                        <button
                          type="button"
                          onClick={cleanupCamera}
                          className="bg-gray-600 hover:bg-gray-700 text-white rounded-full p-4 h-16 w-16 flex items-center justify-center shadow-lg"
                        >
                          <X className="h-8 w-8" />
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Hidden file input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                
                <p className="text-xs text-gray-500 mt-2">
                  Upload a logo to display on the login page and throughout the application. 
                  Recommended size: 200x200 pixels. Maximum file size: 5MB.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Gym Name
                </label>
                <input
                  type="text"
                  value={settings.gym_name}
                  onChange={(e) => handleSettingChange('gym_name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={settings.gym_phone}
                  onChange={(e) => handleSettingChange('gym_phone', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Address
                </label>
                <textarea
                  value={settings.gym_address}
                  onChange={(e) => handleSettingChange('gym_address', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={settings.gym_email}
                  onChange={(e) => handleSettingChange('gym_email', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Timezone
                </label>
                <select
                  value={settings.timezone}
                  onChange={(e) => handleSettingChange('timezone', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
                >
                  <option value="Asia/Kuala_Lumpur">Malaysia Time (GMT+8)</option>
                  <option value="Asia/Singapore">Singapore Time (GMT+8)</option>
                  <option value="Asia/Bangkok">Bangkok Time (GMT+7)</option>
                  <option value="Asia/Jakarta">Jakarta Time (GMT+7)</option>
                  <option value="Asia/Manila">Manila Time (GMT+8)</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Financial Settings */}
        {activeTab === 'financial' && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Financial Settings</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Walk-in Rate (RM)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={settings.walk_in_rate}
                  onChange={(e) => handleSettingChange('walk_in_rate', parseFloat(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
                />
                <p className="text-xs text-gray-500 mt-1">Regular walk-in daily rate</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Student Walk-in Rate (RM)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={settings.walk_in_student_rate}
                  onChange={(e) => handleSettingChange('walk_in_student_rate', parseFloat(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
                />
                <p className="text-xs text-gray-500 mt-1">Student walk-in daily rate (discounted)</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Registration Fee (RM)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={settings.registration_fee_default}
                  onChange={(e) => handleSettingChange('registration_fee_default', parseFloat(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Grace Period (Days)
                </label>
                <input
                  type="number"
                  value={settings.grace_period_days}
                  onChange={(e) => handleSettingChange('grace_period_days', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Late Fee Amount (RM)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={settings.late_fee_amount}
                  onChange={(e) => handleSettingChange('late_fee_amount', parseFloat(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* Notification Settings */}
        {activeTab === 'notifications' && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Notification Settings</h3>
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-gray-900">Email Notifications</h4>
                  <p className="text-sm text-gray-500">Send notifications via email</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.email_notifications}
                    onChange={(e) => handleSettingChange('email_notifications', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-gray-900">SMS Notifications</h4>
                  <p className="text-sm text-gray-500">Send notifications via SMS</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.sms_notifications}
                    onChange={(e) => handleSettingChange('sms_notifications', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Expiry Reminder (Days Before)
                  </label>
                  <input
                    type="number"
                    value={settings.expiry_reminder_days}
                    onChange={(e) => handleSettingChange('expiry_reminder_days', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Low Stock Threshold
                  </label>
                  <input
                    type="number"
                    value={settings.low_stock_threshold}
                    onChange={(e) => handleSettingChange('low_stock_threshold', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Security Settings */}
        {activeTab === 'security' && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Security Settings</h3>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Session Timeout (Minutes)
                </label>
                <input
                  type="number"
                  value={settings.session_timeout}
                  onChange={(e) => handleSettingChange('session_timeout', parseInt(e.target.value))}
                  className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-gray-900">Require Password Change</h4>
                  <p className="text-sm text-gray-500">Force users to change password on next login</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.require_password_change}
                    onChange={(e) => handleSettingChange('require_password_change', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-gray-900">Two-Factor Authentication</h4>
                  <p className="text-sm text-gray-500">Require 2FA for all staff accounts</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.two_factor_auth}
                    onChange={(e) => handleSettingChange('two_factor_auth', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center px-6 py-2 text-sm font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700"
          >
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </Layout>
  );
}