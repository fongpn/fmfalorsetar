import React, { useState, useRef, useEffect } from 'react';
import { X, Package, Save, AlertCircle, DollarSign, Camera, RotateCcw, Upload } from 'lucide-react';
import { posService } from '../../services/posService';
import { Product } from '../../lib/supabase';

interface EditProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  product: Product | null;
}

export function EditProductModal({ isOpen, onClose, onSuccess, product }: EditProductModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [cameraMode, setCameraMode] = useState<'none' | 'loading' | 'ready' | 'captured' | 'error'>('none');
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    name: '',
    price: 0,
    photo_url: '',
    is_active: true
  });

  useEffect(() => {
    if (isOpen && product) {
      setFormData({
        name: product.name,
        price: product.price,
        photo_url: product.photo_url || '',
        is_active: product.is_active
      });
      setPhotoDataUrl(product.photo_url || null);
      setError('');
      setCameraMode('none');
    } else {
      cleanupCamera();
    }
  }, [isOpen, product]);

  useEffect(() => {
    return () => {
      cleanupCamera();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!product) return;

    if (!formData.name.trim()) {
      setError('Product name is required');
      return;
    }

    if (formData.price <= 0) {
      setError('Price must be greater than 0');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await posService.updateProduct(product.id, formData);
      onSuccess();
      handleClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update product');
    } finally {
      setLoading(false);
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
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'environment' },
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
        setPhotoDataUrl(dataUrl);
        setFormData(prev => ({ ...prev, photo_url: dataUrl }));
        setCameraMode('captured');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleClose = () => {
    cleanupCamera();
    setError('');
    onClose();
  };

  if (!isOpen || !product) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Edit Product</h2>
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

          {/* Photo Section */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">Product Photo</label>
            <div className="flex flex-col items-center gap-4">
              {photoDataUrl ? (
                <img 
                  src={photoDataUrl} 
                  alt="Product" 
                  className="w-32 h-32 rounded-lg object-cover border-2 border-gray-200"
                />
              ) : (
                <div className="w-32 h-32 bg-gray-100 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300">
                  <Package className="h-12 w-12 text-gray-400" />
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
                      {photoDataUrl ? 'Retake' : 'Take Photo'}
                    </button>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center px-3 py-2 text-sm font-medium text-gray-600 bg-gray-50 rounded-md hover:bg-gray-100 border border-gray-200"
                    >
                      <Upload className="h-4 w-4 mr-1" />
                      {photoDataUrl ? 'Replace' : 'Upload'}
                    </button>
                  </>
                )}
                {photoDataUrl && cameraMode !== 'ready' && (
                  <button
                    type="button"
                    onClick={() => {
                      setPhotoDataUrl(null);
                      setFormData(prev => ({ ...prev, photo_url: '' }));
                    }}
                    className="flex items-center px-3 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-md hover:bg-red-100 border border-red-200"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Remove
                  </button>
                )}
              </div>
            </div>

            {/* Camera Interface */}
            {cameraMode !== 'none' && cameraMode !== 'captured' && (
              <div className="relative w-full aspect-video bg-gray-900 rounded-lg overflow-hidden">
                <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
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
                      className="bg-orange-600 hover:bg-orange-700 text-white rounded-full p-4 h-16 w-16 flex items-center justify-center shadow-lg"
                    >
                      <Camera className="h-8 w-8" />
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
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Product Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
              placeholder="e.g., Protein Shake"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Price (RM) *
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={formData.price}
                onChange={(e) => setFormData(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
                placeholder="0.00"
                required
              />
            </div>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
              className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
            />
            <label htmlFor="is_active" className="ml-2 text-sm text-gray-700">
              Active product (available for sale)
            </label>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
            <div className="flex items-start space-x-2">
              <Package className="h-4 w-4 text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-700">
                <p className="font-medium">Current Stock: {product.current_stock} units</p>
                <p>Use "Manage Stock" to adjust inventory levels. Only product details can be edited here.</p>
              </div>
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
              disabled={loading}
              className="flex items-center px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-md hover:bg-orange-700 disabled:opacity-50"
            >
              {loading && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>}
              <Save className="h-4 w-4 mr-2" />
              {loading ? 'Updating...' : 'Update Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}