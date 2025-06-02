import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { Button, buttonVariants } from '@/components/ui/button';
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
import { Package, Trash2, AlertCircle } from 'lucide-react';
import type { Product, CartItem } from '@/types';

const POSPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showClearCartDialog, setShowClearCartDialog] = useState(false);
  const [activeShift, setActiveShift] = useState<string | null>(null);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        // Get active shift
        const { shift, error: shiftError } = await getActiveShift(user!.id);
        if (shiftError) throw shiftError;
        if (!shift) {
          toast({
            title: 'No Active Shift',
            description: 'You need an active shift to process sales',
            variant: 'destructive',
          });
          return;
        }
        setActiveShift(shift.id);

        // Fetch products
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .eq('active', true)
          .order('name');

        if (error) throw error;
        setProducts(data as Product[]);
      } catch (error) {
        console.error('Error fetching products:', error);
        toast({
          title: 'Error',
          description: 'Failed to load products',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchInitialData();
  }, [user, toast]);

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const addToCart = (product: Product) => {
    // Check if product is in stock
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
        // Check if adding one more would exceed stock
        if (existingItem.quantity + 1 > product.stock) {
          toast({
            title: 'Insufficient Stock',
            description: `Only ${product.stock} units available`,
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
    // Get product from products array
    const product = products.find(p => p.id === productId);
    if (!product) return;

    // Check if new quantity exceeds stock
    if (quantity > product.stock) {
      toast({
        title: 'Insufficient Stock',
        description: `Only ${product.stock} units available`,
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

  const processPayment = async (method: 'cash' | 'qr' | 'bank_transfer') => {
    if (!activeShift) {
      toast({
        title: 'No Active Shift',
        description: 'You need an active shift to process sales',
        variant: 'destructive',
      });
      return;
    }

    if (cart.length === 0) {
      toast({
        title: 'Empty Cart',
        description: 'Please add items to the cart before processing payment',
        variant: 'destructive',
      });
      return;
    }

    setIsProcessing(true);

    try {
      // Start a Supabase transaction
      const { data: sale, error: saleError } = await supabase
        .from('sales')
        .insert({
          items: cart,
          total,
          payment_method: method,
          created_by: user!.id,
          shift_id: activeShift,
        })
        .select()
        .single();

      if (saleError) throw saleError;

      // Record payment
      const { error: paymentError } = await supabase
        .from('payments')
        .insert({
          amount: total,
          method,
          payment_for: 'pos',
          created_by: user!.id,
          shift_id: activeShift,
        });

      if (paymentError) throw paymentError;

      // Update product stock and record stock history
      for (const item of cart) {
        const { error: stockError } = await supabase
          .from('products')
          .update({ 
            stock: item.product.stock - item.quantity,
            updated_at: new Date().toISOString(),
          })
          .eq('id', item.product.id);

        if (stockError) throw stockError;

        // Record stock history
        const { error: historyError } = await supabase
          .from('stock_history')
          .insert({
            product_id: item.product.id,
            previous_stock: item.product.stock,
            new_stock: item.product.stock - item.quantity,
            reason: `Sale: ${sale.id}`,
            created_by: user!.id,
          });

        if (historyError) throw historyError;
      }

      // Clear cart after successful payment
      setCart([]);

      // Update products list with new stock values
      setProducts(prev =>
        prev.map(product => {
          const soldItem = cart.find(item => item.product.id === product.id);
          if (soldItem) {
            return {
              ...product,
              stock: product.stock - soldItem.quantity,
            };
          }
          return product;
        })
      );

      toast({
        title: 'Payment Successful',
        description: `Payment of ${formatCurrency(total)} processed successfully`,
      });
    } catch (error) {
      console.error('Error processing payment:', error);
      toast({
        title: 'Error',
        description: 'Failed to process payment. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Point of Sale</h1>

      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <div className="mb-4">
            <Input
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {isLoading ? (
            <div className="grid gap-4 grid-cols-2">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="p-4">
                  <Skeleton className="h-6 w-full mb-2" />
                  <Skeleton className="h-4 w-1/2" />
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid gap-4 grid-cols-2">
              {filteredProducts.map((product) => (
                <Card
                  key={product.id}
                  className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  onClick={() => product.stock > 0 && addToCart(product)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium">{product.name}</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {formatCurrency(product.price)}
                        </p>
                      </div>
                      <Badge variant={product.stock > 0 ? 'outline' : 'destructive'}>
                        <Package className="w-3 h-3 mr-1" />
                        {product.stock}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

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
                  {cart.map((item) => (
                    <div
                      key={item.product.id}
                      className="flex items-center justify-between"
                    >
                      <div>
                        <p className="font-medium">{item.product.name}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {formatCurrency(item.product.price)} × {item.quantity}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                        >
                          -
                        </Button>
                        <span className="w-8 text-center">{item.quantity}</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                        >
                          +
                        </Button>
                      </div>
                    </div>
                  ))}

                  {!activeShift && (
                    <div className="flex items-center gap-2 p-3 mt-4 text-amber-600 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400 rounded-lg">
                      <AlertCircle className="w-5 h-5" />
                      <p className="text-sm">You need an active shift to process payments</p>
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
                      <Button
                        className="w-full"
                        onClick={() => processPayment('cash')}
                        disabled={isProcessing || !activeShift}
                      >
                        {isProcessing ? 'Processing...' : 'Cash'}
                      </Button>
                      <Button
                        className="w-full"
                        onClick={() => processPayment('qr')}
                        disabled={isProcessing || !activeShift}
                      >
                        {isProcessing ? 'Processing...' : 'QR'}
                      </Button>
                      <Button
                        className="w-full"
                        onClick={() => processPayment('bank_transfer')}
                        disabled={isProcessing || !activeShift}
                      >
                        {isProcessing ? 'Processing...' : 'Bank'}
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  No items in cart
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <AlertDialog open={showClearCartDialog} onOpenChange={setShowClearCartDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear Cart</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to clear the cart? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={clearCart}>Clear Cart</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default POSPage;