import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { Plus, Search, Ticket, Clock } from 'lucide-react';
import type { Coupon } from '@/types';

const CouponsPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddingCoupon, setIsAddingCoupon] = useState(false);
  const [newCoupon, setNewCoupon] = useState({
    code: '',
    type: 'adult',
    price: '',
    ownerName: '',
    validFrom: '',
    validTo: '',
    maxUses: '',
  });

  useEffect(() => {
    const fetchCoupons = async () => {
      try {
        const { data, error } = await supabase
          .from('coupons')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        setCoupons(data as Coupon[]);
      } catch (error) {
        console.error('Error fetching coupons:', error);
        toast({
          title: 'Error',
          description: 'Failed to load coupons',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchCoupons();
  }, [toast]);

  const handleAddCoupon = async () => {
    try {
      const { data, error } = await supabase
        .from('coupons')
        .insert({
          code: newCoupon.code.toUpperCase(),
          type: newCoupon.type,
          price: parseFloat(newCoupon.price),
          owner_name: newCoupon.ownerName,
          valid_from: newCoupon.validFrom,
          valid_to: newCoupon.validTo,
          max_uses: parseInt(newCoupon.maxUses),
          current_uses: 0,
          active: true,
          created_by: user!.id,
        })
        .select()
        .single();

      if (error) throw error;

      setCoupons(prev => [data as Coupon, ...prev]);
      setIsAddingCoupon(false);
      setNewCoupon({
        code: '',
        type: 'adult',
        price: '',
        ownerName: '',
        validFrom: '',
        validTo: '',
        maxUses: '',
      });

      toast({
        title: 'Success',
        description: 'Coupon created successfully',
      });
    } catch (error) {
      console.error('Error creating coupon:', error);
      toast({
        title: 'Error',
        description: 'Failed to create coupon',
        variant: 'destructive',
      });
    }
  };

  const handleToggleCouponStatus = async (coupon: Coupon) => {
    try {
      const { error } = await supabase
        .from('coupons')
        .update({ active: !coupon.active })
        .eq('id', coupon.id);

      if (error) throw error;

      setCoupons(prev =>
        prev.map(c =>
          c.id === coupon.id ? { ...c, active: !c.active } : c
        )
      );

      toast({
        title: 'Success',
        description: `Coupon ${coupon.active ? 'disabled' : 'enabled'} successfully`,
      });
    } catch (error) {
      console.error('Error toggling coupon status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update coupon status',
        variant: 'destructive',
      });
    }
  };

  const filteredCoupons = coupons.filter(coupon =>
    coupon.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    coupon.owner_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Coupons</h1>
        <Dialog open={isAddingCoupon} onOpenChange={setIsAddingCoupon}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Coupon
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Coupon</DialogTitle>
              <DialogDescription>
                Create a new coupon for walk-in access.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Code</label>
                  <Input
                    value={newCoupon.code}
                    onChange={e =>
                      setNewCoupon(prev => ({
                        ...prev,
                        code: e.target.value.toUpperCase(),
                      }))
                    }
                    placeholder="COUPON123"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Type</label>
                  <select
                    value={newCoupon.type}
                    onChange={e =>
                      setNewCoupon(prev => ({ ...prev, type: e.target.value }))
                    }
                    className="w-full rounded-md border border-input bg-background px-3 py-2"
                  >
                    <option value="adult">Adult</option>
                    <option value="youth">Youth</option>
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Owner Name</label>
                <Input
                  value={newCoupon.ownerName}
                  onChange={e =>
                    setNewCoupon(prev => ({ ...prev, ownerName: e.target.value }))
                  }
                  placeholder="John Doe"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Price</label>
                <Input
                  value={newCoupon.price}
                  onChange={e =>
                    setNewCoupon(prev => ({ ...prev, price: e.target.value }))
                  }
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Valid From</label>
                  <Input
                    value={newCoupon.validFrom}
                    onChange={e =>
                      setNewCoupon(prev => ({ ...prev, validFrom: e.target.value }))
                    }
                    type="datetime-local"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Valid To</label>
                  <Input
                    value={newCoupon.validTo}
                    onChange={e =>
                      setNewCoupon(prev => ({ ...prev, validTo: e.target.value }))
                    }
                    type="datetime-local"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Maximum Uses</label>
                <Input
                  value={newCoupon.maxUses}
                  onChange={e =>
                    setNewCoupon(prev => ({ ...prev, maxUses: e.target.value }))
                  }
                  type="number"
                  placeholder="10"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddingCoupon(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddCoupon}>Create Coupon</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400" />
            <Input
              placeholder="Search by code or owner name..."
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
          {filteredCoupons.map(coupon => (
            <Card key={coupon.id} className="p-4">
              <CardContent className="p-0">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold">{coupon.code}</h3>
                      <Badge variant="outline" className="capitalize">
                        {coupon.type}
                      </Badge>
                      <Badge
                        variant={coupon.active ? 'default' : 'secondary'}
                      >
                        {coupon.active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Owner: {coupon.owner_name}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline">
                        <Ticket className="w-3 h-3 mr-1" />
                        {coupon.current_uses} / {coupon.max_uses} uses
                      </Badge>
                      <Badge variant="outline">
                        <Clock className="w-3 h-3 mr-1" />
                        {formatDateTime(coupon.valid_from)} - {formatDateTime(coupon.valid_to)}
                      </Badge>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold">
                      {formatCurrency(coupon.price)}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleCouponStatus(coupon)}
                      className="mt-2"
                    >
                      {coupon.active ? 'Disable' : 'Enable'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {filteredCoupons.length === 0 && (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              No coupons found
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CouponsPage;