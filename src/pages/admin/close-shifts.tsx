import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import { formatDateTime, formatCurrency } from '@/lib/utils';
import { Clock, Power, AlertTriangle, ChevronDown, ChevronUp, Receipt, Download, History, UserPlus, FileText, ArrowRightLeft } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useDebounce } from '../../hooks/use-debounce';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import type { PostgrestError } from '@supabase/supabase-js';
import { auditHelpers } from '@/lib/audit';

interface ShiftDetails {
  id: string;
  user_id: string;
  user_email: string;
  user_name: string | null;
  start_time: string;
  end_time?: string;
  declared_cash?: number;
  declared_qr?: number;
  declared_bank_transfer?: number;
  system_cash?: number;
  system_qr?: number;
  system_bank_transfer?: number;
  notes?: string;
  manually_ended?: boolean;
  manually_ended_by?: string;
  total_transactions: number;
  transactions?: {
    id: string;
    amount: number;
    method: string;
    payment_for: string;
    created_at: string;
    member_name?: string;
  }[];
}

interface ShiftHandover {
  id: string;
  from_user_id: string;
  to_user_id: string;
  handover_notes: string;
  cash_amount: number;
  qr_amount: number;
  bank_transfer_amount: number;
  created_at: string;
  from_user_name: string;
  to_user_name: string;
}

interface AuditTrailEntry {
  action_time: string;
  action_type: string;
  user_id: string;
  user_name: string;
  details: any;
}

interface ShiftReport {
  shift_id: string;
  cashier_name: string;
  start_time: string;
  end_time: string;
  total_transactions: number;
  total_amount: number;
  cash_amount: number;
  qr_amount: number;
  bank_transfer_amount: number;
  transactions: {
    id: string;
    time: string;
    amount: number;
    method: string;
    payment_for: string;
    member_name?: string;
  }[];
}

// Add type declarations for Supabase RPC functions
declare module '@supabase/supabase-js' {
  interface SupabaseClient {
    rpc<T = any>(
      fn: string,
      params?: {
        [key: string]: any;
      }
    ): Promise<{
      data: T | null;
      error: PostgrestError | null;
    }>;
  }
}

const CloseShiftsPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [shifts, setShifts] = useState<ShiftDetails[]>([]);
  const [selectedShift, setSelectedShift] = useState<ShiftDetails | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [expandedShiftId, setExpandedShiftId] = useState<string | null>(null);
  const [showCloseAllDialog, setShowCloseAllDialog] = useState(false);
  const [isClosingAll, setIsClosingAll] = useState(false);
  const [showHandoverDialog, setShowHandoverDialog] = useState(false);
  const [showAuditTrailDialog, setShowAuditTrailDialog] = useState(false);
  const [auditTrail, setAuditTrail] = useState<AuditTrailEntry[]>([]);
  const [availableUsers, setAvailableUsers] = useState<{ id: string; name: string | null; email: string }[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [handoverNotes, setHandoverNotes] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMethod, setFilterMethod] = useState<string>('all');
  const debouncedSearch = useDebounce(searchQuery, 300);

  // Fetch available users for handover
  useEffect(() => {
    const fetchUsers = async () => {
      if (!user?.id) return; // Prevents running with undefined id
      const { data, error } = await supabase
        .from('users')
        .select('id, name, email')
        .eq('role', 'cashier')
        .neq('id', user.id);

      if (error) {
        console.error('Error fetching users:', error);
        return;
      }

      console.log('Available users for handover:', data); // Debug log
      setAvailableUsers(data || []);
    };

    if (showHandoverDialog && user?.id) {
      fetchUsers();
    }
  }, [showHandoverDialog, user?.id]);

  // Real-time updates for shifts
  useEffect(() => {
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
  }, []);

  // Real-time updates for payments
  useEffect(() => {
    const subscription = supabase
      .channel('payments_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'payments',
        },
        () => {
          fetchShifts();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchShifts = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc('get_active_shifts_details');

      if (error) throw error;

      const shiftsWithDetails = await Promise.all(
        data.map(async (shift) => {
          const { data: transactions } = await supabase
            .from('payments')
            .select(`
              id,
              amount,
              method,
              payment_for,
              created_at,
              members (
                name
              )
            `)
            .eq('shift_id', shift.id)
            .order('created_at', { ascending: false });

          const totals = {
            cash: 0,
            qr: 0,
            bank_transfer: 0,
          };

          const formattedTransactions = transactions?.map(t => ({
            id: t.id,
            amount: t.amount,
            method: t.method,
            payment_for: t.payment_for,
            created_at: t.created_at,
            member_name: t.members?.name,
          }));

          formattedTransactions?.forEach((payment) => {
            if (payment.method === 'cash') totals.cash += payment.amount;
            else if (payment.method === 'qr') totals.qr += payment.amount;
            else if (payment.method === 'bank_transfer') totals.bank_transfer += payment.amount;
          });

          return {
            ...shift,
            total_transactions: formattedTransactions?.length || 0,
            system_cash: totals.cash,
            system_qr: totals.qr,
            system_bank_transfer: totals.bank_transfer,
            transactions: formattedTransactions,
          };
        })
      );

      setShifts(shiftsWithDetails);
    } catch (error) {
      console.error('Error fetching shifts:', error);
      toast({
        title: 'Error',
        description: 'Failed to load shifts',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchShifts();
  }, [fetchShifts]);

  const handleCloseShift = async (shift: ShiftDetails) => {
    setSelectedShift(shift);
    setShowConfirmDialog(true);
  };

  const confirmCloseShift = async () => {
    if (!selectedShift || !user) return;
    
    setIsClosing(true);
    try {
      const { error } = await supabase.rpc('admin_manually_end_shift', {
        shift_id: selectedShift.id,
        admin_id: user.id,
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Shift closed successfully',
      });

      setShowConfirmDialog(false);
      setSelectedShift(null);
    } catch (error) {
      console.error('Error closing shift:', error);
      toast({
        title: 'Error',
        description: 'Failed to close shift',
        variant: 'destructive',
      });
    } finally {
      setIsClosing(false);
    }
  };

  const handleCloseAllShifts = async () => {
    if (!user) return;
    
    setIsClosingAll(true);
    try {
      for (const shift of shifts) {
        const { error } = await supabase.rpc('admin_manually_end_shift', {
          shift_id: shift.id,
          admin_id: user.id,
        });

        if (error) throw error;
      }

      toast({
        title: 'Success',
        description: 'All shifts closed successfully',
      });

      setShowCloseAllDialog(false);
    } catch (error) {
      console.error('Error closing all shifts:', error);
      toast({
        title: 'Error',
        description: 'Failed to close all shifts',
        variant: 'destructive',
      });
    } finally {
      setIsClosingAll(false);
    }
  };

  const handleHandover = async () => {
    if (!selectedShift || !user || !selectedUserId) return;

    try {
      const { error } = await supabase.rpc<{ id: string }>('create_shift_handover', {
        shift_id: selectedShift.id,
        from_user_id: user.id,
        to_user_id: selectedUserId,
        handover_notes: handoverNotes || '',
        cash_amount: selectedShift.system_cash || 0,
        qr_amount: selectedShift.system_qr || 0,
        bank_transfer_amount: selectedShift.system_bank_transfer || 0,
      });

      if (error) throw error;

      // Create audit log for shift handover
      await auditHelpers.shiftHandover(
        user.id,
        selectedShift.id,
        selectedUserId,
        {
          handover_notes: handoverNotes,
          cash_amount: selectedShift.system_cash || 0,
          qr_amount: selectedShift.system_qr || 0,
          bank_transfer_amount: selectedShift.system_bank_transfer || 0
        }
      );

      toast({
        title: 'Success',
        description: 'Shift handover completed successfully',
      });

      setShowHandoverDialog(false);
      setSelectedUserId('');
      setHandoverNotes('');
    } catch (error) {
      console.error('Error during handover:', error);
      toast({
        title: 'Error',
        description: 'Failed to complete shift handover',
        variant: 'destructive',
      });
    }
  };

  const handleViewAuditTrail = async (shiftId: string) => {
    try {
      const { data, error } = await supabase.rpc<AuditTrailEntry[]>('get_shift_audit_trail', {
        shift_id: shiftId,
      });

      if (error) throw error;

      if (data) {
        setAuditTrail(data);
        setShowAuditTrailDialog(true);
      }
    } catch (error) {
      console.error('Error fetching audit trail:', error);
      toast({
        title: 'Error',
        description: 'Failed to load audit trail',
        variant: 'destructive',
      });
    }
  };

  const generateShiftReport = async (shift: ShiftDetails) => {
    try {
      const { data, error } = await supabase.rpc<ShiftReport[]>('get_shift_report', {
        shift_id: shift.id,
      });

      if (error) throw error;

      if (!data || !Array.isArray(data) || data.length === 0) {
        throw new Error('No report data available');
      }

      const report = data[0];
      const doc = new jsPDF();

      // Add header
      doc.setFontSize(20);
      doc.text('Shift Report', 105, 20, { align: 'center' });
      
      // Add shift details
      doc.setFontSize(12);
      doc.text(`Cashier: ${report.cashier_name}`, 20, 40);
      doc.text(`Start Time: ${formatDateTime(report.start_time)}`, 20, 50);
      doc.text(`End Time: ${formatDateTime(report.end_time)}`, 20, 60);
      
      // Add totals
      doc.text('Totals:', 20, 80);
      doc.text(`Total Transactions: ${report.total_transactions}`, 30, 90);
      doc.text(`Total Amount: ${formatCurrency(report.total_amount)}`, 30, 100);
      doc.text(`Cash: ${formatCurrency(report.cash_amount)}`, 30, 110);
      doc.text(`QR: ${formatCurrency(report.qr_amount)}`, 30, 120);
      doc.text(`Bank Transfer: ${formatCurrency(report.bank_transfer_amount)}`, 30, 130);

      // Add transactions table
      const tableData = report.transactions.map(t => [
        formatDateTime(t.time),
        t.member_name || 'Walk-in',
        t.payment_for,
        t.method,
        formatCurrency(t.amount),
      ]);

      (doc as any).autoTable({
        startY: 150,
        head: [['Time', 'Member', 'Type', 'Method', 'Amount']],
        body: tableData,
      });

      // Save the PDF
      doc.save(`shift-report-${shift.id}.pdf`);
    } catch (error) {
      console.error('Error generating report:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate shift report',
        variant: 'destructive',
      });
    }
  };

  const toggleShiftExpansion = (shiftId: string) => {
    setExpandedShiftId(expandedShiftId === shiftId ? null : shiftId);
  };

  const filteredShifts = shifts.filter(shift => {
    const name = shift.user_name || '';
    const matchesSearch = name.toLowerCase().includes(debouncedSearch.toLowerCase()) || shift.user_email.toLowerCase().includes(debouncedSearch.toLowerCase());
    const matchesMethod = filterMethod === 'all' || (shift.transactions && shift.transactions.some(t => t.method === filterMethod));
    return matchesSearch && matchesMethod;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Close Shifts</h1>
        <div className="flex items-center gap-2">
          {shifts.length > 0 && (
            <Button
              variant="destructive"
              onClick={() => setShowCloseAllDialog(true)}
            >
              <Power className="w-4 h-4 mr-1" />
              Close All Shifts
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => window.location.reload()}
          >
            Refresh
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <Input
          placeholder="Search by cashier..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-sm"
        />
        <Select value={filterMethod} onValueChange={setFilterMethod}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by method" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Methods</SelectItem>
            <SelectItem value="cash">Cash</SelectItem>
            <SelectItem value="qr">QR</SelectItem>
            <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="p-4">
              <Skeleton className="h-6 w-1/4 mb-2" />
              <Skeleton className="h-4 w-1/3" />
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredShifts.map((shift) => (
            <Card key={shift.id} className="p-4">
              <CardContent className="p-0">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold">
                        {shift.user_name || shift.user_email}
                      </h3>
                      <Badge variant="outline">
                        <Clock className="w-3 h-3 mr-1" />
                        Active
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-500">
                      Started: {formatDateTime(shift.start_time)}
                    </p>
                    <div className="text-sm text-gray-500">
                      <p>Transactions: {shift.total_transactions}</p>
                      <p>Total: {formatCurrency(
                        (shift.system_cash || 0) +
                        (shift.system_qr || 0) +
                        (shift.system_bank_transfer || 0)
                      )}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => generateShiftReport(shift)}
                    >
                      <Download className="w-4 h-4 mr-1" />
                      Report
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewAuditTrail(shift.id)}
                    >
                      <History className="w-4 h-4 mr-1" />
                      History
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedShift(shift);
                        setShowHandoverDialog(true);
                      }}
                    >
                      <UserPlus className="w-4 h-4 mr-1" />
                      Handover
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleShiftExpansion(shift.id)}
                    >
                      {expandedShiftId === shift.id ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCloseShift(shift)}
                    >
                      <Power className="w-4 h-4 mr-1" />
                      Close Shift
                    </Button>
                  </div>
                </div>

                {expandedShiftId === shift.id && shift.transactions && (
                  <div className="mt-4 border-t pt-4">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Time</TableHead>
                          <TableHead>Member</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Method</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {shift.transactions.map((transaction) => (
                          <TableRow key={transaction.id}>
                            <TableCell>{formatDateTime(transaction.created_at)}</TableCell>
                            <TableCell>{transaction.member_name || 'Walk-in'}</TableCell>
                            <TableCell>{transaction.payment_for}</TableCell>
                            <TableCell className="capitalize">{transaction.method}</TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(transaction.amount)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}

          {filteredShifts.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No active shifts found
            </div>
          )}
        </div>
      )}

      {/* Close Single Shift Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Close Shift</DialogTitle>
            <DialogDescription>
              Are you sure you want to close this shift? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {selectedShift && (
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-2 text-yellow-600">
                <AlertTriangle className="w-4 h-4" />
                <p className="text-sm">
                  This shift has {selectedShift.total_transactions} transactions totaling{' '}
                  {formatCurrency(
                    (selectedShift.system_cash || 0) +
                    (selectedShift.system_qr || 0) +
                    (selectedShift.system_bank_transfer || 0)
                  )}
                </p>
              </div>
              <div className="text-sm space-y-1">
                <p>Cash: {formatCurrency(selectedShift.system_cash || 0)}</p>
                <p>QR: {formatCurrency(selectedShift.system_qr || 0)}</p>
                <p>Bank Transfer: {formatCurrency(selectedShift.system_bank_transfer || 0)}</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowConfirmDialog(false)}
              disabled={isClosing}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmCloseShift}
              disabled={isClosing}
            >
              {isClosing ? 'Closing...' : 'Close Shift'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Close All Shifts Dialog */}
      <Dialog open={showCloseAllDialog} onOpenChange={setShowCloseAllDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Close All Shifts</DialogTitle>
            <DialogDescription>
              Are you sure you want to close all active shifts? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-2 text-yellow-600">
              <AlertTriangle className="w-4 h-4" />
              <p className="text-sm">
                This will close {shifts.length} active shifts with a total of{' '}
                {shifts.reduce((sum, shift) => sum + shift.total_transactions, 0)} transactions
              </p>
            </div>
            <div className="text-sm space-y-1">
              <p>Total Cash: {formatCurrency(shifts.reduce((sum, shift) => sum + (shift.system_cash || 0), 0))}</p>
              <p>Total QR: {formatCurrency(shifts.reduce((sum, shift) => sum + (shift.system_qr || 0), 0))}</p>
              <p>Total Bank Transfer: {formatCurrency(shifts.reduce((sum, shift) => sum + (shift.system_bank_transfer || 0), 0))}</p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCloseAllDialog(false)}
              disabled={isClosingAll}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleCloseAllShifts}
              disabled={isClosingAll}
            >
              {isClosingAll ? 'Closing...' : 'Close All Shifts'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Handover Dialog */}
      <Dialog open={showHandoverDialog} onOpenChange={setShowHandoverDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Shift Handover</DialogTitle>
            <DialogDescription>
              Transfer this shift to another cashier.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Cashier</label>
              <Select value={selectedUserId || ''} onValueChange={setSelectedUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a cashier" />
                </SelectTrigger>
                <SelectContent>
                  {availableUsers.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name || user.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Handover Notes</label>
              <Textarea
                placeholder="Add any notes for the next cashier..."
                value={handoverNotes}
                onChange={(e) => setHandoverNotes(e.target.value)}
              />
            </div>
            {selectedShift && (
              <div className="text-sm space-y-1">
                <p>Current Totals:</p>
                <p>Cash: {formatCurrency(selectedShift.system_cash || 0)}</p>
                <p>QR: {formatCurrency(selectedShift.system_qr || 0)}</p>
                <p>Bank Transfer: {formatCurrency(selectedShift.system_bank_transfer || 0)}</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowHandoverDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleHandover}
              disabled={!selectedUserId}
            >
              Complete Handover
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Audit Trail Dialog */}
      <Dialog open={showAuditTrailDialog} onOpenChange={setShowAuditTrailDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Shift History</DialogTitle>
            <DialogDescription>
              View the complete history of this shift.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[400px]">
            <div className="space-y-4">
              {auditTrail.map((entry, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">
                        {entry.action_type === 'shift_started' ? 'Started' :
                         entry.action_type === 'shift_closed' ? 'Closed' :
                         'Handover'}
                      </Badge>
                      <span className="text-sm text-gray-500">
                        {formatDateTime(entry.action_time)}
                      </span>
                    </div>
                    <span className="text-sm font-medium">{entry.user_name}</span>
                  </div>
                  {entry.action_type === 'handover' && (
                    <div className="text-sm space-y-1">
                      <p>Handed over to: {entry.details.to_user_name}</p>
                      <p>Notes: {entry.details.handover_notes}</p>
                      <div className="grid grid-cols-3 gap-2 mt-2">
                        <p>Cash: {formatCurrency(entry.details.cash_amount)}</p>
                        <p>QR: {formatCurrency(entry.details.qr_amount)}</p>
                        <p>Bank: {formatCurrency(entry.details.bank_transfer_amount)}</p>
                      </div>
                    </div>
                  )}
                  {entry.action_type === 'shift_closed' && (
                    <div className="text-sm space-y-1">
                      <p>Notes: {entry.details.notes}</p>
                      <div className="grid grid-cols-3 gap-2 mt-2">
                        <p>Cash: {formatCurrency(entry.details.declared_cash)}</p>
                        <p>QR: {formatCurrency(entry.details.declared_qr)}</p>
                        <p>Bank: {formatCurrency(entry.details.declared_bank_transfer)}</p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CloseShiftsPage; 