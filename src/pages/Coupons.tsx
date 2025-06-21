import React, { useState } from 'react';
import { Layout } from '../components/Layout/Layout';
import { NewCouponTemplateModal } from '../components/Coupons/NewCouponTemplateModal';
import { SellCouponModal } from '../components/Coupons/SellCouponModal';
import { Plus, Search, Ticket, Calendar, Users, DollarSign, Trash2, Edit } from 'lucide-react';
import { supabase } from '../lib/supabase';

export function Coupons() {
  const [activeTab, setActiveTab] = useState<'templates' | 'sold'>('templates');
  const [searchQuery, setSearchQuery] = useState('');
  const [templates, setTemplates] = useState<any[]>([]);
  const [soldCoupons, setSoldCoupons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNewTemplateModal, setShowNewTemplateModal] = useState(false);
  const [showSellCouponModal, setShowSellCouponModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; template: any | null }>({
    show: false,
    template: null
  });

  React.useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [templatesResult, soldCouponsResult] = await Promise.all([
        supabase.from('coupon_templates').select('*').eq('is_active', true).order('name'),
        supabase.from('sold_coupons').select(`
          *,
          template:coupon_templates(name),
          member:members(full_name)
        `).order('purchase_date', { ascending: false })
      ]);

      if (templatesResult.error) throw templatesResult.error;
      if (soldCouponsResult.error) throw soldCouponsResult.error;

      setTemplates(templatesResult.data || []);
      setSoldCoupons(soldCouponsResult.data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTemplate = async (template: any) => {
    try {
      setLoading(true);
      setError(null);
      
      // Check if template has any sold coupons
      const { data: soldCoupons, error: checkError } = await supabase
        .from('sold_coupons')
        .select('id')
        .eq('template_id', template.id)
        .limit(1);

      if (checkError) throw checkError;

      if (soldCoupons && soldCoupons.length > 0) {
        // Soft delete by setting is_active to false
        const { error: updateError } = await supabase
          .from('coupon_templates')
          .update({ 
            is_active: false,
            updated_at: new Date().toISOString()
          })
          .eq('id', template.id);

        if (updateError) throw updateError;
      } else {
        // Hard delete if no sold coupons exist
        const { error: deleteError } = await supabase
          .from('coupon_templates')
          .delete()
          .eq('id', template.id);

        if (deleteError) throw deleteError;
      }

      await fetchData();
      setDeleteConfirm({ show: false, template: null });
    } catch (err: any) {
      setError(`Failed to delete template: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = (template: any) => {
    setDeleteConfirm({ show: true, template });
  };

  if (loading) {
    return (
      <Layout title="Coupons" subtitle="Manage coupon templates and track sold coupons">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
        </div>
      </Layout>
    );
  }
  return (
    <Layout title="Coupons" subtitle="Manage coupon templates and track sold coupons">
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center space-y-4 lg:space-y-0">
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search coupons..."
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
          </div>
          
          <div className="flex space-x-3">
            <button 
              onClick={() => setShowNewTemplateModal(true)}
              className="flex items-center px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Template
            </button>
            <button 
              onClick={() => setShowSellCouponModal(true)}
              className="flex items-center px-4 py-2 text-sm font-medium text-orange-700 bg-orange-50 border border-orange-200 rounded-lg hover:bg-orange-100"
            >
              <Ticket className="h-4 w-4 mr-2" />
              Sell Coupon
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-lg border border-gray-200 p-1">
          <div className="flex space-x-1">
            <button
              onClick={() => setActiveTab('templates')}
              className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'templates'
                  ? 'bg-orange-100 text-orange-700'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              Templates ({templates.length})
            </button>
            <button
              onClick={() => setActiveTab('sold')}
              className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'sold'
                  ? 'bg-orange-100 text-orange-700'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              Sold Coupons ({soldCoupons.length})
            </button>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-600">{error}</p>
            <button 
              onClick={fetchData}
              className="mt-2 text-sm text-red-700 hover:text-red-900 underline"
            >
              Try again
            </button>
          </div>
        )}

        {/* Templates Tab */}
        {activeTab === 'templates' && (
          <>
            {templates.length === 0 ? (
              <div className="text-center py-12">
                <Ticket className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No coupon templates found</p>
                <button className="mt-4 text-orange-600 hover:text-orange-700 underline">
                  Create your first coupon template
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {templates.map((template) => (
                  <div key={template.id} className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow relative group">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center">
                        <div className="p-2 bg-purple-100 rounded-lg">
                          <Ticket className="h-6 w-6 text-purple-600" />
                        </div>
                        <div className="ml-3">
                          <h3 className="text-lg font-semibold text-gray-900">{template.name}</h3>
                          <p className="text-2xl font-bold text-purple-600">RM{template.price}</p>
                        </div>
                      </div>
                      
                      {/* Action buttons - shown on hover */}
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex space-x-2">
                        <button
                          onClick={() => confirmDelete(template)}
                          className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
                          title="Delete template"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center text-sm text-gray-600">
                        <Users className="h-4 w-4 mr-2" />
                        <span>{template.max_entries} entries</span>
                      </div>

                      <div className="flex items-center text-sm text-gray-600">
                        <Calendar className="h-4 w-4 mr-2" />
                        <span>{template.duration_days} days validity</span>
                      </div>

                      <div className="pt-3 border-t border-gray-200">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          template.is_active 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {template.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Sold Coupons Tab */}
        {activeTab === 'sold' && (
          <>
            {soldCoupons.length === 0 ? (
              <div className="text-center py-12">
                <Ticket className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No sold coupons found</p>
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Coupon
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Member
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Entries
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Expiry
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {soldCoupons.map((coupon) => (
                        <tr key={coupon.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">{coupon.code}</div>
                              <div className="text-sm text-gray-500">{coupon.template?.name}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{coupon.member?.full_name || 'No member'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{coupon.entries_remaining} remaining</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{new Date(coupon.expiry_date).toLocaleDateString()}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              coupon.entries_remaining > 0 && new Date(coupon.expiry_date) > new Date()
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {coupon.entries_remaining > 0 && new Date(coupon.expiry_date) > new Date() ? 'Active' : 'Expired'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}

        {/* Modals */}
        <NewCouponTemplateModal
          isOpen={showNewTemplateModal}
          onClose={() => setShowNewTemplateModal(false)}
          onSuccess={() => {
            fetchData();
            setShowNewTemplateModal(false);
          }}
        />

        <SellCouponModal
          isOpen={showSellCouponModal}
          onClose={() => setShowSellCouponModal(false)}
          onSuccess={() => {
            fetchData();
            setShowSellCouponModal(false);
          }}
        />

        {/* Delete Confirmation Modal */}
        {deleteConfirm.show && deleteConfirm.template && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 bg-red-100 rounded-full">
                  <Trash2 className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Delete Coupon Template</h3>
                  <p className="text-sm text-gray-600">This action cannot be undone</p>
                </div>
              </div>
              
              <div className="mb-6">
                <p className="text-gray-700 mb-2">
                  Are you sure you want to delete the template "{deleteConfirm.template.name}"?
                </p>
                <div className="bg-amber-50 border border-amber-200 rounded-md p-3">
                  <p className="text-sm text-amber-700">
                    <strong>Note:</strong> If this template has been used to sell coupons, it will be deactivated instead of deleted to preserve transaction history.
                  </p>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setDeleteConfirm({ show: false, template: null })}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeleteTemplate(deleteConfirm.template)}
                  disabled={loading}
                  className="flex items-center px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50"
                >
                  {loading && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>}
                  {loading ? 'Deleting...' : 'Delete Template'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}