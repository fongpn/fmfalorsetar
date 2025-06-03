import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import LoadingSpinner from '@/components/ui/loading-spinner';
import type { Member } from '@/types';

const MemberImportPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<any[]>([]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setIsLoading(true);

    try {
      const text = await selectedFile.text();
      const rows = text.split('\n').map(row => row.split(',').map(cell => cell.trim()));
      const headers = rows[0];
      
      // Validate headers
      const requiredHeaders = ['name', 'nric', 'phone', 'email', 'address', 'membership_type'];
      const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
      
      if (missingHeaders.length > 0) {
        throw new Error(`Missing required headers: ${missingHeaders.join(', ')}`);
      }

      // Preview first 5 rows
      const previewData = rows.slice(1, 6).map(row => {
        const obj: any = {};
        headers.forEach((header, index) => {
          obj[header] = row[index] || '';
        });
        return obj;
      });

      setPreview(previewData);
    } catch (error) {
      console.error('Error reading file:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to read file',
        variant: 'destructive',
      });
      setFile(null);
      setPreview([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImport = async () => {
    if (!file || !user) return;
    setIsLoading(true);

    try {
      const text = await file.text();
      const rows = text.split('\n').map(row => row.split(',').map(cell => cell.trim()));
      const headers = rows[0];
      const data = rows.slice(1);

      // Get active shift for the current user
      let { data: shiftData, error: shiftError } = await supabase
        .from('shifts')
        .select('id')
        .eq('user_id', user.id)
        .is('end_time', null)
        .single();

      let activeShiftId = shiftData?.id;
      if (shiftError || !shiftData) {
        // If no active shift, automatically start one
        const { data: newShift, error: newShiftError } = await supabase
          .from('shifts')
          .insert({ user_id: user.id, start_time: new Date().toISOString() })
          .select('id')
          .single();
        
        if (newShiftError || !newShift) {
          throw new Error('Failed to start a new shift');
        }
        activeShiftId = newShift.id;
      }

      // Get membership plans
      const { data: plans, error: plansError } = await supabase
        .from('membership_plans')
        .select('*')
        .eq('active', true);

      if (plansError || !plans) {
        throw new Error('Failed to fetch membership plans');
      }

      // Process each row
      for (const row of data) {
        if (row.length !== headers.length) continue;

        const memberData: any = {};
        headers.forEach((header, index) => {
          memberData[header] = row[index] || null;
        });

        // Generate member ID
        const { data: generatedId, error: generateError } = await supabase.rpc('generate_member_id');
        if (generateError || !generatedId) {
          throw new Error('Failed to generate member ID');
        }

        // Find membership plan
        const plan = plans.find(p => p.type === memberData.membership_type);
        if (!plan) {
          throw new Error(`Invalid membership type: ${memberData.membership_type}`);
        }

        // Calculate dates
        const startDate = new Date();
        const expiryDate = new Date(startDate);
        expiryDate.setMonth(expiryDate.getMonth() + plan.months);
        expiryDate.setDate(expiryDate.getDate() - 1);

        // Insert member
        const { data: insertedMember, error: memberError } = await supabase
          .from('members')
          .insert({
            name: memberData.name,
            member_id: generatedId,
            nric: memberData.nric,
            email: memberData.email,
            phone: memberData.phone,
            address: memberData.address,
            membership_type: memberData.membership_type,
            start_date: startDate.toISOString(),
            end_date: expiryDate.toISOString(),
            status: 'active',
            registration_fee_paid: true,
            created_by: user.id,
          })
          .select()
          .single();

        if (memberError || !insertedMember) {
          throw new Error(`Failed to insert member: ${memberData.name}`);
        }

        // Add to membership history
        const { error: historyError } = await supabase
          .from('membership_history')
          .insert({
            member_id: insertedMember.id,
            membership_type: memberData.membership_type,
            start_date: startDate.toISOString(),
            end_date: expiryDate.toISOString(),
            payment_amount: plan.price + plan.registration_fee,
            payment_method: 'cash', // Default to cash for imports
            is_renewal: false,
            created_by: user.id,
          });

        if (historyError) {
          throw new Error(`Failed to add membership history for: ${memberData.name}`);
        }

        // Record payment
        const { error: paymentError } = await supabase
          .from('payments')
          .insert({
            member_id: insertedMember.id,
            amount: plan.price + plan.registration_fee,
            method: 'cash',
            payment_for: 'initial_registration_membership',
            shift_id: activeShiftId!,
            created_by: user.id,
          });

        if (paymentError) {
          throw new Error(`Failed to record payment for: ${memberData.name}`);
        }
      }

      toast({
        title: 'Success',
        description: `Successfully imported ${data.length} members`,
      });

      navigate('/members');
    } catch (error) {
      console.error('Import error:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to import members',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" size="icon" onClick={() => navigate('/members')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold">Import Members</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Import Members from CSV</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="csv-file">CSV File</Label>
            <Input
              id="csv-file"
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              disabled={isLoading}
            />
            <p className="text-sm text-gray-500">
              Required columns: name, nric, phone, email, address, membership_type
            </p>
          </div>

          {preview.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-medium">Preview (First 5 rows)</h3>
              <div className="border rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      {Object.keys(preview[0]).map((header) => (
                        <th
                          key={header}
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {preview.map((row, index) => (
                      <tr key={index}>
                        {Object.values(row).map((value, i) => (
                          <td key={i} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {String(value)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button
              onClick={handleImport}
              disabled={!file || isLoading}
            >
              {isLoading ? (
                <div className="flex items-center">
                  <LoadingSpinner size="sm" className="mr-2" />
                  <span>Importing...</span>
                </div>
              ) : (
                <div className="flex items-center">
                  <Upload className="h-4 w-4 mr-2" />
                  <span>Import Members</span>
                </div>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MemberImportPage; 