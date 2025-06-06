import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import { formatDateTime } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { useDebounce } from '@/hooks/use-debounce';

interface AuditLog {
  id: string;
  type: string;
  description: string;
  user_id: string;
  user_name: string;
  created_at: string;
  details: any;
}

const AdminAuditPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 300);

  useEffect(() => {
    const fetchAuditLogs = async () => {
      try {
        const { data, error } = await supabase
          .from('audit_log')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100);

        if (error) throw error;

        setAuditLogs(data || []);
      } catch (error) {
        console.error('Error fetching audit logs:', error);
        toast({
          title: 'Error',
          description: 'Failed to load audit logs',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchAuditLogs();
  }, [toast]);

  const filteredLogs = auditLogs.filter(log => {
    const searchLower = debouncedSearch.toLowerCase();
    return (
      log.description.toLowerCase().includes(searchLower) ||
      log.type.toLowerCase().includes(searchLower) ||
      log.user_name?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Audit Log</h1>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 h-4 w-4" />
            <Input
              placeholder="Search audit logs..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center justify-between py-2">
                  <Skeleton className="h-4 w-[250px]" />
                  <Skeleton className="h-4 w-[100px]" />
                </div>
              ))}
            </div>
          ) : filteredLogs.length > 0 ? (
            <div className="space-y-4">
              {filteredLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between py-2 border-b last:border-0"
                >
                  <div>
                    <Badge
                      variant={
                        log.type === 'warning'
                          ? 'destructive'
                          : log.type === 'success'
                          ? 'default'
                          : 'secondary'
                      }
                      className="mb-1"
                    >
                      {log.type}
                    </Badge>
                    <p className="text-sm">{log.description}</p>
                    <p className="text-xs text-muted-foreground">
                      By {log.user_name || 'System'} • {formatDateTime(log.created_at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-4">
              No audit logs found
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminAuditPage; 