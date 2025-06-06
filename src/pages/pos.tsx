import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { formatCurrency } from '@/lib/utils';
import { getActiveShift } from '@/lib/shifts';
import { Package, Trash2, AlertCircle, History } from 'lucide-react';
import type { Database } from '@/types/supabase';
import { FallbackImage } from '@/components/ui/fallback-image';

type Product = Database['public']['Tables']['products']['Row'];
type CartItem = { product: Product; quantity: number };
type PaymentMethod = 'cash' | 'qr' | 'bank_transfer';

const POSPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showClearCartDialog, setShowClearCartDialog] = useState(false);
  const [activeShiftId, setActiveShiftId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'pos' | 'history'>('pos');
  const [salesHistory, setSalesHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    const fetchInitialData = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      try {
        // Get active shift
        const { shift, error: shiftError } = await getActiveShift(user.id);
        if (shiftError) throw new Error(shiftError);
        if (!shift?.id) {
          toast({
            title: 'No Active Shift',
            description: 'You need an active shift to process sales. Please start a shift.',
            variant: 'destructive',
          });
          setActiveShiftId(null);
        } else {
          setActiveShiftId(shift.id);
        }

        // Fetch products
        const { data, error: productsError } = await supabase
          .from('products')
          .select('*')
          .eq('active', true)
          .order('name');

        if (productsError) throw productsError;
        setProducts(data as Product[]);
      } catch (error) {
        console.error('Error fetching initial POS data:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to load POS data';
        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchInitialData();
  }, [user, toast]);

  useEffect(() => {
    if (activeTab === 'history') {
      fetchSalesHistory();
    }
  }, [activeTab]);

  const fetchSalesHistory = async () => {
    setLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from('payments')
        .select(`
          *,
          user:created_by (
            email,
            name
          )
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setSalesHistory(data || []);
    } catch (error) {
      console.error('Error fetching sales history:', error);
      toast({
        title: 'Error',
        description: 'Failed to load sales history',
        variant: 'destructive',
      });
    } finally {
      setLoadingHistory(false);
    }
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const addToCart = (product: Product) => {
    if (product.stock <= 0) {
      toast({
        title: 'Out of Stock',
        description: `${product.name} is currently out of stock`,
        variant: 'destructive',
      });
      return;
    }

    setCart(currentCart => {
      const existingItem = currentCart.find(item => item.product.id === product.id);
      
      if (existingItem) {
        if (existingItem.quantity + 1 > product.stock) {
          toast({
            title: 'Insufficient Stock',
            description: `Only ${product.stock} units of ${product.name} available.`,
            variant: 'destructive',
          });
          return currentCart;
        }
        return currentCart.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...currentCart, { product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId: string, quantity: number) => {
    const productInCart = cart.find(item => item.product.id === productId)?.product;
    if (!productInCart) return;

    if (quantity > productInCart.stock) {
      toast({
        title: 'Insufficient Stock',
        description: `Only ${productInCart.stock} units of ${productInCart.name} available.`,
        variant: 'destructive',
      });
      return;
    }

    if (quantity < 1) {
      setCart(currentCart => 
        currentCart.filter(item => item.product.id !== productId)
      );
      return;
    }

    setCart(currentCart =>
      currentCart.map(item =>
        item.product.id === productId
          ? { ...item, quantity }
          : item
      )
    );
  };

  const clearCart = () => {
    setCart([]);
    setShowClearCartDialog(false);
  };

  const total = cart.reduce(
    (sum, item) => sum + (item.product.price * item.quantity),
    0
  );

  const processPayment = async (method: PaymentMethod) => {
    if (!activeShiftId) {
      toast({
        title: 'No Active Shift',
        description: 'You need an active shift to process sales. Please start a shift.',
        variant: 'destructive',
      });
      return;
    }

    if (cart.length === 0) {
      toast({
        title: 'Empty Cart',
        description: 'Please add items to the cart before processing payment.',
        variant: 'destructive',
      });
      return;
    }

    if (!user) {
      toast({ title: 'Error', description: 'User not authenticated.', variant: 'destructive' });
      return;
    }

    setIsProcessing(true);

    try {
      const cartItemsForRPC = cart.map(item => ({
        product_id: item.product.id,
        quantity: item.quantity,
        price_at_sale: item.product.price
      }));

      const { data: saleId, error: rpcError } = await supabase.rpc('process_pos_sale', {
        p_user_id: user.id,
        p_shift_id: activeShiftId,
        p_cart_items: cartItemsForRPC,
        p_total_amount: total,
        p_payment_method: method,
      });

      if (rpcError) throw rpcError;

      setCart([]);
      setProducts(prevProducts =>
        prevProducts.map(p => {
          const cartItem = cart.find(item => item.product.id === p.id);
          if (cartItem) {
            return { ...p, stock: p.stock - cartItem.quantity };
          }
          return p;
        })
      );

      toast({
        title: 'Payment Successful',
        description: `Sale ID: ${saleId}. Payment of ${formatCurrency(total)} processed.`,
      });

      if (activeTab === 'history') {
        fetchSalesHistory();
      }

    } catch (error) {
      console.error('Error processing payment:', error);
      toast({
        title: 'Payment Processing Error',
        description: error instanceof Error ? error.message : 'Failed to process the sale. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="mb-8 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('pos')}
              className={`
                whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
                ${activeTab === 'pos'
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
              `}
            >
              <Package className="inline-block mr-2 h-4 w-4" />
              Point of Sale
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`
                whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
                ${activeTab === 'history'
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
              `}
            >
              <History className="inline-block mr-2 h-4 w-4" />
              Sales History
            </button>
          </nav>
        </div>
      </div>

      {activeTab === 'pos' ? (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Product Selection Panel */}
          <div>
            <div className="mb-4">
              <Input
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                disabled={isLoading}
              />
            </div>

            {isLoading ? (
              <div className="grid gap-4 grid-cols-2 md:grid-cols-3">
                {[...Array(6)].map((_, i) => (
                  <Card key={i} className="p-4">
                    <Skeleton className="h-6 w-full mb-2" />
                    <Skeleton className="h-4 w-3/4 mb-1" />
                    <Skeleton className="h-4 w-1/2" />
                  </Card>
                ))}
              </div>
            ) : (
              <div className="grid gap-4 grid-cols-2 md:grid-cols-3 max-h-[60vh] overflow-y-auto pr-2">
                {filteredProducts.map((product) => (
                  <Card
                    key={product.id}
                    className={`cursor-pointer hover:bg-gray-100 transition-colors ${product.stock <= 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                    onClick={() => product.stock > 0 && addToCart(product)}
                  >
                    <CardContent className="p-3">
                      <div className="flex flex-col items-start justify-between h-full">
                        <div className="w-full mb-2">
                          <FallbackImage
                            src={product.image_url}
                            alt={product.name}
                            className="w-full h-32 rounded-md object-cover"
                          />
                        </div>
                        <div className="w-full">
                          <h3 className="font-medium text-sm line-clamp-2 mb-0.5">{product.name}</h3>
                          <p className="text-base font-medium text-orange-600">
                            {formatCurrency(product.price)}
                          </p>
                        </div>
                        <Badge 
                          variant={product.stock > 5 ? 'outline' : product.stock > 0 ? 'default' : 'destructive'} 
                          className="mt-2 text-xs self-start"
                        >
                          <Package className="w-3 h-3 mr-1" />
                          {product.stock}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {filteredProducts.length === 0 && !isLoading && (
                  <p className="col-span-full text-center text-gray-500">No products found.</p>
                )}
              </div>
            )}
          </div>

          {/* Current Order Panel */}
          <div>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Current Order</CardTitle>
                  {cart.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowClearCartDialog(true)}
                      disabled={isProcessing}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Clear Cart
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {cart.length > 0 ? (
                  <div className="space-y-4">
                    <div className="max-h-[40vh] overflow-y-auto pr-2 space-y-3">
                      {cart.map((item) => (
                        <div
                          key={item.product.id}
                          className="flex items-center justify-between"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 flex-shrink-0">
                              <FallbackImage
                                src={item.product.image_url}
                                alt={item.product.name}
                                className="w-full h-full rounded-md object-cover"
                              />
                            </div>
                            <div>
                              <p className="font-semibold text-base">{item.product.name}</p>
                              <p className="text-sm font-medium text-orange-600">
                                {formatCurrency(item.product.price)} × {item.quantity}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                              disabled={isProcessing}
                            >
                              -
                            </Button>
                            <span className="w-6 text-center text-sm">{item.quantity}</span>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                              disabled={isProcessing}
                            >
                              +
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {!activeShiftId && !isLoading && (
                      <div className="flex items-center gap-2 p-3 mt-4 text-amber-600 bg-amber-50 rounded-lg">
                        <AlertCircle className="w-5 h-5" />
                        <p className="text-sm">You need an active shift to process payments. Please start a shift.</p>
                      </div>
                    )}

                    <div className="pt-4 mt-4 border-t">
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-lg font-medium">Total</span>
                        <span className="text-lg font-medium">
                          {formatCurrency(total)}
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        {(['cash', 'qr', 'bank_transfer'] as PaymentMethod[]).map((method) => (
                          <Button
                            key={method}
                            className="w-full"
                            onClick={() => processPayment(method)}
                            disabled={isProcessing || !activeShiftId || cart.length === 0}
                          >
                            {isProcessing ? '...' : method.charAt(0).toUpperCase() + method.slice(1)}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No items in cart
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {loadingHistory ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Card key={i} className="p-4">
                  <Skeleton className="h-6 w-full mb-2" />
                  <Skeleton className="h-4 w-3/4" />
                </Card>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {salesHistory.map((sale) => (
                <Card key={sale.id} className="p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium">Sale #{sale.id}</h3>
                      <p className="text-sm text-gray-500">
                        {new Date(sale.created_at).toLocaleString()}
                      </p>
                      <p className="text-sm text-gray-500">
                        Processed by: {sale.user?.name || sale.user?.email}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatCurrency(sale.amount)}</p>
                      <Badge variant="outline" className="mt-1">
                        {sale.payment_method}
                      </Badge>
                    </div>
                  </div>
                  <div className="mt-2 text-sm text-gray-500">
                    {sale.items?.map((item: any) => (
                      <div key={item.product_id} className="flex justify-between">
                        <span>{item.product_name} × {item.quantity}</span>
                        <span>{formatCurrency(item.price * item.quantity)}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              ))}
              {salesHistory.length === 0 && (
                <p className="text-center text-gray-500">No sales history available</p>
              )}
            </div>
          )}
        </div>
      )}

      <AlertDialog open={showClearCartDialog} onOpenChange={setShowClearCartDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear Cart</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to clear the cart? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={clearCart} disabled={isProcessing}>
              Clear Cart
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default POSPage;