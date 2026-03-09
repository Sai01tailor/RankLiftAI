/**
 * Subscription.jsx – Subscription & pricing page with Razorpay checkout.
 * Displays 3 plan tiers: Basic, Premium, Ultimate.
 * Integrates Razorpay checkout on button click.
 */
import { useState, useEffect } from 'react';
import { CheckCircle2, Zap, Crown, Star } from 'lucide-react';
import toast from 'react-hot-toast';
import { paymentAPI } from '../../api/services';
import { useAuth } from '../../context/AuthContext';

const DEFAULT_PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    period: 'lifetime',
    icon: CheckCircle2,
    color: '#64748b',
    bg: '#f1f5f9',
    desc: 'Basic access to start your preparation',
    features: [
      '3 Mock Tests (Lifetime)',
      'Basic practice questions',
      'Community support',
    ],
    notIncluded: ['Full analytics dashboard', 'Unlimited Mock Tests', 'AI Explanations'],
  },
  {
    id: 'basic',
    name: 'Basic',
    price: 499,
    period: 'month',
    icon: Zap,
    color: '#3b82f6',
    bg: '#dbeafe',
    desc: 'Perfect for starting your JEE journey',
    features: [
      '50 mock tests per month',
      'Basic analytics dashboard',
      'Question bank (5,000 questions)',
      'OTP login',
      'Community support',
    ],
    notIncluded: ['AI-powered insights', 'Priority support', 'Full analytics'],
  },
  {
    id: 'premium',
    name: 'Premium',
    price: 999,
    period: 'month',
    icon: Star,
    color: '#f97316',
    bg: '#fff3e8',
    desc: 'The most popular choice for serious aspirants',
    popular: true,
    features: [
      'Unlimited mock tests',
      'Full analytics + time breakdown',
      'Complete question bank (15,000+)',
      'AI-powered weak topic detection',
      'Gemini study insights after each test',
      'Shareable scorecards',
      'Priority email support',
    ],
    notIncluded: [],
  }
];

