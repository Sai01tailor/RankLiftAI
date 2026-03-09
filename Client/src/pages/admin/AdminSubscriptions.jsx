/**
 * AdminSubscriptions.jsx – Subscription management admin view
 */
import { useState, useEffect } from 'react';
import { DollarSign, RefreshCcw, Save, Settings, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { adminAPI } from '../../api/services';

export default function AdminSubscriptions() {
  const [activeTab, setActiveTab] = useState('subscribers'); // 'subscribers' | 'plans'
  const [subs,    setSubs]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats,   setStats]   = useState({ revenue: 0, active: 0 });

  const [plansConfig, setPlansConfig] = useState(null);
  const [savingPlans, setSavingPlans] = useState(false);

  useEffect(() => {
    Promise.allSettled([
      adminAPI.getSubscriptions(),
      adminAPI.getStats(),
      adminAPI.getSubscriptionPlans()
    ]).then(([subRes, statsRes, planRes]) => {
      if (subRes.status === 'fulfilled')
        setSubs(subRes.value.data.data?.subscriptions || subRes.value.data.data || []);
      if (statsRes.status === 'fulfilled') {
        const d = statsRes.value.data.data || {};
        const rev = d?.revenue || d?.activity?.revenue || 0;
        setStats({ revenue: rev, active: d.activeSubscriptions || 0 });
      }
      if (planRes.status === 'fulfilled') {
        setPlansConfig(planRes.value.data.data);
      }
    }).finally(() => setLoading(false));
  }, []);

  const handleSavePlans = async () => {
    setSavingPlans(true);
    try {
      await adminAPI.updateSubscriptionPlans(plansConfig);
      toast.success("Plans updated successfully!");
    } catch (err) {
      toast.error("Failed to update plans.");
    } finally {
      setSavingPlans(false);
    }
  };

  const updatePlan = (planKey, field, value) => {
    setPlansConfig({
      ...plansConfig,
      [planKey]: { ...plansConfig[planKey], [field]: value }
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-black" style={{ fontFamily: 'Space Grotesk, sans-serif', color: 'var(--text-heading)' }}>
          Subscriptions & Plans
        </h1>
        <div className="flex bg-gray-100 rounded-lg p-1 dark:bg-gray-800">
          <button onClick={() => setActiveTab('subscribers')}
                  className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab === 'subscribers' ? 'bg-white shadow dark:bg-gray-700 text-black dark:text-white' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>
            <Users size={16} /> Subscribers
          </button>
          <button onClick={() => setActiveTab('plans')}
                  className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab === 'plans' ? 'bg-white shadow dark:bg-gray-700 text-black dark:text-white' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>
            <Settings size={16} /> Plan Config
          </button>
        </div>
      </div>

      {activeTab === 'subscribers' ? (
        <>
          {/* Summary */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { label: 'Total Revenue', value: `₹${stats.revenue.toLocaleString()}`, color: '#22c55e' },
              { label: 'Active Subs',   value: stats.active, color: '#3b82f6' },
              { label: 'Total Records', value: subs.length,  color: '#8b5cf6' },
            ].map(({ label, value, color }) => (
              <div key={label} className="stat-card">
                <p className="stat-value" style={{ color }}>{value}</p>
                <p className="stat-label">{label}</p>
              </div>
            ))}
          </div>

          {/* Table */}
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="jw-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Plan</th>
                    <th>Plan Price (₹)</th>
                    <th>Expires</th>
                    <th>Started</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={6} className="text-center py-8">Loading…</td></tr>
                  ) : subs.length === 0 ? (
                    <tr><td colSpan={6} className="text-center py-8" style={{ color: 'var(--text-muted)' }}>
                      No subscriptions yet.
                    </td></tr>
                  ) : subs.map((s) => (
                    <tr key={s._id}>
                      <td>
                        <p className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
                          {s.username || 'Unknown'}
                        </p>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{s.email}</p>
                      </td>
                      <td><span className="badge badge-yellow capitalize">{s.subscription?.plan || 'free'}</span></td>
                      <td className="font-semibold text-sm" style={{ color: '#22c55e' }}>
                        ₹{plansConfig?.[s.subscription?.plan]?.amountINR ? (plansConfig[s.subscription.plan].amountINR / 100).toLocaleString() : '—'}
                      </td>
                      <td className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {s.subscription?.expiresAt ? new Date(s.subscription.expiresAt).toLocaleDateString('en-IN') : '—'}
                      </td>
                      <td className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                        {s.createdAt ? new Date(s.createdAt).toLocaleDateString('en-IN') : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="space-y-6">
          <div className="flex justify-between items-center bg-[var(--bg-card)] p-4 rounded-xl shadow-sm border border-[var(--border-subtle)]">
            <div>
              <h2 className="font-bold text-lg" style={{ color: 'var(--text-heading)' }}>Plan Configurations</h2>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Changes are applied immediately to all new checkouts.</p>
            </div>
            <button onClick={handleSavePlans} disabled={savingPlans || !plansConfig} className="btn btn-primary gap-2">
              <Save size={16} /> {savingPlans ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>

          {loading ? (
            <p>Loading plans...</p>
          ) : plansConfig ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {Object.keys(plansConfig).map(planKey => {
                const plan = plansConfig[planKey];
                if (!plan) return null;
                return (
                  <div key={planKey} className="card p-5 space-y-4">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="font-bold text-lg capitalize" style={{ color: 'var(--text-heading)' }}>{plan.name} Plan</h3>
                    </div>
                    
                    <div>
                      <label className="label">Plan Display Name</label>
                      <input className="input w-full font-bold" value={plan.name} 
                             onChange={e => updatePlan(planKey, 'name', e.target.value)} />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="label">Amount (INR)</label>
                        <div className="relative">
                          <span className="absolute left-3 top-2.5 text-gray-500">₹</span>
                          <input type="number" className="input w-full pl-8" 
                                 value={plan.amountINR / 100} 
                                 onChange={e => updatePlan(planKey, 'amountINR', Math.max(0, parseInt(e.target.value || 0)) * 100)} />
                        </div>
                      </div>
                      <div>
                        <label className="label">Duration (Days)</label>
                        <input type="number" className="input w-full" 
                               value={plan.durationDays} 
                               onChange={e => updatePlan(planKey, 'durationDays', Math.max(1, parseInt(e.target.value || 0)))} />
                      </div>
                    </div>

                    <div>
                      <label className="label mb-1">Features Included</label>
                      <textarea className="input w-full text-sm leading-relaxed" 
                                rows={4} 
                                value={plan.features.join('\n')}
                                onChange={e => updatePlan(planKey, 'features', e.target.value.split('\n'))} />
                      <p className="text-xs text-gray-500 mt-1">One feature per line</p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-red-500">Error loading configuration.</p>
          )}
        </div>
      )}
    </div>
  );
}
