import React, { useState, useEffect } from 'react';
import { Layout } from '../components/Layout/Layout';
import { StockManagementModal } from '../components/Inventory/StockManagementModal';
import { NewProductModal } from '../components/Products/NewProductModal';
import { EditProductModal } from '../components/Products/EditProductModal.tsx';
import { posService } from '../services/posService';
import { Product } from '../lib/supabase';
import { Search, Plus, Package, AlertTriangle, TrendingUp, Edit, Trash2 } from 'lucide-react';

export function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showStockModal, setShowStockModal] = useState(false);
  const [showNewProductModal, setShowNewProductModal] = useState(false);
  const [showEditProductModal, setShowEditProductModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [stockFilter, setStockFilter] = useState<'ALL' | 'LOW' | 'OUT'>('ALL');
  const [showInactive, setShowInactive] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, [showInactive]);

  useEffect(() => {
    filterProducts();
  }, [products, searchQuery, stockFilter, showInactive]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = showInactive 
        ? await posService.getAllProductsIncludingInactive()
        : await posService.getAllProducts();
      setProducts(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const filterProducts = () => {
    let filtered = products;

    // Apply search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply stock filter
    switch (stockFilter) {
      case 'LOW':
        filtered = filtered.filter(product => product.current_stock > 0 && product.current_stock <= 10);
        break;
      case 'OUT':
        filtered = filtered.filter(product => product.current_stock === 0);
        break;
      default:
        break;
    }

    setFilteredProducts(filtered);
  };

  const getStockStatus = (stock: number) => {
    if (stock === 0) {
      return { label: 'Out of Stock', color: 'text-red-600 bg-red-50', icon: AlertTriangle };
    } else if (stock <= 5) {
      return { label: 'Critical', color: 'text-red-600 bg-red-50', icon: AlertTriangle };
    } else if (stock <= 10) {
      return { label: 'Low Stock', color: 'text-amber-600 bg-amber-50', icon: AlertTriangle };
    } else {
      return { label: 'In Stock', color: 'text-green-600 bg-green-50', icon: TrendingUp };
    }
  };

  const getFilterCounts = () => {
    return {
      ALL: products.length,
      LOW: products.filter(p => p.current_stock > 0 && p.current_stock <= 10).length,
      OUT: products.filter(p => p.current_stock === 0).length,
    };
  };

  const handleEditProduct = (product: Product) => {
    setSelectedProduct(product);
    setShowEditProductModal(true);
  };

  const handleDeleteProduct = async (product: Product) => {
    if (!confirm(`Are you sure you want to delete "${product.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await posService.deleteProduct(product.id);
      fetchProducts();
    } catch (err: any) {
      setError(`Failed to delete product: ${err.message}`);
    }
  };

  const filterCounts = getFilterCounts();

  return (
    <Layout title="Products & Inventory" subtitle="Manage products and track inventory levels">
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center space-y-4 lg:space-y-0">
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products..."
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <label className="flex items-center text-sm text-gray-600">
              <input
                type="checkbox"
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
                className="rounded border-gray-300 text-orange-600 focus:ring-orange-500 mr-2"
              />
              Show inactive products
            </label>
          </div>
          
          <div className="flex space-x-3">
            <button
              onClick={() => setShowStockModal(true)}
              className="flex items-center px-4 py-2 text-sm font-medium text-orange-700 bg-orange-50 border border-orange-200 rounded-lg hover:bg-orange-100"
            >
              <Package className="h-4 w-4 mr-2" />
              Manage Stock
            </button>
            <button 
              onClick={() => setShowNewProductModal(true)}
              className="flex items-center px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Product
            </button>
          </div>
        </div>

        {/* Stock Filter Tabs */}
        <div className="bg-white rounded-lg border border-gray-200 p-1">
          <div className="flex space-x-1">
            {[
              { key: 'ALL', label: 'All Products', count: filterCounts.ALL },
              { key: 'LOW', label: 'Low Stock', count: filterCounts.LOW },
              { key: 'OUT', label: 'Out of Stock', count: filterCounts.OUT },
            ].map((filter) => (
              <button
                key={filter.key}
                onClick={() => setStockFilter(filter.key as any)}
                className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  stockFilter === filter.key
                    ? 'bg-orange-100 text-orange-700'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                {filter.label} ({filter.count})
              </button>
            ))}
          </div>
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

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
          </div>
        )}

        {/* Products Table */}
        {!loading && !error && (
          <>
            {filteredProducts.length === 0 ? (
              <div className="text-center py-12">
                <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">
                  {searchQuery ? 'No products found matching your search.' : 'No products found.'}
                </p>
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Product
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Price
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Stock
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredProducts.map((product) => {
                        const stockStatus = getStockStatus(product.current_stock);
                        return (
                          <tr key={product.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="w-10 h-10 mr-4">
                                  <ProductImage product={product} size="w-10 h-10" />
                                </div>
                                <div>
                                  <div className="text-sm font-medium text-gray-900">
                                    {product.name}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">
                                RM{product.price.toFixed(2)}
                                {!product.is_active && (
                                  <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                    Inactive
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                                  product.current_stock === 0 
                                    ? 'bg-red-100 text-red-800' 
                                    : product.current_stock <= 5
                                      ? 'bg-amber-100 text-amber-800'
                                      : product.current_stock <= 20
                                        ? 'bg-blue-100 text-blue-800'
                                        : 'bg-green-100 text-green-800'
                                }`}>
                                  <span className="font-semibold">{product.current_stock}</span>
                                  <span className="ml-1">units</span>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${stockStatus.color}`}>
                                <stockStatus.icon className="h-3 w-3 mr-1" />
                                {stockStatus.label}
                              </span>
                              {!product.is_active && (
                                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                  Inactive
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <div className="flex items-center justify-end space-x-2">
                                <button 
                                  onClick={() => handleEditProduct(product)}
                                  className="text-orange-600 hover:text-orange-900"
                                  title="Edit product"
                                >
                                  <Edit className="h-4 w-4" />
                                </button>
                                <button 
                                  onClick={() => handleDeleteProduct(product)}
                                  className="text-red-600 hover:text-red-900"
                                  title="Delete product"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Results Summary */}
            {filteredProducts.length > 0 && (
              <div className="text-center text-sm text-gray-500">
                Showing {filteredProducts.length} of {products.length} products
              </div>
            )}
          </>
        )}

        {/* Stock Management Modal */}
        <StockManagementModal
          isOpen={showStockModal}
          onClose={() => setShowStockModal(false)}
          onSuccess={() => {
            fetchProducts();
            setShowStockModal(false);
          }}
        />

        {/* New Product Modal */}
        <NewProductModal
          isOpen={showNewProductModal}
          onClose={() => setShowNewProductModal(false)}
          onSuccess={() => {
            fetchProducts();
            setShowNewProductModal(false);
          }}
        />

        {/* Edit Product Modal */}
        <EditProductModal
          isOpen={showEditProductModal}
          onClose={() => {
            setShowEditProductModal(false);
            setSelectedProduct(null);
          }}
          onSuccess={() => {
            fetchProducts();
            setShowEditProductModal(false);
            setSelectedProduct(null);
          }}
          product={selectedProduct}
        />
      </div>
    </Layout>
  );
}

// Component for product image with error handling
function ProductImage({ product, size = "w-10 h-10" }: { product: any; size?: string }) {
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
      <div className={`${size} bg-gray-200 rounded-lg flex items-center justify-center`}>
        <Package className="h-5 w-5 text-gray-400" />
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