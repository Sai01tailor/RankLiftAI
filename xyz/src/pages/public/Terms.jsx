/**
 * Terms.jsx – Terms & Policy page
 */
import { useSite } from '../../context/SiteContext';

export default function Terms() {
  const { settings } = useSite();
  const sections = [
    {
      title: '1. Acceptance of Terms',
      content: `By accessing or using JeeWallah ("the Platform"), you agree to be bound by these Terms of Service. 
      If you do not agree with any part of these terms, you may not use our services.`,
    },
    {
      title: '2. Account Registration',
      content: `You must provide accurate and complete information when creating an account. You are responsible 
      for maintaining the confidentiality of your password and for all activities that occur under your account.`,
    },
    {
      title: '3. Intellectual Property',
      content: `All content on JeeWallah — including questions, explanations, interfaces, graphics, and 
      software — is the intellectual property of JeeWallah Technologies Pvt. Ltd. Reproduction or 
      redistribution without written consent is strictly prohibited.`,
    },
    {
      title: '4. Subscription & Payments',
      content: `Subscriptions are billed in advance on a monthly or annual basis. Payments are processed 
      securely via Razorpay. Refunds are available within 7 days of purchase if you haven't started any mock tests.`,
    },
    {
      title: '5. Acceptable Use',
      content: `You agree not to use the Platform to share answers publicly, reverse-engineer the CBT interface,
      use automated tools to collect content, or engage in any activity that could harm other users or the Platform.`,
    },
    {
      title: '6. Data & Privacy',
      content: `We collect only the data necessary to provide our service (performance data, answers, time spent). 
      We never sell your personal data to third parties. AI-generated insights are computed on our servers and 
      are never shared with third parties without your consent.`,
    },
    {
      title: '7. Limitation of Liability',
      content: `JeeWallah is an educational tool. We do not guarantee exam results or rank improvements. 
      Our liability is limited to the amount you paid for your subscription in the preceding month.`,
    },
    {
      title: '8. Changes to Terms',
      content: `We may update these terms at any time. We will notify you of significant changes via email. 
      Your continued use of the Platform after changes constitutes acceptance of the new terms.`,
    },
  ];

  return (
    <div style={{ background: 'var(--bg-base)', paddingTop: '4rem' }}>
      {/* Hero */}
      <section className="py-14" style={{ background: 'var(--bg-subtle)' }}>
        <div className="page-container">
          <p className="text-sm font-bold uppercase tracking-widest mb-2"
             style={{ color: 'var(--accent-primary)' }}>Legal</p>
          <h1 className="text-4xl font-black mb-3"
              style={{ fontFamily: 'Space Grotesk, sans-serif', color: 'var(--text-heading)' }}>
            Terms & Privacy Policy
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Last updated: February 2026</p>
        </div>
      </section>

      {/* Content */}
      <section className="py-16">
        <div className="page-container max-w-3xl">
          <div className="space-y-8">
            {settings.termsAndConditions ? (
              <div 
                className="text-base leading-relaxed space-y-4" 
                style={{ color: 'var(--text-secondary)' }}
                dangerouslySetInnerHTML={{ __html: settings.termsAndConditions.replace(/\n/g, '<br/>') }} 
              />
            ) : (
              sections.map(({ title, content }) => (
                <div key={title}>
                  <h2 className="text-lg font-bold mb-3" style={{ color: 'var(--text-heading)' }}>
                    {title}
                  </h2>
                  <p className="text-base leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                    {content}
                  </p>
                </div>
              ))
            )}
          </div>

          <div className="mt-12 p-6 rounded-xl" style={{ background: 'var(--accent-primary-light)' }}>
            <p className="text-sm font-semibold mb-1" style={{ color: 'var(--accent-primary)' }}>
              Questions about our terms?
            </p>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Email us at <strong>legal@jeewallah.in</strong> and we'll respond within 48 hours.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
