import React, { useState } from 'react';
import { Package, AlertTriangle, User } from 'lucide-react';
import { Product } from '../../lib/supabase';

interface ProductGridProps {
  products: Product[];
  onAddToCart: (product: Product) => void;
  loading: boolean;
}

// Component for product image with error handling
function ProductImage({ product, size = "h-32" }: { product: Product; size?: string }) {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const handleImageError = () => {
    setImageError(true);
    setImageLoaded(false);
  };

  const handleImageLoad = () => {
    setImageLoaded(true);
    setImageError(false);
  };

  // Show default icon if no photo URL, image failed to load, or still loading
  if (!product.photo_url || imageError || !imageLoaded) {
    return (
      <div className={`${size} bg-gray-100 rounded-lg flex items-center justify-center`}>
        <Package className="h-12 w-12 text-gray-400" />
        {/* Hidden image to handle loading/error states */}
        {product.photo_url && !imageError && (
          <img
            src={product.photo_url}
            alt=""
            className="hidden"
            onLoad={handleImageLoad}
            onError={handleImageError}
          />
        )}
      </div>
    );
  }

  // Show actual image once it's loaded successfully
  return (
    <img
      src={product.photo_url}
      alt={product.name}
      className={`${size} rounded-lg object-cover`}
      onError={handleImageError}
    />
  );
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
          <div className="mb-4">
            <ProductImage product={product} size="w-full h-32" />
          </div>
          
          <div className="space-y-2">
            <h3 className="font-medium text-gray-900 line-clamp-2 text-center">{product.name}</h3>
            
            <div className="flex items-center justify-center mb-3">
              <span className="text-xl font-bold text-gray-900 text-center">
                RM{product.price.toFixed(2)}
              </span>
            </div>
            
            {/* Enhanced Stock Display */}
            <div className="mb-4">
              <div className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium ${
                product.current_stock === 0 
                  ? 'bg-red-100 text-red-800 border border-red-200' 
                  : product.current_stock <= 5
                    ? 'bg-amber-100 text-amber-800 border border-amber-200'
                    : product.current_stock <= 20
                      ? 'bg-blue-100 text-blue-800 border border-blue-200'
                      : 'bg-green-100 text-green-800 border border-green-200'
              }`}>
                {product.current_stock === 0 && <AlertTriangle className="h-4 w-4 mr-1.5" />}
                {product.current_stock <= 5 && product.current_stock > 0 && <AlertTriangle className="h-4 w-4 mr-1.5" />}
                <span className="font-semibold">{product.current_stock}</span>
                <span className="ml-1">
                  {product.current_stock === 0 ? 'Out of Stock' :
                   product.current_stock === 1 ? 'unit left' :
                   product.current_stock <= 5 ? 'units left' :
                   product.current_stock <= 20 ? 'in stock' :
                   'in stock'}
                </span>
              </div>
            </div>
            
            <button
              onClick={() => onAddToCart(product)}
              disabled={product.current_stock === 0}
              className="w-full px-4 py-2.5 text-sm font-semibold text-white bg-orange-600 rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:shadow-md"
            >
              {product.current_stock === 0 ? 'Out of Stock' : 'Add to Cart'}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}