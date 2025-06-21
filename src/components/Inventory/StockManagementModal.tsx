import React, { useState, useEffect } from 'react';
import { X, Plus, Package } from 'lucide-react';
import { posService, StockMovement } from '../../services/posService';
import { Product } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface StockManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface StockAdjustment {
  product_id: string;
  product_name: string;
  current_stock: number;
  adjustment: number;
  reason: string;
}

export function StockManagementModal({ isOpen, onClose, onSuccess }: StockManagementModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [adjustments, setAdjustments] = useState<StockAdjustment[]>([]);
  const { profile } = useAuth();

  useEffect(() => {
    if (isOpen) {
      loadProducts();
    }
  }, [isOpen]);

  const loadProducts = async () => {
    try {
      const data = await posService.getAllProducts();
      setProducts(data);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const addAdjustment = () => {
    setAdjustments([...adjustments, {
      product_id: '',
      product_name: '',
      current_stock: 0,
      adjustment: 0,
      reason: 'STOCK_IN'
    }]);
  };

  const updateAdjustment = (index: number, field: keyof StockAdjustment, value: any) => {
    const updated = [...adjustments];
    updated[index] = { ...updated[index], [field]: value };

    // If product_id changed, update product_name and current_stock
    if (field === 'product_id') {
      const product = products.find(p => p.id === value);
      if (product) {
        updated[index].product_name = product.name;
        updated[index].current_stock = product.current_stock;
      }
    }

    setAdjustments(updated);
  };

  const removeAdjustment = (index: number) => {
    setAdjustments(adjustments.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!profile) {
      setError('User profile not found');
      return;
    }

    if (adjustments.length === 0) {
      setError('Please add at least one stock adjustment');
      return;
    }

    // Validate adjustments
    for (const adj of adjustments) {
      if (!adj.product_id) {
        setError('Please select a product for all adjustments');
        return;
      }
      if (adj.adjustment === 0) {
        setError('Adjustment quantity cannot be zero');
        return;
      }
    }

    setLoading(true);
    setError('');

    try {
      const movements: StockMovement[] = adjustments.map(adj => ({
        product_id: adj.product_id,
        change_quantity: adj.adjustment,
        reason: adj.reason,
        created_by: profile.id
      }));

      const result = await posService.addStock(movements);
      
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
    setAdjustments([]);
    setError('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  const reasonOptions = [
    { value: 'STOCK_IN', label: 'Stock In (Delivery)' },
    { value: 'STOCK_ADJUSTMENT', label: 'Stock Adjustment' },
    { value: 'STOCK_CORRECTION', label: 'Stock Correction' },
    { value: 'DAMAGED_GOODS', label: 'Damaged Goods (Negative)' },
    { value: 'EXPIRED_GOODS', label: 'Expired Goods (Negative)' },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Stock Management</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">Stock Adjustments</h3>
            <button
              type="button"
              onClick={addAdjustment}
              className="flex items-center px-3 py-2 text-sm font-medium text-orange-600 bg-orange-50 rounded-md hover:bg-orange-100"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Adjustment
            </button>
          </div>

          {adjustments.length === 0 ? (
            <div className="text-center py-8">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No adjustments added yet</p>
              <p className="text-sm text-gray-400 mt-1">Click "Add Adjustment" to start</p>
            </div>
          ) : (
            <div className="space-y-4">
              {adjustments.map((adjustment, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Product *
                      </label>
                      <select
                        value={adjustment.product_id}
                        onChange={(e) => updateAdjustment(index, 'product_id', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
                        required
                      >
                        <option value="">Select a product</option>
                        {products.map((product) => (
                          <option key={product.id} value={product.id}>
                            {product.name} (Current: {product.current_stock})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Reason *
                      </label>
                      <select
                        value={adjustment.reason}
                        onChange={(e) => updateAdjustment(index, 'reason', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
                        required
                      >
                        {reasonOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Current Stock
                      </label>
                      <input
                        type="number"
                        value={adjustment.current_stock}
                        readOnly
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Adjustment Quantity *
                      </label>
                      <div className="flex">
                        <input
                          type="number"
                          value={adjustment.adjustment}
                          onChange={(e) => updateAdjustment(index, 'adjustment', parseInt(e.target.value) || 0)}
                          placeholder="Enter quantity"
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md focus:ring-orange-500 focus:border-orange-500"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => removeAdjustment(index)}
                          className="px-3 py-2 bg-red-500 text-white rounded-r-md hover:bg-red-600"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        New stock: {adjustment.current_stock + adjustment.adjustment}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
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
              disabled={loading || adjustments.length === 0}
              className="px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-md hover:bg-orange-700 disabled:opacity-50"
            >
              {loading ? 'Processing...' : 'Apply Adjustments'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}