export default function Subscription() {
  const { user } = useAuth();
  const [plans,    setPlans]    = useState(DEFAULT_PLANS);
  const [loading,  setLoading]  = useState(false);
  const [current,  setCurrent]  = useState(null); // current subscription data
  const [annual,   setAnnual]   = useState(false); // annual vs monthly toggle

  useEffect(() => {
    /* Fetch current subscription status */
    paymentAPI.getSubscription()
      .then(({ data }) => setCurrent(data.data))
      .catch(() => { /* graceful fail – user may be free */ });

    /* Fetch plans from server (override defaults if available) */
    paymentAPI.getPlans()
      .then(({ data }) => { if (data.data?.length) setPlans(data.data); })
      .catch(() => { /* use default plans */ });
  }, []);

  const handleBuy = async (planId, price) => {
    setLoading(planId);
    try {
      /* Step 1 – Create Razorpay order via backend */
      const { data } = await paymentAPI.createOrder(planId);
      const { orderId, amount, currency } = data.data;

      /* Step 2 – Open Razorpay checkout */
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_xxxx',
        amount, currency,
        name: 'JeeWallah',
        description: `${plans.find((p) => p.id === planId)?.name} Plan`,
        order_id: orderId,
        prefill: { name: user?.username, email: user?.email, contact: user?.phone },
        theme: { color: '#f97316' },
        handler: async (response) => {
          /* Step 3 – Verify payment on backend */
          try {
            await paymentAPI.verifyPayment({
              razorpay_order_id:   response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature:  response.razorpay_signature,
              planId,  // required by backend to calculate subscription expiry
            });
            toast.success('🎉 Subscription activated! Enjoy your plan.');
            /* Refresh subscription status */
            const sub = await paymentAPI.getSubscription();
            setCurrent(sub.data.data);
          } catch (_) {
            toast.error('Payment verification failed. Contact support.');
          }
        },
        modal: { ondismiss: () => setLoading(false) },
      };

      /* Razorpay script must be loaded (included in index.html or via CDN) */
      if (window.Razorpay) {
        const rzp = new window.Razorpay(options);
        rzp.open();
      } else {
        toast.error('Payment gateway not loaded. Please refresh.');
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not initiate payment.');
    } finally {
      setLoading(false);
    }
  };

  const discountPct = 20; // annual discount
  const getPlanPrice = (price) => annual ? Math.round(price * 12 * (1 - discountPct / 100)) : price;

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-black mb-2"
            style={{ fontFamily: 'Space Grotesk, sans-serif', color: 'var(--text-heading)' }}>
          Choose your plan
        </h1>
        <p className="text-sm mb-5" style={{ color: 'var(--text-muted)' }}>
          No hidden fees. Cancel anytime. 7-day refund guarantee.
        </p>

        {/* Annual / monthly toggle */}
        <div className="inline-flex items-center gap-3 p-1 rounded-xl"
             style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)' }}>
          <button
            onClick={() => setAnnual(false)}
            className="px-4 py-1.5 rounded-lg text-sm font-semibold transition-all"
            style={{
              background: !annual ? 'var(--bg-card)' : 'transparent',
              color: !annual ? 'var(--text-heading)' : 'var(--text-muted)',
              boxShadow: !annual ? 'var(--shadow-sm)' : 'none',
            }}
          >
            Monthly
          </button>
          <button
            onClick={() => setAnnual(true)}
            className="px-4 py-1.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-1.5"
            style={{
              background: annual ? 'var(--bg-card)' : 'transparent',
              color: annual ? 'var(--text-heading)' : 'var(--text-muted)',
              boxShadow: annual ? 'var(--shadow-sm)' : 'none',
            }}
          >
            Annual
            <span className="badge badge-green text-xs">Save {discountPct}%</span>
          </button>
        </div>
      </div>

      {/* Current subscription banner */}
      {current?.plan && (
        <div className="p-4 rounded-xl flex items-center gap-3"
             style={{ background: 'var(--accent-primary-light)', border: '1px solid var(--accent-primary)' }}>
          <CheckCircle2 size={18} style={{ color: 'var(--accent-primary)' }} />
          <div>
            <p className="font-semibold text-sm" style={{ color: 'var(--accent-primary)' }}>
              You're on the {current.plan} plan
            </p>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Renews on {new Date(current.expiresAt).toLocaleDateString('en-IN')}
            </p>
          </div>
        </div>
      )}

      {/* Plan cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 max-w-5xl mx-auto gap-5">
        {plans.map(({ id, name, price, icon: Icon, color, bg, desc, popular, features, notIncluded }) => {
          const isCurrent = (current?.plan?.toLowerCase() || 'free') === id.toLowerCase();
          return (
            <div
              key={id}
              className="card p-6 relative flex flex-col"
              style={{
                border: popular ? `2px solid ${color}` : '1px solid var(--border-subtle)',
                transform: popular ? 'scale(1.02)' : 'none',
              }}
            >
              {/* Popular badge */}
              {popular && (
                <div
                  className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-xs font-bold text-white"
                  style={{ background: color }}
                >
                  Most Popular
                </div>
              )}

              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                       style={{ background: bg }}>
                    <Icon size={18} style={{ color }} />
                  </div>
                  <h3 className="font-black text-lg" style={{ color: 'var(--text-heading)', fontFamily: 'Space Grotesk, sans-serif' }}>
                    {name}
                  </h3>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{desc}</p>
                </div>
              </div>

              {/* Price */}
              <div className="mb-5">
                <div className="flex items-end gap-1">
                  <span className="text-4xl font-black" style={{ fontFamily: 'Space Grotesk, sans-serif', color: 'var(--text-heading)' }}>
                    ₹{getPlanPrice(price)}
                  </span>
                  <span className="text-sm pb-1" style={{ color: 'var(--text-muted)' }}>
                    /{annual ? 'year' : 'month'}
                  </span>
                </div>
                {annual && (
                  <p className="text-xs mt-1" style={{ color: 'var(--accent-success)' }}>
                    Save ₹{Math.round(price * 12 * discountPct / 100)}/year
                  </p>
                )}
              </div>

              {/* Features */}
              <ul className="space-y-2 flex-1 mb-6 mt-4">
                {features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <CheckCircle2 size={14} className="mt-0.5 flex-shrink-0"
                                 style={{ color: 'var(--accent-success)' }} />
                    <span style={{ color: 'var(--text-secondary)' }}>{f}</span>
                  </li>
                ))}
                {notIncluded?.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm opacity-40">
                    <span className="w-3.5 mt-0.5 flex-shrink-0 text-center">✕</span>
                    <span style={{ color: 'var(--text-muted)', textDecoration: 'line-through' }}>{f}</span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              {isCurrent ? (
                <div className="btn w-full justify-center text-center" style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)', cursor: 'default' }}>
                  Current Plan ✓
                </div>
              ) : id === 'free' ? (
                <div className="btn w-full justify-center text-center opacity-50" style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)', cursor: 'default' }}>
                  Included
                </div>
              ) : (
                <button
                  onClick={() => handleBuy(id, getPlanPrice(price))}
                  disabled={loading === id}
                  className={`btn w-full justify-center ${popular ? 'shadow-md' : ''}`}
                  style={{
                    background: popular ? color : 'var(--bg-subtle)',
                    color: popular ? '#fff' : 'var(--text-primary)',
                    border: popular ? 'none' : '1px solid var(--border-default)',
                  }}
                >
                  {loading === id ? 'Processing…' : `Get ${name}`}
                </button>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-center text-xs" style={{ color: 'var(--text-muted)' }}>
        Payments secured by Razorpay. 7-day refund policy applies.
        All prices in INR and include GST.
      </p>
    </div>
  );
}
