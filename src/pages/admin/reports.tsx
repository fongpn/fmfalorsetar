import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useDateRange } from '@/lib/hooks/useDateRange';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { FinancialReport, SalesReport, MembershipReport, AttendanceReport } from '@/types';

const AdminReportsPage = () => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [reportType, setReportType] = useState<'financial' | 'sales' | 'membership' | 'attendance'>('financial');
  const {
    dateRange,
    rangeType,
    setRangeByType,
  } = useDateRange('today');

  const [reports, setReports] = useState<{
    financial?: FinancialReport;
    sales?: SalesReport;
    membership?: MembershipReport;
    attendance?: AttendanceReport;
  }>({});

  const generateReport = async () => {
    setIsLoading(true);

    try {
      const { data, error } = await supabase.rpc(`get_${reportType}_report`, {
        start_date: dateRange.startDate.toISOString(),
        end_date: dateRange.endDate.toISOString(),
      });

      if (error) throw error;

      setReports(prev => ({
        ...prev,
        [reportType]: data,
      }));
    } catch (error) {
      console.error('Error generating report:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Reports</h1>

      <div className="flex gap-4">
        <Select
          value={reportType}
          onValueChange={(value: typeof reportType) => setReportType(value)}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Select report type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="financial">Financial Report</SelectItem>
            <SelectItem value="sales">Sales Report</SelectItem>
            <SelectItem value="membership">Membership Report</SelectItem>
            <SelectItem value="attendance">Attendance Report</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={rangeType}
          onValueChange={setRangeByType}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Select date range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="yesterday">Yesterday</SelectItem>
            <SelectItem value="thisWeek">This Week</SelectItem>
            <SelectItem value="lastWeek">Last Week</SelectItem>
            <SelectItem value="thisMonth">This Month</SelectItem>
            <SelectItem value="lastMonth">Last Month</SelectItem>
          </SelectContent>
        </Select>

        <Button onClick={generateReport} disabled={isLoading}>
          Generate Report
        </Button>
      </div>

      <div className="grid gap-6">
        {reportType === 'financial' && reports.financial && (
          <Card>
            <CardHeader>
              <CardTitle>Financial Report</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <h3 className="font-medium mb-2">Revenue Breakdown</h3>
                  <dl className="space-y-2">
                    <div className="flex justify-between">
                      <dt>Registrations</dt>
                      <dd>{formatCurrency(reports.financial.registrations)}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt>Renewals</dt>
                      <dd>{formatCurrency(reports.financial.renewals)}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt>Walk-Ins</dt>
                      <dd>{formatCurrency(reports.financial.walkIns)}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt>POS Sales</dt>
                      <dd>{formatCurrency(reports.financial.pos)}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt>Coupons</dt>
                      <dd>{formatCurrency(reports.financial.coupons)}</dd>
                    </div>
                  </dl>
                </div>

                <div>
                  <h3 className="font-medium mb-2">Payment Methods</h3>
                  <dl className="space-y-2">
                    <div className="flex justify-between">
                      <dt>Cash</dt>
                      <dd>{formatCurrency(reports.financial.totalCash)}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt>QR Payments</dt>
                      <dd>{formatCurrency(reports.financial.totalQr)}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt>Bank Transfers</dt>
                      <dd>{formatCurrency(reports.financial.totalBankTransfer)}</dd>
                    </div>
                  </dl>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t">
                <div className="flex justify-between text-lg font-bold">
                  <span>Total Revenue</span>
                  <span>{formatCurrency(reports.financial.totalRevenue)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {reportType === 'sales' && reports.sales && (
          <Card>
            <CardHeader>
              <CardTitle>Sales Report</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <h3 className="font-medium mb-2">Product Performance</h3>
                  <div className="space-y-2">
                    {reports.sales.productPerformance.map((product) => (
                      <div
                        key={product.product_id}
                        className="flex justify-between items-center"
                      >
                        <div>
                          <p className="font-medium">{product.product_name}</p>
                          <p className="text-sm text-gray-500">
                            Quantity sold: {product.quantity_sold}
                          </p>
                        </div>
                        <p className="font-medium">
                          {formatCurrency(product.revenue)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="font-medium mb-2">Stock Status</h3>
                  <div className="space-y-2">
                    {reports.sales.stockStatus.map((product) => (
                      <div
                        key={product.product_id}
                        className="flex justify-between items-center"
                      >
                        <div>
                          <p className="font-medium">{product.product_name}</p>
                          <p className="text-sm text-gray-500">
                            Current stock: {product.current_stock}
                          </p>
                        </div>
                        {product.low_stock && (
                          <span className="text-red-500 text-sm">Low Stock</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-6 border-t">
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total Sales</span>
                    <span>{formatCurrency(reports.sales.totalSales)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {reportType === 'membership' && reports.membership && (
          <Card>
            <CardHeader>
              <CardTitle>Membership Report</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <h3 className="font-medium mb-2">New Members</h3>
                  <p className="text-2xl font-bold">
                    {reports.membership.newMembers}
                  </p>
                </div>

                <div>
                  <h3 className="font-medium mb-2">Renewals by Type</h3>
                  <div className="space-y-2">
                    {reports.membership.renewals.map((renewal) => (
                      <div
                        key={renewal.type}
                        className="flex justify-between items-center"
                      >
                        <span className="capitalize">{renewal.type}</span>
                        <span>{renewal.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {reportType === 'attendance' && reports.attendance && (
          <Card>
            <CardHeader>
              <CardTitle>Attendance Report</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-3">
                <div>
                  <h3 className="font-medium mb-2">Members</h3>
                  <p className="text-2xl font-bold">
                    {reports.attendance.members}
                  </p>
                </div>

                <div>
                  <h3 className="font-medium mb-2">Walk-Ins</h3>
                  <p className="text-2xl font-bold">
                    {reports.attendance.walkIns}
                  </p>
                </div>

                <div>
                  <h3 className="font-medium mb-2">Total</h3>
                  <p className="text-2xl font-bold">
                    {reports.attendance.total}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default AdminReportsPage;