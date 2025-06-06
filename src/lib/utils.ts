import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, parseISO, addHours } from 'date-fns';
import type { MemberStatus } from '@/types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Convert to GMT+8 timezone for display (all DB dates are in UTC)
export function toGMT8(dateString: string): Date {
  const date = parseISO(dateString);
  return addHours(date, 8);
}

// Format a date to a standard display format
export function formatDate(dateString: string): string {
  return format(toGMT8(dateString), 'dd MMM yyyy');
}

// Format a date with time
export function formatDateTime(dateString: string): string {
  return format(toGMT8(dateString), 'dd MMM yyyy, h:mm a');
}

// Get relative time for display (e.g., "2 hours ago")
export function getRelativeTime(dateString: string): string {
  const date = toGMT8(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffDays > 0) {
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  }
  if (diffHours > 0) {
    return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  }
  if (diffMins > 0) {
    return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  }
  return 'Just now';
}

// Format currency
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-MY', {
    style: 'currency',
    currency: 'MYR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

// Calculate member status based on dates
export function calculateMemberStatus(startDate: string, endDate: string): MemberStatus {
  const now = new Date();
  const end = toGMT8(endDate);
  
  if (now > end) {
    // Check if within grace period (14 days)
    const gracePeriodEnd = new Date(end);
    gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 14);
    
    if (now <= gracePeriodEnd) {
      return 'grace';
    }
    return 'expired';
  }
  
  return 'active';
}

// Get color for member status
export function getMemberStatusColor(status: MemberStatus): string {
  switch (status) {
    case 'active':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'grace':
      return 'bg-amber-100 text-amber-800 border-amber-200';
    case 'expired':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'suspended':
      return 'bg-slate-100 text-slate-800 border-slate-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
}

// Validate NRIC format
export function validateNRIC(nric: string): boolean {
  // Basic validation - can be enhanced for specific country formats
  const nricRegex = /^[0-9]{6}-[0-9]{2}-[0-9]{4}$/;
  return nricRegex.test(nric);
}

// Format NRIC for display (mask middle digits)
export function formatNRIC(nric: string): string {
  if (!nric || nric.length < 14) return nric;
  
  const parts = nric.split('-');
  if (parts.length !== 3) return nric;
  
  return `${parts[0]}-XX-${parts[2]}`;
}

// Export data to CSV
export function exportToCSV(data: any[], filename: string) {
  if (!data || !data.length) {
    console.error('No data to export');
    return;
  }
  
  // Get headers from first item
  const headers = Object.keys(data[0]);
  
  // Convert data to CSV format
  const csvRows = [];
  csvRows.push(headers.join(','));
  
  for (const row of data) {
    const values = headers.map(header => {
      const value = row[header];
      // Handle special cases like objects, arrays, or values with commas
      if (value === null || value === undefined) {
        return '';
      }
      if (typeof value === 'object') {
        return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
      }
      if (typeof value === 'string' && value.includes(',')) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    });
    csvRows.push(values.join(','));
  }
  
  // Create and download CSV file
  const csvString = csvRows.join('\n');
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (navigator.msSaveBlob) {
    // For IE
    navigator.msSaveBlob(blob, filename);
  } else {
    // For other browsers
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

// Compress an image file
export const compressImage = async (
  file: File,
  maxWidth = 800,
  maxHeight = 800,
  quality = 0.8
): Promise<File> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        // Calculate new dimensions
        let width = img.width;
        let height = img.height;
        
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }
        
        // Create canvas and draw image
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        
        // Convert to file
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Canvas to Blob conversion failed'));
              return;
            }
            const newFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            resolve(newFile);
          },
          'image/jpeg',
          quality
        );
      };
      img.onerror = (error) => {
        reject(error);
      };
    };
    reader.onerror = (error) => {
      reject(error);
    };
  });
};