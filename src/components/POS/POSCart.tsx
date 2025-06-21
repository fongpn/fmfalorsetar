import React from 'react';
import { Trash2, Plus, Minus, ShoppingCart } from 'lucide-react';
import { CartItem } from '../../services/posService';

interface POSCartProps {
  items: CartItem[];
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemoveItem: (productId: string) => void;
  onClearCart: () => void;
  total: number;
}

export function POSCart({ items, onUpdateQuantity, onRemoveItem, onClearCart, total }: POSCartProps) {
  if (items.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="text-center py-8">
          <ShoppingCart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">Cart is empty</p>
          <p className="text-sm text-gray-400 mt-1">Add products to start a sale</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          Cart ({items.length} item{items.length !== 1 ? 's' : ''})
        </h3>
        <button
          onClick={onClearCart}
          className="text-sm text-red-600 hover:text-red-700 font-medium"
        >
          Clear All
        </button>
      </div>

      <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
        {items.map((item) => (
          <div key={item.product.id} className="p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-gray-900">{item.product.name}</h4>
              <button
                onClick={() => onRemoveItem(item.product.id)}
                className="text-red-500 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => onUpdateQuantity(item.product.id, item.quantity - 1)}
                  disabled={item.quantity <= 1}
                  className="p-1 rounded-md border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
                >
                  <Minus className="h-3 w-3" />
                </button>
                <span className="w-8 text-center font-medium">{item.quantity}</span>
                <button
                  onClick={() => onUpdateQuantity(item.product.id, item.quantity + 1)}
                  disabled={item.quantity >= item.product.current_stock}
                  className="p-1 rounded-md border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
                >
                  <Plus className="h-3 w-3" />
                </button>
              </div>
              
              <div className="text-right">
                <p className="text-xs text-gray-500">RM{item.product.price.toFixed(2)} each</p>
                <p className="font-bold text-gray-900 text-lg">RM{item.subtotal.toFixed(2)}</p>
              </div>
            </div>
            
            {item.quantity >= item.product.current_stock && (
              <p className="text-xs text-amber-600 mt-1">
                Maximum stock reached ({item.product.current_stock} available)
              </p>
            )}
          </div>
        ))}
      </div>

      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between text-xl font-bold">
          <span>Total:</span>
          <span className="text-orange-600">RM{total.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}