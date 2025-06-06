import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import LoadingSpinner from '@/components/ui/loading-spinner';
import type { Member, MembershipType } from '@/types';

const ITEMS_PER_PAGE = 10;

// Function to check if a value is an Excel error
const isExcelError = (value: string | null | undefined): boolean => {
  if (!value) return false;
  const excelErrors = ['#VALUE!', '#N/A', '#REF!', '#DIV/0!', '#NUM!', '#NAME?', '#NULL!'];
  return excelErrors.includes(value.trim());
};

// Function to parse and validate date strings
const parseDate = (dateStr: string | null | undefined): string | null => {
  if (!dateStr || isExcelError(dateStr)) return null;
  
  // Try different date formats
  const formats = [
    // DD/MM/YYYY
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
    // YYYY-MM-DD
    /^(\d{4})-(\d{1,2})-(\d{1,2})$/,
    // DD-MM-YYYY
    /^(\d{1,2})-(\d{1,2})-(\d{4})$/,
  ];

  for (const format of formats) {
    const match = dateStr.match(format);
    if (match) {
      let year, month, day;
      
      if (format === formats[0] || format === formats[2]) {
        // DD/MM/YYYY or DD-MM-YYYY
        [, day, month, year] = match;
      } else {
        // YYYY-MM-DD
        [, year, month, day] = match;
      }

      // Convert to numbers and validate
      const y = parseInt(year);
      const m = parseInt(month);
      const d = parseInt(day);

      if (y < 1900 || y > 2100 || m < 1 || m > 12 || d < 1 || d > 31) {
        return null;
      }

      // Create date and validate
      const date = new Date(y, m - 1, d);
      if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) {
        return null;
      }

      return date.toISOString();
    }
  }

  return null;
};

const MemberImportPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [csvData, setCsvData] = useState<any[]>([]);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [skippedRows, setSkippedRows] = useState<{ row: any; reason: string }[]>([]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (selectedFile.type !== 'text/csv') {
      toast({
        title: "Error",
        description: "Please upload a CSV file",
        variant: "destructive"
      });
      return;
    }

    setFile(selectedFile);

    const reader = new FileReader();
    reader.onload = (event: ProgressEvent<FileReader>) => {
      const text = event.target?.result as string;
      const rows = text.split('\n').map(row => row.split(','));
      const headers = rows[0].map(h => h.trim());
      
      // Convert rows to objects
      const data = rows.slice(1).map(row => {
        const obj: Record<string, string> = {};
        headers.forEach((header, index) => {
          obj[header] = row[index]?.trim() || '';
        });
        return obj;
      });

      // Set preview data (first 10 rows)
      setPreviewData(data.slice(0, 10));
      setCsvData(data);
      setPreview(data);
    };
    reader.readAsText(selectedFile);
  };

  const handleImport = async () => {
    if (!csvData.length || !user) {
      toast({
        title: "Error",
        description: "No data to import or user not authenticated",
        variant: "destructive"
      });
      return;
    }

    // Validate required columns
    const requiredColumns = ['name', 'nric', 'membership_type'];
    const missingColumns = requiredColumns.filter(col => !csvData[0].hasOwnProperty(col));
    
    if (missingColumns.length > 0) {
      toast({
        title: "Error",
        description: `Missing required columns: ${missingColumns.join(', ')}`,
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    setSkippedRows([]); // Reset skipped rows
    try {
      // Fetch the current highest member_id (as a number)
      const { data: existingMembers, error: fetchError } = await supabase
        .from('members')
        .select('member_id');
      if (fetchError) throw fetchError;
      // Get all numeric member_ids
      const numericIds = (existingMembers || [])
        .map((m: any) => parseInt(m.member_id, 10))
        .filter((n: number) => !isNaN(n));
      let nextId = numericIds.length > 0 ? Math.max(...numericIds) + 1 : 1;
      // Track all used IDs (from DB only)
      const usedIds = new Set(numericIds.map(String));

      const today = new Date();
      const seenCsvIds = new Set<string>();
      const skipped: { row: any; reason: string }[] = [];
      const members: any[] = [];

      for (let i = 0; i < csvData.length; i++) {
        const row = csvData[i];
        let member_id = row.member_id && row.member_id.trim() !== '' ? row.member_id.trim() : undefined;
        let isDuplicate = false;
        let duplicateReason = '';
        if (member_id) {
          if (usedIds.has(member_id)) {
            isDuplicate = true;
            duplicateReason = `Duplicate member_id: ${member_id} (already exists)`;
          } else if (seenCsvIds.has(member_id)) {
            isDuplicate = true;
            duplicateReason = `Duplicate member_id: ${member_id} (in CSV)`;
          }
        }
        if (isDuplicate) {
          skipped.push({ row, reason: duplicateReason });
          continue;
        }
        if (!member_id) {
          // Find the next unused running number
          while (usedIds.has(String(nextId)) || seenCsvIds.has(String(nextId))) {
            nextId++;
          }
          member_id = String(nextId);
          nextId++;
        }
        // Mark this member_id as seen in this import and as used
        seenCsvIds.add(member_id);
        usedIds.add(member_id);

        // Parse dates
        const parsedStartDate = parseDate(row.start_date);
        let parsedEndDate = parseDate(row.end_date);
        if (!parsedEndDate) {
          parsedEndDate = parsedStartDate || new Date().toISOString();
        }

        // Determine status
        let status = 'inactive';
        if (parsedEndDate) {
          const endDateObj = new Date(parsedEndDate);
          // Remove time part for accurate date-only comparison
          const todayDateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
          const endDateOnly = new Date(endDateObj.getFullYear(), endDateObj.getMonth(), endDateObj.getDate());
          if (!isNaN(endDateOnly.getTime()) && endDateOnly >= todayDateOnly) {
            status = 'active';
          } else {
            status = 'expired';
          }
        }

        // Build member object only with valid fields
        const member: any = {
          member_id,
          name: row.name,
          email: row.email || null,
          phone: row.phone || null,
          nric: row.nric,
          address: row.address || null,
          photo_url: row.photo_url || null,
          membership_type: row.membership_type as MembershipType,
          status,
          registration_fee_paid: row.registration_fee_paid === 'true' || row.registration_fee_paid === true ? true : false,
          notes: row.notes || null,
          created_by: user.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          start_date: parsedStartDate || new Date().toISOString(),
          end_date: parsedEndDate
        };
        members.push(member);
      }

      setSkippedRows(skipped);

      if (members.length === 0) {
        toast({
          title: "No members imported",
          description: "All rows were skipped due to duplicate IDs.",
          variant: "destructive"
        });
        setIsLoading(false);
        return;
      }

      // Insert members into database
      const { error } = await supabase.from('members').insert(members);

      if (error) {
        console.error('Supabase insert error:', error); // Debug log
        throw error;
      }

      let desc = `Successfully imported ${members.length} members.`;
      if (skipped.length > 0) {
        desc += ` Skipped ${skipped.length} row(s) due to duplicate IDs.`;
      }
      toast({
        title: "Success",
        description: desc,
      });

      // Reset form
      setFile(null);
      setCsvData([]);
      setPreviewData([]);
    } catch (error) {
      console.error('Error importing members:', error); // Debug log
      toast({
        title: "Error",
        description: "Failed to import members. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const totalPages = Math.ceil(preview.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentPreview = preview.slice(startIndex, endIndex);

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" size="icon" onClick={() => navigate('/members')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold">Import Members</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Import Members from CSV</CardTitle>
          <CardDescription>
            Upload a CSV file containing member information. The file should include the following columns:
            name, nric, phone, membership_type (required), email, address, start_date, end_date (optional).
            Empty cells and Excel errors (#VALUE!, #N/A, etc.) will be set to NULL. Dates should be in DD/MM/YYYY, YYYY-MM-DD, or DD-MM-YYYY format.
            Member IDs will be automatically assigned as simple numbers.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="csv-file">CSV File</Label>
              <Input
                id="csv-file"
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                disabled={isLoading}
              />
            </div>

            {preview.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">Preview</h3>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm">
                      Page {currentPage} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {Object.keys(preview[0]).map((header) => (
                          <TableHead key={header}>{header}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {currentPreview.map((row, index) => (
                        <TableRow key={index}>
                          {Object.values(row).map((value: any, i) => (
                            <TableCell key={i}>{value === null ? 'NULL' : value}</TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {skippedRows.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-medium text-red-600">Skipped Rows</h3>
                <div className="border rounded-md overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Row #</TableHead>
                        <TableHead>Reason</TableHead>
                        {Object.keys(skippedRows[0].row).map((header) => (
                          <TableHead key={header}>{header}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {skippedRows.map((item, idx) => (
                        <TableRow key={idx}>
                          <TableCell>{idx + 1}</TableCell>
                          <TableCell className="text-xs text-red-700">{item.reason}</TableCell>
                          {Object.values(item.row).map((value: any, i) => (
                            <TableCell key={i}>{value === null ? 'NULL' : value}</TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            <Button
              onClick={handleImport}
              disabled={!file || isLoading}
              className="w-full"
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