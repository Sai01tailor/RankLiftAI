/**
 * Footer.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Public-facing footer shown on all public pages.
 * Responsive 4-column grid on desktop → stacked on mobile.
 */
import { Link } from 'react-router-dom';
import { Zap, Twitter, Linkedin, Instagram, Youtube, Sparkles } from 'lucide-react';
import { useSite } from '../context/SiteContext';

const LINKS = {
  Product: [
    { label: 'Mock Tests',    to: '/tests' },
    { label: 'Problem Set',  to: '/problems' },
    { label: 'Leaderboard',  to: '/leaderboard' },
    { label: 'Subscription', to: '/subscription' },
  ],
  Company: [
    { label: 'About Us',  to: '/about' },
    { label: 'Contact',   to: '/contact' },
  ],
  Legal: [
    { label: 'Terms & Policy', to: '/terms' },
  ],
};

const SOCIALS = [
  { icon: Twitter,   href: '#', label: 'Twitter' },
  { icon: Instagram, href: '#', label: 'Instagram' },
  { icon: Youtube,   href: '#', label: 'YouTube' },
  { icon: Linkedin,  href: '#', label: 'LinkedIn' },
];

export default function Footer() {
  const { settings } = useSite();

  return (
    <footer className="relative pt-12" style={{ background: 'var(--bg-subtle)', borderTop: '1px solid var(--border-subtle)' }}>
      <div className="page-container py-16 relative z-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-12">

          {/* Brand column */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-3 mb-6">
              {settings.logoUrl ? (
                  <img src={settings.logoUrl} alt={settings.siteName} className="w-10 h-10 object-contain rounded-xl shadow-sm" />
              ) : (
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-white text-lg shadow-sm"
                       style={{ background: 'var(--gradient-brand)' }}>
                    {settings.siteName.charAt(0).toUpperCase()}
                  </div>
              )}
              <span className="font-extrabold text-xl tracking-tight" style={{ fontFamily: 'Space Grotesk, sans-serif', color: 'var(--text-heading)' }}>
                {settings.siteName}
              </span>
            </div>
            <p className="text-sm leading-relaxed mb-8 max-w-sm" style={{ color: 'var(--text-secondary)' }}>
              India's smartest JEE preparation platform. AI-powered mock tests,
              deep analytics, and a pixel-perfect NTA CBT interface — so you practice
              exactly the way you'll be tested.
            </p>
            {/* Social icons */}
            <div className="flex items-center gap-4">
              {SOCIALS.map(({ icon: Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  className="w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 hover:-translate-y-1"
                  style={{
                    background: 'var(--bg-base)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-muted)',
                  }}
                  onMouseEnter={(e) => { 
                    e.currentTarget.style.background = 'var(--accent-primary-light)'; 
                    e.currentTarget.style.borderColor = 'var(--accent-primary-light)';
                    e.currentTarget.style.color = 'var(--accent-primary)'; 
                    e.currentTarget.style.boxShadow = '0 4px 12px var(--accent-primary-light)';
                  }}
                  onMouseLeave={(e) => { 
                    e.currentTarget.style.background = 'var(--bg-base)'; 
                    e.currentTarget.style.borderColor = 'var(--border-subtle)';
                    e.currentTarget.style.color = 'var(--text-muted)'; 
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <Icon size={18} strokeWidth={1.5} />
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {Object.entries(LINKS).map(([group, items]) => (
            <div key={group}>
              <p className="text-xs font-bold uppercase tracking-widest mb-4"
                 style={{ color: 'var(--text-muted)' }}>
                {group}
              </p>
              <ul className="space-y-2.5">
                {items.map(({ label, to }) => (
                  <li key={label}>
                    <Link
                      to={to}
                      className="text-sm transition-colors"
                      style={{ color: 'var(--text-secondary)' }}
                      onMouseEnter={(e) => e.currentTarget.style.color = 'var(--accent-primary)'}
                      onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div
          className="mt-16 pb-8 pt-8 flex flex-col md:flex-row items-center justify-between gap-4"
          style={{ borderTop: '1px solid var(--border-subtle)' }}
        >
          <p className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
            {settings.footerText}
          </p>
          {/* <div className="flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-full" 
               style={{ background: 'var(--bg-base)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}>
            <Sparkles size={14} style={{ color: 'var(--accent-primary)' }} />
            Premium Design & Experience
          </div> */}
        </div>
      </div>
    </footer>
  );
}
