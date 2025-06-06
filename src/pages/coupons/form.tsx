import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase';
import type { Coupon } from '@/types';
import { format, addMonths, subDays, parseISO } from 'date-fns';
import { useAuth } from '@/lib/auth';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useSettings } from '@/contexts/SettingsContext';

interface CouponFormProps {
  onSuccess: () => void;
  couponId?: string;
}

type PaymentMethod = 'cash' | 'qr' | 'bank_transfer';

const defaultPrices = { adult: 45, youth: 35, max_uses: 1 };

interface CouponFormData {
  code: string;
  type: 'adult' | 'youth';
  price: number;
  valid_from?: string;
  valid_to: string;
  max_uses: number;
  current_uses: number;
  active: boolean;
  owner_name: string;
}

export default function CouponForm({ onSuccess, couponId }: CouponFormProps) {
  const { id: paramId } = useParams();
  const id = couponId || paramId;
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';
  const { settings } = useSettings();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showUsageModal, setShowUsageModal] = useState(false);
  const [formData, setFormData] = useState<CouponFormData>({
    code: '',
    type: 'adult',
    price: settings?.adult_coupon_price || defaultPrices.adult,
    valid_from: format(new Date(), 'yyyy-MM-dd'),
    valid_to: format(subDays(addMonths(new Date(), 1), 1), 'yyyy-MM-dd'),
    max_uses: settings?.coupon_max_uses || defaultPrices.max_uses,
    current_uses: 0,
    active: true,
    owner_name: '',
  });
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [codeError, setCodeError] = useState('');

  useEffect(() => {
    if (id) fetchCoupon();
    else setLoading(false);
  }, [id]);

  useEffect(() => {
    if (settings) {
      setFormData(prev => ({
        ...prev,
        price: prev.type === 'adult' ? settings.adult_coupon_price : settings.youth_coupon_price,
        max_uses: settings.coupon_max_uses
      }));
    }
  }, [settings]);

  const fetchCoupon = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('coupons').select('*').eq('id', id).single();
    if (!error && data) {
      const validFrom = data.valid_from ? format(new Date(data.valid_from), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd');
      const validTo = data.valid_to ? format(new Date(data.valid_to), 'yyyy-MM-dd') : format(subDays(addMonths(new Date(), 1), 1), 'yyyy-MM-dd');
      
      setFormData({
        ...data,
        type: data.type === 'adult' ? 'adult' : 'youth',
        valid_from: validFrom,
        valid_to: validTo,
      });
    }
    setLoading(false);
  };

  const checkCouponCodeExists = async (code: string): Promise<boolean> => {
    if (!code) return false;
    const { data, error } = await supabase.from('coupons').select('id').eq('code', code.toUpperCase());
    if (error) return false;
    if (id) return data.filter((c: any) => c.id !== id).length > 0;
    return data.length > 0;
  };

  const handleCodeChange = async (code: string) => {
    setFormData(prev => ({ ...prev, code: code.toUpperCase() }));
    setCodeError('');
    if (code) {
      const exists = await checkCouponCodeExists(code);
      if (exists) setCodeError('This coupon code is already in use');
    }
  };

  const handleTypeChange = (type: 'adult' | 'youth') => {
    setFormData(prev => ({
      ...prev,
      type,
      price: type === 'adult' ? (settings?.adult_coupon_price || defaultPrices.adult) : (settings?.youth_coupon_price || defaultPrices.youth)
    }));
  };

  const handleValidFromChange = (date: string | undefined) => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const validFrom = date || today;
    
    const parsedDate = parseISO(validFrom);
    if (isNaN(parsedDate.getTime())) {
      setFormData(prev => ({
        ...prev,
        valid_from: today,
        valid_to: format(subDays(addMonths(new Date(), 1), 1), 'yyyy-MM-dd'),
      }));
      return;
    }

    setFormData(prev => ({
      ...prev,
      valid_from: validFrom,
      valid_to: format(subDays(addMonths(parsedDate, 1), 1), 'yyyy-MM-dd'),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) {
      const exists = await checkCouponCodeExists(formData.code || '');
      if (exists) {
        setCodeError('This coupon code is already in use');
        return;
      }
    }
    if (codeError) return;
    setSubmitting(true);
    if (id) {
      // Update
      const couponData = {
        ...formData,
        valid_from: new Date(formData.valid_from as string).toISOString(),
        valid_to: new Date(formData.valid_to as string).toISOString(),
        max_uses: settings?.coupon_max_uses,
      };
      await supabase.from('coupons').update(couponData).eq('id', id);
      setSubmitting(false);
      onSuccess();
    } else {
      // Create: show modal to use now
      setShowUsageModal(true);
      setSubmitting(false);
    }
  };

  const createCouponAndUse = async (shouldUse: boolean) => {
    setSubmitting(true);
    const couponData = {
      ...formData,
      code: (formData.code || '').toUpperCase(),
      valid_from: new Date(formData.valid_from as string).toISOString(),
      valid_to: new Date(formData.valid_to as string).toISOString(),
      price: formData.type === 'adult' ? (settings?.adult_coupon_price || defaultPrices.adult) : (settings?.youth_coupon_price || defaultPrices.youth),
      max_uses: settings?.coupon_max_uses ?? 1,
      current_uses: 0,
      created_by: user?.id || '',
      owner_name: formData.owner_name || '',
      type: formData.type === 'adult' ? 'adult' : 'youth',
    };
    const { data: coupon, error } = await supabase.from('coupons').insert(couponData).select().single();
    if (!error && coupon && shouldUse && coupon.id) {
      await supabase.from('coupon_uses').insert({
        coupon_id: coupon.id as string,
        used_at: new Date().toISOString(),
        used_by: user?.id as string,
        created_at: new Date().toISOString(),
      });
      await supabase.from('coupons').update({ current_uses: 1 }).eq('id', coupon.id);
    }
    setSubmitting(false);
    setShowUsageModal(false);
    onSuccess();
  };

  if (loading) return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div></div>;

  return (
    <>
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="p-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">{id ? 'Edit Coupon' : 'New Coupon'}</h1>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="code">Coupon Code</Label>
                <Input id="code" type="text" value={formData.code} onChange={(e) => handleCodeChange(e.target.value)} placeholder="Enter coupon code" required className={codeError ? 'border-red-500' : ''} />
                {codeError && <p className="mt-1 text-sm text-red-600">{codeError}</p>}
              </div>
              <div>
                <Label htmlFor="owner_name">Owner's Name</Label>
                <Input id="owner_name" value={formData.owner_name} onChange={(e) => setFormData({ ...formData, owner_name: e.target.value })} placeholder="Enter coupon holder's name" />
              </div>
              <div>
                <Label>Membership Type</Label>
                <div className="flex gap-4 mt-2">
                  <label className={`flex items-center gap-2 cursor-pointer ${formData.type === 'adult' ? 'font-bold text-orange-600' : ''}`}>
                    <input type="radio" name="type" value="adult" checked={formData.type === 'adult'} onChange={() => handleTypeChange('adult')} className="sr-only" />
                    Adult (RM {formData.price})
                  </label>
                  <label className={`flex items-center gap-2 cursor-pointer ${formData.type === 'youth' ? 'font-bold text-orange-600' : ''}`}>
                    <input type="radio" name="type" value="youth" checked={formData.type === 'youth'} onChange={() => handleTypeChange('youth')} className="sr-only" />
                    Youth (RM {formData.price})
                  </label>
                </div>
              </div>
              <div>
                <Label htmlFor="valid_from">Valid From</Label>
                <Input 
                  id="valid_from" 
                  type="date" 
                  value={formData.valid_from} 
                  onChange={(e) => handleValidFromChange(e.target.value)} 
                />
              </div>
              <div>
                <Label htmlFor="valid_to">Valid Until <span className="text-xs text-gray-500">(Inclusive)</span></Label>
                <Input id="valid_to" type="date" value={formData.valid_to} readOnly />
              </div>
              <div className="flex items-center">
                <input id="active" type="checkbox" checked={formData.active} onChange={(e) => setFormData({ ...formData, active: e.target.checked })} className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded" />
                <Label htmlFor="active" className="ml-2">Coupon is active</Label>
              </div>
              {!id && (
                <div className="space-y-4">
                  <Label>Payment Method</Label>
                  <div className="flex gap-4">
                    <label className={`flex items-center gap-2 cursor-pointer ${paymentMethod === 'cash' ? 'font-bold text-orange-600' : ''}`}>
                      <input type="radio" name="paymentMethod" value="cash" checked={paymentMethod === 'cash'} onChange={() => setPaymentMethod('cash')} className="sr-only" />
                      Cash
                    </label>
                    <label className={`flex items-center gap-2 cursor-pointer ${paymentMethod === 'qr' ? 'font-bold text-orange-600' : ''}`}>
                      <input type="radio" name="paymentMethod" value="qr" checked={paymentMethod === 'qr'} onChange={() => setPaymentMethod('qr')} className="sr-only" />
                      QR Payment
                    </label>
                    <label className={`flex items-center gap-2 cursor-pointer ${paymentMethod === 'bank_transfer' ? 'font-bold text-orange-600' : ''}`}>
                      <input type="radio" name="paymentMethod" value="bank_transfer" checked={paymentMethod === 'bank_transfer'} onChange={() => setPaymentMethod('bank_transfer')} className="sr-only" />
                      Bank Transfer
                    </label>
                  </div>
                </div>
              )}
              <div className="flex justify-end gap-4">
                <Button type="button" variant="outline" onClick={() => navigate('/coupons')}>Cancel</Button>
                <Button type="submit" disabled={submitting || !!codeError}>{submitting ? 'Saving...' : id ? 'Update Coupon' : 'Create Coupon'}</Button>
              </div>
            </form>
          </div>
        </div>
      </div>
      <Dialog open={showUsageModal} modal={true} onOpenChange={() => {}}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Use Coupon Now?</DialogTitle>
          </DialogHeader>
          <div className="text-gray-600 mb-6">Would you like to use this coupon now?</div>
          <DialogFooter className="flex justify-end gap-4">
            <Button variant="outline" onClick={() => createCouponAndUse(false)} disabled={submitting}>No, Skip</Button>
            <Button onClick={() => createCouponAndUse(true)} disabled={submitting}>Yes, Use Now</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}