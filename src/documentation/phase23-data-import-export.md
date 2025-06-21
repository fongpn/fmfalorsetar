# Phase 23: Data Import/Export System

## Overview
This phase implements a CSV template download functionality for the Data Management module, laying the groundwork for a comprehensive data import/export system. The implementation focuses on providing users with properly formatted CSV templates that match the expected database schema.

## Key Features Implemented

### 1. CSV Template Download
- **Member Template**: Generates a CSV file with the correct headers for member imports
- **Proper Column Headers**: Includes Member ID, Full Name, IC/Passport Number, and Phone Number
- **File Generation**: Creates a downloadable CSV file directly in the browser
- **User Guidance**: Clear instructions on required and optional fields

### 2. Documentation Framework
- **Import Process Documentation**: Explains the current state and future plans
- **Data Validation Guidelines**: Outlines validation requirements for imported data
- **Best Practices**: Provides guidance on data preparation and import procedures

## Current Implementation

### Template Download
The system now provides downloadable CSV templates with the correct headers for data imports:
```csv
Member ID,Full Name,IC/Passport Number,Phone Number,Membership Plan Name,Membership Start Date,Membership End Date
0001,John Doe,123456-78-9012,012-3456789,Monthly,2025-06-01,2025-07-01
```

This template ensures users understand the expected format and required fields for member data imports, including membership details.

### Membership Plan Integration
The template now includes fields for initial membership setup:

- **Membership Plan Name**: Name of an existing membership plan (e.g., "Monthly", "Annual")
- **Membership Start Date**: When the membership begins (YYYY-MM-DD format)
- **Membership End Date**: When the membership expires (YYYY-MM-DD format)

During import, the system will:
1. Look up the membership plan by name
2. Create a membership record with the specified dates
3. Calculate the appropriate status based on the dates

### Import Process (Current State)
The current implementation includes a placeholder for file uploads but does not yet process the imported data. When a file is uploaded, it is received by the system but not yet parsed or validated.

## Planned Future Enhancements

### Multi-Step Import Process
A robust import process would include the following steps:

1. **File Upload and Parsing**: 
   - Parse CSV into structured data
   - Validate file format and basic structure

2. **Data Preview**:
   - Display parsed data in a table format
   - Allow users to review before committing to database

3. **Validation and Error Highlighting**:
   - Validate each field against business rules
   - Highlight errors and provide specific feedback
   - Check for duplicates and data integrity issues

4. **Manual Correction/Filtering**:
   - Allow editing directly in the preview table
   - Provide options to filter out problematic records
   - Support column mapping for mismatched headers

5. **Confirmation and Processing**:
   - Final review step before database insertion
   - Progress indicators during processing
   - Summary report of successful and failed imports

### Data Validation Rules
Future implementation will include validation for:

- **Member ID**: Unique, follows the correct format (4-digit number)
- **Full Name**: Required, proper formatting (no special characters)
- **IC/Passport Number**: Optional, format validation based on country
- **Phone Number**: Optional, format validation (proper phone number format)
- **Membership Plan Name**: Must match an existing plan in the system
- **Membership Start Date**: Valid date format (YYYY-MM-DD)
- **Membership End Date**: Valid date format, must be after start date
- **Logical Validation**: End date must be consistent with plan duration

## Technical Implementation

### Template Generation
```typescript
const generateCsvTemplate = (headers: string[]): string => {
  return headers.join(',') + '\n';
};

const downloadCsv = (csvContent: string, filename: string): void => {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
```

### Future CSV Parsing
```typescript
// Planned implementation
const parseCsvFile = async (file: File): Promise<{data: any[], errors: any[]}> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const csv = event.target?.result as string;
      const lines = csv.split('\n');
      const headers = lines[0].split(',');
      const errors = [];
      
      const data = lines.slice(1).map(line => {
        if (!line.trim()) return null;
        const values = line.split(',');
        const entry: Record<string, string> = {};
        const rowErrors = [];
        
        headers.forEach((header, index) => {
          entry[header.trim()] = values[index]?.trim() || '';
          
          // Basic validation
          if (header.trim() === 'Full Name' && !values[index]?.trim()) {
            rowErrors.push('Full Name is required');
          }
          
          if (header.trim() === 'Membership Plan Name' && values[index]?.trim()) {
            // In the full implementation, we would check if this plan exists
          }
        });
        
        if (rowErrors.length > 0) {
          errors.push({
            row: entry,
            errors: rowErrors
          });
        }
        
        return entry;
      }).filter(Boolean);
      
      resolve({
        data: data,
        errors: errors
      });
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    
    reader.readAsText(file);
  });
};
```

## User Experience Considerations

### Template Download
- **Immediate Feedback**: Download starts immediately after button click
- **Proper Naming**: Files named descriptively (e.g., "members_template.csv")
- **Clear Headers**: Column names match exactly what the system expects

### Future Import Experience
- **Drag and Drop**: Intuitive file upload via drag and drop or file browser
- **Multi-Step Process**:
  1. Upload CSV file
  2. Preview data in tabular format
  3. Review validation errors and warnings
  4. Make corrections directly in the interface
  5. Confirm import of valid records
- **Intelligent Validation**:
  - Membership plan name matching with existing plans
  - Date format and logical validation
  - Required field validation
  - Duplicate detection
- **Interactive Preview**: Data table with inline editing capabilities
- **Selective Import**: Option to exclude specific records from import

## Business Benefits

### Data Integrity
- **Standardized Format**: Templates ensure data follows the expected structure
- **Validation Rules**: Prevent invalid data from entering the system
- **Error Prevention**: Catch issues before they affect the database

### Operational Efficiency
- **Bulk Operations**: Process multiple records simultaneously
- **Time Savings**: Reduce manual data entry
- **Error Reduction**: Minimize human error in data entry

### Data Management
- **Data Migration**: Facilitate moving data between systems
- **Backup and Restore**: Support for exporting and importing system data
- **Reporting**: Export capabilities for external analysis

## Processing Membership Data

When importing members with membership details, the system will:

1. **Create Member Records**: Insert basic member information
2. **Look Up Membership Plans**: Find the plan ID based on the provided plan name
3. **Calculate Dates**: Validate and process the provided dates
4. **Create Membership Records**: Link members to their plans with appropriate dates
5. **Generate Transactions**: Create financial records for membership purchases

This approach allows for a complete member onboarding process through a single CSV import, significantly reducing manual data entry for bulk member registration.