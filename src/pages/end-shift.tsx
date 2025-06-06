import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { getActiveShift, getShiftTotals, endShift } from '@/lib/shifts';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import LoadingSpinner from '@/components/ui/loading-spinner';
import { formatCurrency } from '@/lib/utils';
import type { Shift } from '@/types';

const EndShiftPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeShift, setActiveShift] = useState<Shift | null>(null);
  const [availableUsers, setAvailableUsers] = useState<{ id: string; name: string | null; email: string }[]>([]);
  const [totals, setTotals] = useState({
    cash: 0,
    qr: 0,
    bank_transfer: 0,
  });
  const [formData, setFormData] = useState({
    declaredCash: '',
    declaredQr: '',
    declaredBankTransfer: '',
    notes: '',
    handoverTo: '',
  });

  useEffect(() => {
    const loadShiftData = async () => {
      if (!user) return;

      try {
        // Get active shift
        const { shift, error: shiftError } = await getActiveShift(user.id);
        
        if (shiftError) throw shiftError;
        if (!shift) {
          toast({
            title: 'No Active Shift',
            description: 'You don\'t have an active shift to end',
            variant: 'destructive',
          });
          navigate('/');
          return;
        }
        
        setActiveShift(shift);

        // Get shift totals
        const { totals: shiftTotals, error: totalsError } = await getShiftTotals(shift.id);
        
        if (totalsError) throw totalsError;
        setTotals(shiftTotals);

        // Fetch available users for handover
        const { data: users, error: usersError } = await supabase
          .from('users')
          .select('id, name, email')
          .eq('role', 'cashier')
          .eq('active', true)
          .neq('id', user.id);

        if (usersError) throw usersError;
        setAvailableUsers(users || []);
      } catch (error) {
        console.error('Error loading shift data:', error);
        toast({
          title: 'Error',
          description: 'Failed to load shift data',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadShiftData();
  }, [user, navigate, toast]);

  const handleSubmit = async () => {
    if (!activeShift) return;
    
    setIsSubmitting(true);

    try {
      const { success, message } = await endShift(
        activeShift.id,
        user!.id,
        {
          declaredCash: parseFloat(formData.declaredCash) || 0,
          declaredQr: parseFloat(formData.declaredQr) || 0,
          declaredBankTransfer: parseFloat(formData.declaredBankTransfer) || 0,
          notes: formData.notes,
          handoverTo: formData.handoverTo,
        }
      );

      if (!success) throw new Error(message);

      toast({
        title: 'Success',
        description: 'Shift ended successfully',
      });

      navigate('/');
    } catch (error) {
      console.error('Error ending shift:', error);
      toast({
        title: 'Error',
        description: 'Failed to end shift',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">End Shift</h1>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>System Totals</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-4">
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Cash
                </dt>
                <dd className="text-2xl font-bold">
                  {formatCurrency(totals.cash)}
                </dd>
              </div>
              
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  QR Payments
                </dt>
                <dd className="text-2xl font-bold">
                  {formatCurrency(totals.qr)}
                </dd>
              </div>
              
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Bank Transfers
                </dt>
                <dd className="text-2xl font-bold">
                  {formatCurrency(totals.bank_transfer)}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Declared Amounts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Cash</label>
              <Input
                type="number"
                value={formData.declaredCash}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  declaredCash: e.target.value
                }))}
                placeholder="0.00"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium">QR Payments</label>
              <Input
                type="number"
                value={formData.declaredQr}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  declaredQr: e.target.value
                }))}
                placeholder="0.00"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium">Bank Transfers</label>
              <Input
                type="number"
                value={formData.declaredBankTransfer}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  declaredBankTransfer: e.target.value
                }))}
                placeholder="0.00"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Additional Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">Handover To</label>
            <Select
              value={formData.handoverTo}
              onValueChange={(value) => setFormData(prev => ({
                ...prev,
                handoverTo: value
              }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select user to handover to" />
              </SelectTrigger>
              <SelectContent>
                {availableUsers.map(user => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.name || user.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium">Notes</label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                notes: e.target.value
              }))}
              placeholder="Any additional notes..."
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button
          onClick={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <div className="flex items-center">
              <LoadingSpinner size="sm\" className="mr-2" />
              <span>Ending Shift</span>
            </div>
          ) : (
            'End Shift'
          )}
        </Button>
        
        <Button
          variant="outline"
          onClick={() => navigate('/')}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
};

export default EndShiftPage;