import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { Ticket, Clock, User } from 'lucide-react';
import type { Coupon, CouponUse } from '@/types';

const CouponDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [coupon, setCoupon] = useState<Coupon | null>(null);
  const [usageHistory, setUsageHistory] = useState<CouponUse[]>([]);

  useEffect(() => {
    if (id) {
      fetchCouponDetails();
    }
  }, [id]);

  const fetchCouponDetails = async () => {
    if (!id) return;
    
    try {
      // Fetch coupon details
      const { data: couponData, error: couponError } = await supabase
        .from('coupons')
        .select('*')
        .eq('id', id)
        .single();

      if (couponError) throw couponError;
      setCoupon(couponData as Coupon);

      // Fetch usage history
      const { data: usageData, error: usageError } = await supabase
        .from('coupon_uses')
        .select(`
          *,
          used_by:users(name, email)
        `)
        .eq('coupon_id', id)
        .order('used_at', { ascending: false });

      if (usageError) throw usageError;
      setUsageHistory(usageData as CouponUse[]);
    } catch (error) {
      console.error('Error fetching coupon details:', error);
      toast({
        title: 'Error',
        description: 'Failed to load coupon details',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!coupon) return;

    try {
      const { error } = await supabase
        .from('coupons')
        .update({ active: !coupon.active })
        .eq('id', coupon.id);

      if (error) throw error;

      setCoupon(prev => prev ? { ...prev, active: !prev.active } : null);

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

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!coupon) {
    return (
      <div className="text-center py-8">
        <h2 className="text-xl font-semibold text-gray-600">Coupon not found</h2>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => navigate('/coupons')}
        >
          Back to Coupons
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Coupon Details</h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => navigate(`/coupons/${coupon.id}/edit`)}
          >
            Edit Coupon
          </Button>
          <Button
            variant="outline"
            onClick={handleToggleStatus}
          >
            {coupon.active ? 'Disable' : 'Enable'} Coupon
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h2 className="text-xl font-semibold mb-4">Coupon Information</h2>
              <dl className="space-y-4">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Code</dt>
                  <dd className="mt-1 text-lg font-semibold">{coupon.code}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Owner</dt>
                  <dd className="mt-1">{coupon.owner_name}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Type</dt>
                  <dd className="mt-1">
                    <Badge variant="outline" className="capitalize">
                      {coupon.type}
                    </Badge>
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Price</dt>
                  <dd className="mt-1 text-2xl font-bold">
                    {formatCurrency(coupon.price)}
                  </dd>
                </div>
              </dl>
            </div>
            <div>
              <h2 className="text-xl font-semibold mb-4">Validity</h2>
              <dl className="space-y-4">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Status</dt>
                  <dd className="mt-1">
                    <Badge
                      variant={coupon.active ? 'default' : 'secondary'}
                    >
                      {coupon.active ? 'Active' : 'Inactive'}
                    </Badge>
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Valid From</dt>
                  <dd className="mt-1">{formatDateTime(coupon.valid_from)}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Valid Until</dt>
                  <dd className="mt-1">{formatDateTime(coupon.valid_to)}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Usage</dt>
                  <dd className="mt-1">
                    <Badge variant="outline">
                      <Ticket className="w-3 h-3 mr-1" />
                      {coupon.current_uses} / {coupon.max_uses} uses
                    </Badge>
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <h2 className="text-xl font-semibold mb-4">Usage History</h2>
          {usageHistory.length > 0 ? (
            <div className="space-y-4">
              {usageHistory.map((use) => (
                <div
                  key={use.id}
                  className="flex items-center justify-between py-3 border-b last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <User className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="font-medium">
                        {(use.used_by as any)?.name || (use.used_by as any)?.email}
                      </p>
                      <p className="text-sm text-gray-500">
                        {formatDateTime(use.used_at)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500 py-4">
              No usage history available
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CouponDetailsPage; 