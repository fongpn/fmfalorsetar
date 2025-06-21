import React, { useState, useEffect } from 'react';
import { Layout } from '../components/Layout/Layout';
import { memberService } from '../services/memberService';
import { MembershipPlan } from '../lib/supabase';
import { Plus, Edit, Trash2, CreditCard, Calendar, DollarSign, Gift, Save, X } from 'lucide-react';

interface PlanFormData {
  name: string;
  price: number;
  duration_months: number;
  has_registration_fee: boolean;
  free_months_on_signup: number;
  is_active: boolean;
}

export function MembershipPlans() {
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<MembershipPlan | null>(null);
  const [formData, setFormData] = useState<PlanFormData>({
    name: '',
    price: 0,
    duration_months: 1,
    has_registration_fee: false,
    free_months_on_signup: 0,
    is_active: true
  });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await memberService.getMembershipPlans();
      setPlans(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      price: 0,
      duration_months: 1,
      has_registration_fee: false,
      free_months_on_signup: 0,
      is_active: true
    });
    setEditingPlan(null);
    setFormError('');
  };

  const handleNewPlan = () => {
    resetForm();
    setShowModal(true);
  };

  const handleEditPlan = (plan: MembershipPlan) => {
    setFormData({
      name: plan.name,
      price: plan.price,
      duration_months: plan.duration_months,
      has_registration_fee: plan.has_registration_fee,
      free_months_on_signup: plan.free_months_on_signup,
      is_active: plan.is_active
    });
    setEditingPlan(plan);
    setShowModal(true);
  };

  const handleDeletePlan = async (plan: MembershipPlan) => {
    if (!confirm(`Are you sure you want to delete the "${plan.name}" plan? This action cannot be undone.`)) {
      return;
    }

    try {
      await memberService.deleteMembershipPlan(plan.id);
      await fetchPlans();
    } catch (err: any) {
      setError(`Failed to delete plan: ${err.message}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError('');

    try {
      if (editingPlan) {
        await memberService.updateMembershipPlan(editingPlan.id, formData);
      } else {
        await memberService.createMembershipPlan(formData);
      }
      
      await fetchPlans();
      setShowModal(false);
      resetForm();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    resetForm();
  };

  if (loading) {
    return (
      <Layout title="Membership Plans" subtitle="Manage gym membership plans and pricing">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Membership Plans" subtitle="Manage gym membership plans and pricing">
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Available Plans</h2>
            <p className="text-sm text-gray-600">Configure membership plans and pricing</p>
          </div>
          <button 
            onClick={handleNewPlan}
            className="flex items-center px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Plan
          </button>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-600">{error}</p>
            <button 
              onClick={fetchPlans}
              className="mt-2 text-sm text-red-700 hover:text-red-900 underline"
            >
              Try again
            </button>
          </div>
        )}

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <div key={plan.id} className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <CreditCard className="h-6 w-6 text-orange-600" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-lg font-semibold text-gray-900">{plan.name}</h3>
                    <p className="text-2xl font-bold text-orange-600">RM{plan.price}</p>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button 
                    onClick={() => handleEditPlan(plan)}
                    className="text-gray-400 hover:text-blue-600 transition-colors"
                    title="Edit plan"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button 
                    onClick={() => handleDeletePlan(plan)}
                    className="text-gray-400 hover:text-red-600 transition-colors"
                    title="Delete plan"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center text-sm text-gray-600">
                  <Calendar className="h-4 w-4 mr-2" />
                  <span>{plan.duration_months} month{plan.duration_months !== 1 ? 's' : ''}</span>
                </div>

                {plan.free_months_on_signup > 0 && (
                  <div className="flex items-center text-sm text-green-600">
                    <Gift className="h-4 w-4 mr-2" />
                    <span>+{plan.free_months_on_signup} free month{plan.free_months_on_signup !== 1 ? 's' : ''}</span>
                  </div>
                )}

                {plan.has_registration_fee && (
                  <div className="flex items-center text-sm text-amber-600">
                    <DollarSign className="h-4 w-4 mr-2" />
                    <span>Registration fee applies</span>
                  </div>
                )}

                <div className="pt-3 border-t border-gray-200">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    plan.is_active 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {plan.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {plans.length === 0 && !error && (
          <div className="text-center py-12">
            <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No membership plans found</p>
            <button 
              onClick={handleNewPlan}
              className="mt-4 text-orange-600 hover:text-orange-700 underline"
            >
              Create your first membership plan
            </button>
          </div>
        )}

        {/* Plan Form Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b">
                <h2 className="text-xl font-semibold text-gray-900">
                  {editingPlan ? 'Edit Plan' : 'New Membership Plan'}
                </h2>
                <button
                  onClick={handleCloseModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                {formError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-sm text-red-600">{formError}</p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Plan Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
                    placeholder="e.g., Monthly, Annual"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Price (RM) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.price}
                      onChange={(e) => setFormData(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
                      placeholder="45.00"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Duration (Months) *
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formData.duration_months}
                      onChange={(e) => setFormData(prev => ({ ...prev, duration_months: parseInt(e.target.value) || 1 }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
                      placeholder="1"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Free Months on Signup
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.free_months_on_signup}
                    onChange={(e) => setFormData(prev => ({ ...prev, free_months_on_signup: parseInt(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
                    placeholder="0"
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="has_registration_fee"
                      checked={formData.has_registration_fee}
                      onChange={(e) => setFormData(prev => ({ ...prev, has_registration_fee: e.target.checked }))}
                      className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                    />
                    <label htmlFor="has_registration_fee" className="ml-2 text-sm text-gray-700">
                      Requires registration fee
                    </label>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="is_active"
                      checked={formData.is_active}
                      onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                      className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                    />
                    <label htmlFor="is_active" className="ml-2 text-sm text-gray-700">
                      Active plan (available for purchase)
                    </label>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={formLoading}
                    className="flex items-center px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-md hover:bg-orange-700 disabled:opacity-50"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {formLoading ? 'Saving...' : editingPlan ? 'Update Plan' : 'Create Plan'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}