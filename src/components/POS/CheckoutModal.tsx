import React, { useState } from 'react';
import { X, CreditCard, DollarSign, Smartphone, Banknote, QrCode } from 'lucide-react';
import { CartItem, posService } from '../../services/posService';
import { useShift } from '../../hooks/useShift';
import { useAuth } from '../../contexts/AuthContext';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  items: CartItem[];
  total: number;
}

export function CheckoutModal({ isOpen, onClose, onSuccess, items, total }: CheckoutModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [customerName, setCustomerName] = useState('');
  const [notes, setNotes] = useState('');
  const { activeShift } = useShift();
  const { profile } = useAuth();

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

    if (items.length === 0) {
      setError('Cart is empty');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await posService.processSale({
        items,
        total,
        payment_method: paymentMethod,
        shift_id: activeShift.id,
        processed_by: profile.id,
        customer_name: customerName.trim() || undefined,
        notes: notes.trim() || undefined
      });

      if (result.success) {
        onSuccess();
        onClose();
        resetForm();
      } else {
        setError(result.message);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setPaymentMethod('CASH');
    setCustomerName('');
    setNotes('');
    setError('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  const paymentMethods = [
    { value: 'CASH', label: 'Cash', icon: DollarSign },
    { value: 'CARD', label: 'Card', icon: CreditCard },
    { value: 'BANK_TRANSFER', label: 'Bank Transfer', icon: Smartphone },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Checkout</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Order Summary */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-3">Order Summary</h3>
            <div className="space-y-2">
              {items.map((item) => (
                <div key={item.product.id} className="flex justify-between text-sm">
                  <span>{item.product.name} × {item.quantity}</span>
                  <span>RM{item.subtotal.toFixed(2)}</span>
                </div>
              ))}
              <div className="border-t pt-2 flex justify-between font-semibold">
                <span>Total</span>
                <span>RM{total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Payment Method */}
          <div className="space-y-4">
            <label className="block text-sm font-medium text-gray-700 mb-4">
              Payment Method *
            </label>
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setPaymentMethod('CASH')}
                className={`flex flex-col items-center p-4 border-2 rounded-lg transition-all ${
                  paymentMethod === 'CASH'
                    ? 'border-orange-500 bg-orange-50 text-orange-700'
                    : 'border-gray-200 hover:border-gray-300 text-gray-600'
                }`}
              >
                <Banknote className="h-6 w-6 mb-2" />
                <span className="text-sm font-medium">Cash</span>
              </button>
              
              <button
                type="button"
                onClick={() => setPaymentMethod('QR')}
                className={`flex flex-col items-center p-4 border-2 rounded-lg transition-all ${
                  paymentMethod === 'QR'
                    ? 'border-orange-500 bg-orange-50 text-orange-700'
                    : 'border-gray-200 hover:border-gray-300 text-gray-600'
                }`}
              >
                <QrCode className="h-6 w-6 mb-2" />
                <span className="text-sm font-medium">QR Code</span>
              </button>
              
              <button
                type="button"
                onClick={() => setPaymentMethod('BANK_TRANSFER')}
                className={`flex flex-col items-center p-4 border-2 rounded-lg transition-all ${
                  paymentMethod === 'BANK_TRANSFER'
                    ? 'border-orange-500 bg-orange-50 text-orange-700'
                    : 'border-gray-200 hover:border-gray-300 text-gray-600'
                }`}
              >
                <Smartphone className="h-6 w-6 mb-2" />
                <span className="text-sm font-medium">Bank Transfer</span>
              </button>
            </div>
          </div>

          {/* Legacy payment method selector (hidden but maintains functionality) */}
          <div className="hidden">
            <div className="grid grid-cols-1 gap-2">
              {paymentMethods.map((method) => (
                <label
                  key={method.value}
                  className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                    paymentMethod === method.value
                      ? 'border-orange-500 bg-orange-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value={method.value}
                    checked={paymentMethod === method.value}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="sr-only"
                  />
                  <method.icon className="h-5 w-5 text-gray-600 mr-3" />
                  <span className="font-medium">{method.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Customer Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Customer Name (Optional)
            </label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Enter customer name"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional notes..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
            />
          </div>

          {/* Action Buttons */}
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
              disabled={loading || items.length === 0}
              className="px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-md hover:bg-orange-700 disabled:opacity-50"
            >
              {loading ? 'Processing...' : `Complete Sale (RM${total.toFixed(2)})`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}