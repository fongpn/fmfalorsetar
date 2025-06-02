import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import { formatCurrency } from '@/lib/utils';
import { Plus, Search, Package, AlertTriangle } from 'lucide-react';
import type { Product } from '@/types';

const ProductsPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: '',
    description: '',
    price: '',
    stock: '',
  });

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const { data, error } = await supabase
          .from('products')
          .select('*')
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

    fetchProducts();
  }, [toast]);

  const handleAddProduct = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .insert({
          name: newProduct.name,
          description: newProduct.description || null,
          price: parseFloat(newProduct.price),
          stock: parseInt(newProduct.stock) || 0,
          active: true,
        })
        .select()
        .single();

      if (error) throw error;

      setProducts(prev => [...prev, data as Product]);
      setIsAddingProduct(false);
      setNewProduct({
        name: '',
        description: '',
        price: '',
        stock: '',
      });

      toast({
        title: 'Success',
        description: 'Product added successfully',
      });
    } catch (error) {
      console.error('Error adding product:', error);
      toast({
        title: 'Error',
        description: 'Failed to add product',
        variant: 'destructive',
      });
    }
  };

  const handleToggleProductStatus = async (product: Product) => {
    try {
      const { error } = await supabase
        .from('products')
        .update({ active: !product.active })
        .eq('id', product.id);

      if (error) throw error;

      setProducts(prev =>
        prev.map(p =>
          p.id === product.id ? { ...p, active: !p.active } : p
        )
      );

      toast({
        title: 'Success',
        description: `Product ${product.active ? 'disabled' : 'enabled'} successfully`,
      });
    } catch (error) {
      console.error('Error toggling product status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update product status',
        variant: 'destructive',
      });
    }
  };

  const handleUpdateStock = async (product: Product, newStock: number) => {
    try {
      const { error } = await supabase
        .from('products')
        .update({ stock: newStock })
        .eq('id', product.id);

      if (error) throw error;

      setProducts(prev =>
        prev.map(p =>
          p.id === product.id ? { ...p, stock: newStock } : p
        )
      );

      // Record stock update
      await supabase.from('stock_history').insert({
        product_id: product.id,
        previous_stock: product.stock,
        new_stock: newStock,
        reason: 'Manual update',
        created_by: user!.id,
      });

      toast({
        title: 'Success',
        description: 'Stock updated successfully',
      });
    } catch (error) {
      console.error('Error updating stock:', error);
      toast({
        title: 'Error',
        description: 'Failed to update stock',
        variant: 'destructive',
      });
    }
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Products</h1>
        <Dialog open={isAddingProduct} onOpenChange={setIsAddingProduct}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Product
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Product</DialogTitle>
              <DialogDescription>
                Add a new product to the inventory.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Name</label>
                <Input
                  value={newProduct.name}
                  onChange={e =>
                    setNewProduct(prev => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="Product name"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  value={newProduct.description}
                  onChange={e =>
                    setNewProduct(prev => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  placeholder="Product description"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Price</label>
                <Input
                  value={newProduct.price}
                  onChange={e =>
                    setNewProduct(prev => ({ ...prev, price: e.target.value }))
                  }
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Initial Stock</label>
                <Input
                  value={newProduct.stock}
                  onChange={e =>
                    setNewProduct(prev => ({ ...prev, stock: e.target.value }))
                  }
                  type="number"
                  placeholder="0"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddingProduct(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddProduct}>Add Product</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400" />
            <Input
              placeholder="Search products..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Card key={i} className="p-4">
              <Skeleton className="h-6 w-1/4 mb-2" />
              <Skeleton className="h-4 w-1/3" />
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredProducts.map(product => (
            <Card key={product.id} className="p-4">
              <CardContent className="p-0">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">{product.name}</h3>
                    {product.description && (
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {product.description}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline">
                        <Package className="w-3 h-3 mr-1" />
                        Stock: {product.stock}
                      </Badge>
                      <Badge
                        variant={product.active ? 'default' : 'secondary'}
                      >
                        {product.active ? 'Active' : 'Inactive'}
                      </Badge>
                      {product.stock < 10 && (
                        <Badge variant="destructive">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          Low Stock
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold">
                      {formatCurrency(product.price)}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            Update Stock
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Update Stock</DialogTitle>
                            <DialogDescription>
                              Update the stock level for {product.name}
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div className="space-y-2">
                              <label className="text-sm font-medium">
                                New Stock Level
                              </label>
                              <Input
                                type="number"
                                defaultValue={product.stock}
                                onChange={e => {
                                  const newStock = parseInt(e.target.value);
                                  if (!isNaN(newStock) && newStock >= 0) {
                                    handleUpdateStock(product, newStock);
                                  }
                                }}
                              />
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleProductStatus(product)}
                      >
                        {product.active ? 'Disable' : 'Enable'}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {filteredProducts.length === 0 && (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              No products found
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ProductsPage;