/**
 * Contact.jsx – Contact Us page with a working form UI
 */
import { useState } from 'react';
import { Mail, MapPin, Phone, Send } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Contact() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSending(true);
    // Simulate send (real implementation would POST to backend)
    await new Promise((r) => setTimeout(r, 1500));
    toast.success('Message sent! We\'ll reply within 24 hours.');
    setForm({ name: '', email: '', subject: '', message: '' });
    setSending(false);
  };

  return (
    <div style={{ background: 'var(--bg-base)', paddingTop: '4rem' }}>
      {/* Hero */}
      <section className="py-16" style={{ background: 'linear-gradient(135deg, #0f172a, #1e293b)' }}>
        <div className="page-container text-center">
          <p className="text-sm font-bold uppercase tracking-widest mb-2" style={{ color: '#fb923c' }}>
            Get in Touch
          </p>
          <h1 className="text-4xl sm:text-5xl font-black text-white mb-4"
              style={{ fontFamily: 'Space Grotesk, sans-serif', letterSpacing: '-0.03em' }}>
            We'd love to hear from you
          </h1>
          <p className="text-base max-w-xl mx-auto" style={{ color: 'rgba(255,255,255,0.55)' }}>
            Have a question, feedback, or a bug to report? Fill in the form and we'll get back within 24 hours.
          </p>
        </div>
      </section>

      <section className="py-16">
        <div className="page-container">
          <div className="grid lg:grid-cols-3 gap-10 max-w-5xl mx-auto">

            {/* Contact info */}
            <div className="space-y-6">
              {[
                { icon: Mail,    label: 'Email',   value: 'hello@jeewallah.in' },
                { icon: Phone,   label: 'Phone',   value: '+91 98765 43210' },
                { icon: MapPin,  label: 'Address', value: 'Bangalore, Karnataka, India' },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                       style={{ background: 'var(--accent-primary-light)' }}>
                    <Icon size={16} style={{ color: 'var(--accent-primary)' }} />
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider mb-1"
                       style={{ color: 'var(--text-muted)' }}>{label}</p>
                    <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{value}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Form */}
            <div className="lg:col-span-2 card p-8">
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Your Name</label>
                    <input
                      className="input"
                      placeholder="Arjun Sharma"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label className="label">Email Address</label>
                    <input
                      type="email"
                      className="input"
                      placeholder="arjun@email.com"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="label">Subject</label>
                  <input
                    className="input"
                    placeholder="Bug report / Feature request / General"
                    value={form.subject}
                    onChange={(e) => setForm({ ...form, subject: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="label">Message</label>
                  <textarea
                    className="input resize-none"
                    rows={5}
                    placeholder="Describe your issue or feedback in detail…"
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={sending}
                  className="btn btn-primary btn-lg gap-2 w-full sm:w-auto"
                >
                  {sending ? 'Sending…' : <><Send size={15} /> Send Message</>}
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
