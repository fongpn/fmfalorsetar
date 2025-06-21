import React, { useState, useEffect } from 'react';
import { Layout } from '../components/Layout/Layout';
import { ProductGrid } from '../components/POS/ProductGrid';
import { POSCart } from '../components/POS/POSCart';
import { CheckoutModal } from '../components/POS/CheckoutModal';
import { posService, CartItem } from '../services/posService';
import { Product } from '../lib/supabase';
import { Search, ShoppingCart, Package } from 'lucide-react';

export function POS() {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCheckout, setShowCheckout] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    filterProducts();
  }, [products, searchQuery]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await posService.getAllProducts();
      setProducts(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const filterProducts = () => {
    if (!searchQuery.trim()) {
      setFilteredProducts(products);
    } else {
      const filtered = products.filter(product =>
        product.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredProducts(filtered);
    }
  };

  const addToCart = (product: Product) => {
    const existingItem = cart.find(item => item.product.id === product.id);
    
    if (existingItem) {
      if (existingItem.quantity < product.current_stock) {
        updateCartQuantity(product.id, existingItem.quantity + 1);
      }
    } else {
      const newItem: CartItem = {
        product,
        quantity: 1,
        subtotal: product.price
      };
      setCart([...cart, newItem]);
    }
  };

  const updateCartQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }

    setCart(cart.map(item => {
      if (item.product.id === productId) {
        return {
          ...item,
          quantity,
          subtotal: item.product.price * quantity
        };
      }
      return item;
    }));
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter(item => item.product.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
  };

  const getCartTotal = () => {
    return cart.reduce((total, item) => total + item.subtotal, 0);
  };

  const handleCheckoutSuccess = () => {
    clearCart();
    fetchProducts(); // Refresh products to update stock levels
  };

  return (
    <Layout title="Point of Sale" subtitle="Product sales and inventory management">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
        {/* Products Section */}
        <div className="lg:col-span-2 space-y-6">
          {/* Search Bar */}
          <div className="flex items-center space-x-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products..."
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={fetchProducts}
              disabled={loading}
              className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              <Package className="h-4 w-4 mr-2" />
              Refresh
            </button>
          </div>

          {/* Error State */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-600">{error}</p>
              <button 
                onClick={fetchProducts}
                className="mt-2 text-sm text-red-700 hover:text-red-900 underline"
              >
                Try again
              </button>
            </div>
          )}

          {/* Products Grid */}
          <ProductGrid
            products={filteredProducts}
            onAddToCart={addToCart}
            loading={loading}
          />
        </div>

        {/* Cart Section */}
        <div className="space-y-6">
          <POSCart
            items={cart}
            onUpdateQuantity={updateCartQuantity}
            onRemoveItem={removeFromCart}
            onClearCart={clearCart}
            total={getCartTotal()}
          />

          {cart.length > 0 && (
            <button
              onClick={() => setShowCheckout(true)}
              className="w-full flex items-center justify-center px-4 py-3 text-lg font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700"
            >
              <ShoppingCart className="h-5 w-5 mr-2" />
              Checkout (RM{getCartTotal().toFixed(2)})
            </button>
          )}
        </div>
      </div>

      {/* Checkout Modal */}
      <CheckoutModal
        isOpen={showCheckout}
        onClose={() => setShowCheckout(false)}
        onSuccess={handleCheckoutSuccess}
        items={cart}
        total={getCartTotal()}
      />
    </Layout>
  );
}