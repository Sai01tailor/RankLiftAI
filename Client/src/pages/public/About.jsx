/**
 * About.jsx – About Us page
 */
import { Users, Target, Heart, Award } from 'lucide-react';
import { useSite } from '../../context/SiteContext';

const TEAM = [
  { name: 'Yahyesh pathak', role: 'co-Founder & Head of Academics', initials: 'YP', bg: '#f97316' },
  { name: 'Sai Tailor',   role: 'co-Founder & developer', initials: 'ST', bg: '#6366f1' },
];

const VALUES = [
  { icon: Target, title: 'Student-First', desc: 'Every feature is built around what a JEE aspirant actually needs, not what looks impressive.' },
  { icon: Heart,  title: 'Honesty',       desc: 'We never oversell. We show you exactly where you stand and how to improve.' },
  { icon: Award,  title: 'Excellence',    desc: 'From pixel-perfect UI to sub-second API responses, we obsess over quality.' },
];

export default function About() {
  const { settings } = useSite();
  return (
    <div style={{ background: 'var(--bg-base)', paddingTop: '4rem' }}>
      {/* Hero */}
      <section className="py-20" style={{ background: 'linear-gradient(135deg, #0f172a, #1e293b)' }}>
        <div className="page-container text-center">
          <p className="text-sm font-bold uppercase tracking-widest mb-3" style={{ color: '#fb923c' }}>
            About JeeWallah
          </p>
          <h1 className="text-5xl font-black text-white mb-6"
              style={{ fontFamily: 'Space Grotesk, sans-serif', letterSpacing: '-0.03em' }}>
            Built by JEE aspirants,<br /> for JEE aspirants.
          </h1>
          <p className="text-lg max-w-2xl mx-auto" style={{ color: 'rgba(255,255,255,0.6)' }}>
            We failed our first attempts at JEE because we didn't have access to the right tools.
            JeeWallah is the platform we wished had existed when we were studying.
          </p>
        </div>
      </section>

      {/* Mission */}
      <section className="py-20">
        <div className="page-container max-w-3xl">
          <h2 className="section-title mb-4">Our Mission</h2>
          <div className="text-lg leading-relaxed mb-6 space-y-4" style={{ color: 'var(--text-secondary)' }}>
            {settings.aboutUs ? (
              <div dangerouslySetInnerHTML={{ __html: settings.aboutUs.replace(/\n/g, '<br/>') }} />
            ) : (
              <>
                <p>
                  To give every JEE aspirant — regardless of their coaching institute or city — access to 
                  the same high-quality preparation tools that were previously only available to students 
                  at premium coaching centres in Kota.
                </p>
                <p>
                  We believe the gap between a general rank of 500 and 5,000 is often 
                  <strong style={{ color: 'var(--text-primary)' }}> preparation strategy</strong>, not 
                  intelligence. Our AI helps you find that gap — and close it.
                </p>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-16" style={{ background: 'var(--bg-subtle)' }}>
        <div className="page-container">
          <h2 className="section-title text-center mb-10">Our Values</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto">
            {VALUES.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="card p-6 text-center">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4"
                     style={{ background: 'var(--accent-primary-light)' }}>
                  <Icon size={22} style={{ color: 'var(--accent-primary)' }} />
                </div>
                <h3 className="font-bold mb-2" style={{ color: 'var(--text-heading)' }}>{title}</h3>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="py-20">
        <div className="page-container">
          <h2 className="section-title text-center mb-10">Meet the Team</h2>
          <div className="flex flex-wrap justify-center gap-6">
            {TEAM.map(({ name, role, initials, bg }) => (
              <div key={name} className="card p-6 text-center w-52">
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-xl mx-auto mb-3"
                  style={{ background: bg }}
                >
                  {initials}
                </div>
                <p className="font-bold text-sm" style={{ color: 'var(--text-heading)' }}>{name}</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{role}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
