import React, { useState, useEffect } from 'react';
import { Layout } from '../components/Layout/Layout';
import { memberService } from '../services/memberService';
import { MembershipPlan } from '../lib/supabase';
import { Plus, Edit, Trash2, CreditCard, Calendar, DollarSign, Gift } from 'lucide-react';

export function MembershipPlans() {
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
          <button className="flex items-center px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700">
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
                  <button className="text-gray-400 hover:text-gray-600">
                    <Edit className="h-4 w-4" />
                  </button>
                  <button className="text-red-400 hover:text-red-600">
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
            <button className="mt-4 text-orange-600 hover:text-orange-700 underline">
              Create your first membership plan
            </button>
          </div>
        )}
      </div>
    </Layout>
  );
}