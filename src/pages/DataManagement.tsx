import React, { useState } from 'react';
import { Layout } from '../components/Layout/Layout';
import { Download, Upload, Database, FileText, Calendar, AlertTriangle, CheckCircle } from 'lucide-react';

export function DataManagement() {
  const [activeTab, setActiveTab] = useState<'export' | 'import' | 'backup'>('export');
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [uploadMessage, setUploadMessage] = useState('');
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleDownloadMemberTemplate = () => {
    // Define CSV headers
    const headers = ['Member ID', 'Full Name', 'IC/Passport Number', 'Phone Number'];
    
    // Create CSV content
    const csvContent = headers.join(',') + '\n';
    
    // Create a blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'members_template.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    // Here we would normally process the file
    // For now, just show a success message
    setUploadStatus('success');
    setUploadMessage(`File "${file.name}" received. In a future update, you'll be able to preview and validate this data before importing.`);
    
    // Reset the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  const exportOptions = [
    {
      id: 'members',
      title: 'Members Data',
      description: 'Export all member information and membership history',
      icon: FileText,
      formats: ['CSV', 'Excel']
    },
    {
      id: 'transactions',
      title: 'Financial Transactions',
      description: 'Export transaction history and revenue data',
      icon: Database,
      formats: ['CSV', 'Excel', 'PDF']
    },
    {
      id: 'checkins',
      title: 'Check-in Records',
      description: 'Export member check-in and access logs',
      icon: Calendar,
      formats: ['CSV', 'Excel']
    },
    {
      id: 'inventory',
      title: 'Inventory Data',
      description: 'Export product and stock movement data',
      icon: Database,
      formats: ['CSV', 'Excel']
    }
  ];

  return (
    <Layout title="Data Management" subtitle="Import, export, and backup system data">
      <div className="space-y-6">
        {/* Tab Navigation */}
        <div className="bg-white rounded-lg border border-gray-200 p-1">
          <div className="flex space-x-1">
            <button
              onClick={() => setActiveTab('export')}
              className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'export'
                  ? 'bg-orange-100 text-orange-700'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              Export Data
            </button>
            <button
              onClick={() => setActiveTab('import')}
              className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'import'
                  ? 'bg-orange-100 text-orange-700'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              Import Data
            </button>
            <button
              onClick={() => setActiveTab('backup')}
              className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'backup'
                  ? 'bg-orange-100 text-orange-700'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              Backup & Restore
            </button>
          </div>
        </div>

        {/* Export Tab */}
        {activeTab === 'export' && (
          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center">
                <Download className="h-5 w-5 text-blue-600 mr-2" />
                <div>
                  <h3 className="text-sm font-medium text-blue-900">Data Export</h3>
                  <p className="text-sm text-blue-700">Export your data in various formats for reporting and analysis.</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {exportOptions.map((option) => (
                <div key={option.id} className="bg-white rounded-lg border border-gray-200 p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center">
                      <div className="p-2 bg-gray-100 rounded-lg">
                        <option.icon className="h-6 w-6 text-gray-600" />
                      </div>
                      <div className="ml-3">
                        <h3 className="text-lg font-semibold text-gray-900">{option.title}</h3>
                        <p className="text-sm text-gray-600">{option.description}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Date Range
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="date"
                          className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-orange-500 focus:border-orange-500"
                        />
                        <input
                          type="date"
                          className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-orange-500 focus:border-orange-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Format
                      </label>
                      <select className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-orange-500 focus:border-orange-500">
                        {option.formats.map((format) => (
                          <option key={format} value={format.toLowerCase()}>
                            {format}
                          </option>
                        ))}
                      </select>
                    </div>

                    <button className="w-full flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-md hover:bg-orange-700">
                      <Download className="h-4 w-4 mr-2" />
                      Export Data
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Import Tab */}
        {activeTab === 'import' && (
          <div className="space-y-6">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-center">
                <AlertTriangle className="h-5 w-5 text-amber-600 mr-2" />
                <div>
                  <h3 className="text-sm font-medium text-amber-900">Important Notice</h3>
                  <p className="text-sm text-amber-700">Data imports will modify your database. Please ensure you have a backup before proceeding.</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Import Members</h3>
              <p className="text-sm text-gray-600 mb-6">
                Upload a CSV file with member data. The file should include columns for name, email, phone, and member ID.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select CSV File
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      accept=".csv"
                      className="hidden"
                    />
                    {uploadStatus === 'idle' ? (
                      <>
                        <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-600">
                          Drag and drop your CSV file here, or{' '}
                          <button 
                            type="button"
                            onClick={handleBrowseClick}
                            className="text-orange-600 hover:text-orange-700 underline"
                          >
                            browse to upload
                          </button>
                        </p>
                      </>
                    ) : uploadStatus === 'success' ? (
                      <div className="flex flex-col items-center">
                        <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                        <p className="text-sm text-green-600">{uploadMessage}</p>
                        <button
                          type="button"
                          onClick={() => setUploadStatus('idle')}
                          className="mt-3 text-sm text-orange-600 hover:text-orange-700 underline"
                        >
                          Upload another file
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center">
                        <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-2" />
                        <p className="text-sm text-red-600">{uploadMessage}</p>
                        <button
                          type="button"
                          onClick={() => setUploadStatus('idle')}
                          className="mt-3 text-sm text-orange-600 hover:text-orange-700 underline"
                        >
                          Try again
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <button 
                    onClick={handleDownloadMemberTemplate}
                    className="flex items-center px-4 py-2 text-sm font-medium text-orange-700 bg-orange-50 border border-orange-200 rounded-md hover:bg-orange-100"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download Template
                  </button>
                  <button 
                    className="flex items-center px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-md hover:bg-orange-700"
                    disabled={uploadStatus !== 'success'}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Import Data
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Backup Tab */}
        {activeTab === 'backup' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center mb-4">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Database className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-lg font-semibold text-gray-900">Create Backup</h3>
                    <p className="text-sm text-gray-600">Generate a complete backup of your system data</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="flex items-center">
                      <input type="checkbox" className="rounded border-gray-300 text-orange-600 focus:ring-orange-500" defaultChecked />
                      <span className="ml-2 text-sm text-gray-700">Include member data</span>
                    </label>
                  </div>
                  <div>
                    <label className="flex items-center">
                      <input type="checkbox" className="rounded border-gray-300 text-orange-600 focus:ring-orange-500" defaultChecked />
                      <span className="ml-2 text-sm text-gray-700">Include financial transactions</span>
                    </label>
                  </div>
                  <div>
                    <label className="flex items-center">
                      <input type="checkbox" className="rounded border-gray-300 text-orange-600 focus:ring-orange-500" defaultChecked />
                      <span className="ml-2 text-sm text-gray-700">Include system settings</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center mb-4">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Upload className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-lg font-semibold text-gray-900">Restore Backup</h3>
                    <p className="text-sm text-gray-600">Restore your system from a previous backup</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Backup File
                    </label>
                    <input
                      type="file"
                      accept=".sql,.zip"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-orange-500 focus:border-orange-500"
                    />
                  </div>

                  <div className="bg-red-50 border border-red-200 rounded-md p-3">
                    <div className="flex items-center">
                      <AlertTriangle className="h-4 w-4 text-red-600 mr-2" />
                      <p className="text-sm text-red-700">
                        This will overwrite all current data. This action cannot be undone.
                      </p>
                    </div>
                  </div>

                  <button className="w-full flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700">
                    <Upload className="h-4 w-4 mr-2" />
                    Restore Backup
                  </button>
                </div>
              </div>
            </div>

            {/* Recent Backups */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Backups</h3>
              <div className="text-center py-8">
                <p className="text-gray-500">No backups found</p>
                <p className="text-sm text-gray-400 mt-1">Create your first backup to see it here</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}