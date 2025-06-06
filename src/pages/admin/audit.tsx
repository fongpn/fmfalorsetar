import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import { formatDateTime } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Search, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { useDebounce } from '@/hooks/use-debounce';
import type { AuditAction } from '@/lib/audit';
import type { Database } from '@/types/supabase';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';

type AuditLogRow = Database['public']['Tables']['audit_log']['Row'] & {
  users: { name: string | null } | null;
};

interface AuditLog {
  id: string;
  type: string;
  action: AuditAction;
  description: string;
  user_id: string;
  user_name: string;
  created_at: string;
  metadata: Record<string, any>;
}

const ITEMS_PER_PAGE = 20;

const AdminAuditPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const debouncedSearch = useDebounce(searchQuery, 300);

  useEffect(() => {
    const fetchAuditLogs = async () => {
      try {
        const { data, error } = await supabase
          .from('audit_log')
          .select('*, users:user_id(name)')
          .order('created_at', { ascending: false })
          .limit(1000); // Increased limit to allow for client-side filtering

        if (error) throw error;

        setAuditLogs((data as AuditLogRow[] || []).map(log => ({
          id: log.id,
          type: log.type,
          action: log.action as AuditAction || 'unknown',
          description: log.description,
          user_id: log.user_id,
          user_name: log.users?.name || 'System',
          created_at: log.created_at,
          metadata: log.metadata as Record<string, any> || {}
        })));
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
    const matchesSearch = 
      log.description.toLowerCase().includes(searchLower) ||
      log.type.toLowerCase().includes(searchLower) ||
      (log.action && log.action.toLowerCase().includes(searchLower)) ||
      log.user_name?.toLowerCase().includes(searchLower);
    
    const matchesType = typeFilter === 'all' || log.type === typeFilter;
    const matchesAction = actionFilter === 'all' || log.action === actionFilter;

    return matchesSearch && matchesType && matchesAction;
  });

  const totalPages = Math.ceil(filteredLogs.length / ITEMS_PER_PAGE);
  const paginatedLogs = filteredLogs.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const getActionColor = (action: AuditAction | 'unknown') => {
    switch (action) {
      case 'member_registration':
      case 'member_renewal':
      case 'walk_in':
      case 'payment':
      case 'coupon_creation':
      case 'coupon_usage':
        return 'bg-green-100 text-green-800';
      case 'shift_start':
      case 'shift_end':
      case 'shift_handover':
        return 'bg-blue-100 text-blue-800';
      case 'settings_change':
      case 'user_management':
      case 'device_authorization':
      case 'product_management':
      case 'stock_adjustment':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatAction = (action: AuditAction | 'unknown') => {
    if (!action) return 'Unknown Action';
    return action.replace(/_/g, ' ');
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

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
        <div className="flex gap-2">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="success">Success</SelectItem>
              <SelectItem value="warning">Warning</SelectItem>
              <SelectItem value="error">Error</SelectItem>
              <SelectItem value="info">Info</SelectItem>
            </SelectContent>
          </Select>
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by action" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              <SelectItem value="member_registration">Member Registration</SelectItem>
              <SelectItem value="member_renewal">Member Renewal</SelectItem>
              <SelectItem value="walk_in">Walk In</SelectItem>
              <SelectItem value="payment">Payment</SelectItem>
              <SelectItem value="shift_start">Shift Start</SelectItem>
              <SelectItem value="shift_end">Shift End</SelectItem>
              <SelectItem value="settings_change">Settings Change</SelectItem>
            </SelectContent>
          </Select>
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
            <>
              <div className="space-y-4">
                {paginatedLogs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center justify-between py-2 border-b last:border-0"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            log.type === 'warning'
                              ? 'destructive'
                              : log.type === 'success'
                              ? 'default'
                              : 'secondary'
                          }
                        >
                          {log.type}
                        </Badge>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getActionColor(log.action)}`}>
                          {formatAction(log.action)}
                        </span>
                      </div>
                      <p className="text-sm">{log.description}</p>
                      <p className="text-xs text-muted-foreground">
                        By {log.user_name || 'System'} • {formatDateTime(log.created_at)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, filteredLogs.length)} of {filteredLogs.length} entries
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
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