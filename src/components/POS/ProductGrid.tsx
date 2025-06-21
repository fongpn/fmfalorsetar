import React from 'react';
import { Package, AlertTriangle } from 'lucide-react';
import { Product } from '../../lib/supabase';

interface ProductGridProps {
  products: Product[];
  onAddToCart: (product: Product) => void;
  loading: boolean;
}

export function ProductGrid({ products, onAddToCart, loading }: ProductGridProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div key={i} className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="animate-pulse">
              <div className="w-full h-32 bg-gray-200 rounded-lg mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="text-center py-12">
        <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500">No products found</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {products.map((product) => (
        <div
          key={product.id}
          className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow"
        >
          <div className="aspect-square bg-gray-100 rounded-lg mb-4 flex items-center justify-center">
            <Package className="h-12 w-12 text-gray-400" />
          </div>
          
          <div className="space-y-2">
            <h3 className="font-medium text-gray-900 line-clamp-2">{product.name}</h3>
            
            <div className="flex items-center justify-between">
              <span className="text-lg font-semibold text-gray-900">
                ${product.price.toFixed(2)}
              </span>
              <div className="flex items-center space-x-1">
                {product.current_stock <= 5 && product.current_stock > 0 && (
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                )}
                <span className={`text-sm ${
                  product.current_stock <= 5 
                    ? product.current_stock === 0 
                      ? 'text-red-600' 
                      : 'text-amber-600'
                    : 'text-gray-500'
                }`}>
                  {product.current_stock} in stock
                </span>
              </div>
            </div>
            
            <button
              onClick={() => onAddToCart(product)}
              disabled={product.current_stock === 0}
              className="w-full px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-md hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {product.current_stock === 0 ? 'Out of Stock' : 'Add to Cart'}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}