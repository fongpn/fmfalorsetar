import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';

const CheckinsPage = () => {
  const [date, setDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [checkins, setCheckins] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchCheckins = async () => {
      setIsLoading(true);
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      const { data, error } = await supabase
        .from('check_ins')
        .select('*, member:member_id(name, member_id)')
        .gte('check_in_time', start.toISOString())
        .lte('check_in_time', end.toISOString())
        .order('check_in_time', { ascending: true });
      if (!error) setCheckins(data || []);
      setIsLoading(false);
    };
    fetchCheckins();
  }, [date]);

  return (
    <div className="max-w-3xl mx-auto py-8 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>All Check-ins for Selected Date</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Select Date:</label>
            <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="max-w-xs" />
          </div>
          {isLoading ? (
            <div>Loading...</div>
          ) : checkins.length === 0 ? (
            <div>No check-ins found for this date.</div>
          ) : (
            <div className="space-y-3">
              {checkins.map((ci) => (
                <div key={ci.id} className="p-3 border rounded bg-gray-50 flex justify-between items-center">
                  <div>
                    <div className="font-semibold">{ci.member?.name || 'Unknown Member'}</div>
                    <div className="text-xs text-gray-500">Member ID: {ci.member?.member_id || '-'}</div>
                  </div>
                  <div className="text-sm text-gray-700">{format(new Date(ci.check_in_time), 'hh:mm a')}</div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CheckinsPage; 