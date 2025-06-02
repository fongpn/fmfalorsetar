import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import { formatDateTime } from '@/lib/utils';
import { Clock, Power } from 'lucide-react';

const ActiveShiftsPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [shifts, setShifts] = useState<{
    id: string;
    user_id: string;
    user_email: string;
    user_name: string | null;
    start_time: string;
  }[]>([]);

  useEffect(() => {
    const fetchShifts = async () => {
      try {
        const { data, error } = await supabase.rpc('get_active_shifts_details');

        if (error) throw error;
        setShifts(data);
      } catch (error) {
        console.error('Error fetching active shifts:', error);
        toast({
          title: 'Error',
          description: 'Failed to load active shifts',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchShifts();

    // Subscribe to changes
    const subscription = supabase
      .channel('shifts_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'shifts',
        },
        () => {
          fetchShifts();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [toast]);

  const handleEndShift = async (shiftId: string) => {
    try {
      const { error } = await supabase.rpc('admin_manually_end_shift', {
        shift_id: shiftId,
        admin_id: user!.id,
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Shift ended successfully',
      });

      // Update will come through subscription
    } catch (error) {
      console.error('Error ending shift:', error);
      toast({
        title: 'Error',
        description: 'Failed to end shift',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Active Shifts</h1>

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
          {shifts.map((shift) => (
            <Card key={shift.id} className="p-4">
              <CardContent className="p-0">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold">
                        {shift.user_name || shift.user_email}
                      </h3>
                      <Badge variant="outline">
                        <Clock className="w-3 h-3 mr-1" />
                        Active
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Started: {formatDateTime(shift.start_time)}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEndShift(shift.id)}
                  >
                    <Power className="w-4 h-4 mr-1" />
                    End Shift
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}

          {shifts.length === 0 && (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              No active shifts found
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ActiveShiftsPage;