/**
 * Landing.jsx – Public landing page
 * ─────────────────────────────────────────────────────────────────────────────
 * Aesthetic: Unacademy-inspired clean typography on a bold dark hero + orange
 * accent system.
 *
 * Sections:
 *   1. Hero       – Bold headline, CTA buttons, floating stats
 *   2. Social Proof – Student count, test count, avg score
 *   3. Features   – 6 feature cards (animated on enter)
 *   4. NTA Preview– Mini CBT interface screenshot mockup
 *   5. Testimonials
 *   6. Pricing teaser
 *   7. CTA banner
 *
 * Framer Motion animations ALLOWED on this page (per spec).
 */

import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useInView } from 'framer-motion';
import {
  Zap, Target, BarChart2, Clock, Brain, Trophy,
  ChevronRight, CheckCircle2, Star, Flame,
  ArrowRight, Play,
} from 'lucide-react';

/* ── Animation variants ── */
const fadeUp  = { hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0 } };
const stagger = { visible: { transition: { staggerChildren: 0.08 } } };

function AnimatedSection({ children, className = '' }) {
  const ref = useInView(useRef(null), { once: true, margin: '-80px' });
  // We use a simpler approach for sections
  return <div className={className}>{children}</div>;
}

/* ── Feature cards data ── */
const FEATURES = [
  {
    icon: Target,
    title: 'NTA CBT Interface',
    desc: 'Pixel-perfect replica of the actual NTA exam portal. Practice the interface, not just the content.',
    color: '#f97316',
    bg: '#fff3e8',
  },
  {
    icon: Brain,
    title: 'AI-Powered Analysis',
    desc: 'Gemini generates personalised study insights and identifies weak topics after every test.',
    color: '#6366f1',
    bg: '#eef2ff',
  },
  {
    icon: BarChart2,
    title: 'Deep Analytics',
    desc: 'Time per question, accuracy per topic, and subject-wise breakdown with objective vs integer splits.',
    color: '#22c55e',
    bg: '#dcfce7',
  },
  {
    icon: Clock,
    title: 'Time Management',
    desc: 'Track exactly how long you spend on each question. Identify where you waste precious exam minutes.',
    color: '#3b82f6',
    bg: '#dbeafe',
  },
  {
    icon: Flame,
    title: 'Daily Streaks',
    desc: 'Stay consistent with daily streak tracking. Gamified motivation to keep you solving every single day.',
    color: '#ef4444',
    bg: '#fee2e2',
  },
  {
    icon: Trophy,
    title: 'Live Leaderboard',
    desc: 'Test yourself against thousands of JEE aspirants. See exactly where you rank, test by test.',
    color: '#f59e0b',
    bg: '#fef3c7',
  },
];

const STATS = [
  { value: '50,000+', label: 'Active Students' },
  { value: '1,200+',  label: 'Mock Tests' },
  { value: '98.2%',   label: 'Avg Pass Rate' },
  { value: '4.9★',    label: 'App Rating' },
];

const TESTIMONIALS = [
  {
    name: 'stu2',
    rank: 'AIR 47, JEE Advanced 2024',
    text: 'The NTA interface is indistinguishable from the real thing. I never felt "interface shock" on exam day.',
    avatar: 'A',
  },
  {
    name: 'stu-1 ',
    rank: 'AIR 312, JEE Main 2024',
    text: 'The time analytics showed me I was wasting 12 minutes per test on questions I had no chance of solving.',
    avatar: 'P',
  },
  {
    name: 'stu-3',
    rank: 'AIR 89, JEE Advanced 2024',
    text: "JeeWallah's AI told me to focus on Thermodynamics 3 weeks before my exam. Got full marks in that section.",
    avatar: 'R',
  },
];

const PLAN_HIGHLIGHTS = [
  'Unlimited mock tests',
  'NTA CBT interface',
  'AI-powered feedback',
  'Deep time analytics',
  'Priority support',
];

export default function Landing() {
  const featuresRef = useRef(null);
  const featuresInView = useInView(featuresRef, { once: true, margin: '-60px' });

  return (
    <div style={{ background: 'var(--bg-base)' }}>

      {/* ════════════════════════════════════════════════════
          HERO SECTION
          ════════════════════════════════════════════════════ */}
      <section
        className="relative overflow-hidden flex items-center"
        style={{
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #0f172a 100%)',
        }}
      >
        {/* Decorative gradient orbs */}
        <div
          className="absolute top-1/4 -left-20 w-96 h-96 rounded-full opacity-20 blur-3xl pointer-events-none"
          style={{ background: 'radial-gradient(circle, #f97316 0%, transparent 70%)' }}
        />
        <div
          className="absolute bottom-1/4 -right-20 w-80 h-80 rounded-full opacity-15 blur-3xl pointer-events-none"
          style={{ background: 'radial-gradient(circle, #6366f1 0%, transparent 70%)' }}
        />

        <div className="page-container relative z-10 py-32 w-full">
          <div className="max-w-3xl mx-auto text-center">

            {/* Eyebrow tag */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-6 text-sm font-semibold"
              style={{
                background: 'rgba(249,115,22,0.15)',
                border: '1px solid rgba(249,115,22,0.3)',
                color: '#fb923c',
              }}
            >
              <Zap size={13} /> India's #1 AI-Powered JEE Prep Platform
            </motion.div>

            {/* H1 */}
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-5xl sm:text-6xl lg:text-7xl font-black text-white mb-6 leading-[1.05]"
              style={{ fontFamily: 'Space Grotesk, sans-serif', letterSpacing: '-0.03em' }}
            >
              Crack JEE with{' '}
              <span
                style={{
                  background: 'linear-gradient(135deg, #f97316, #fbbf24)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                precision
              </span>
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-lg sm:text-xl mb-10 leading-relaxed"
              style={{ color: 'rgba(255,255,255,0.6)', maxWidth: '520px', margin: '0 auto 2.5rem' }}
            >
              Pixel-perfect NTA CBT interface, AI-generated insights, granular time analytics, 
              and live leaderboards — built for JEE Main & Advanced toppers.
            </motion.p>

            {/* CTA buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-3"
            >
              <Link
                to="/register"
                className="btn btn-primary btn-xl gap-2 w-full sm:w-auto"
                style={{ minWidth: '200px' }}
              >
                <Zap size={16} /> Start for Free
              </Link>
              <Link
                to="/tests"
                className="btn btn-xl gap-2 w-full sm:w-auto"
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  color: 'white',
                  border: '1px solid rgba(255,255,255,0.15)',
                  minWidth: '180px',
                }}
              >
                <Play size={14} /> See Mock Tests
              </Link>
            </motion.div>

            {/* Tiny social proof under CTAs */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="mt-6 text-sm"
              style={{ color: 'rgba(255,255,255,0.35)' }}
            >
              No credit card required · Free tier available
            </motion.p>
          </div>

          {/* Floating stats cards */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.5 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-16 max-w-2xl mx-auto"
          >
            {STATS.map(({ value, label }) => (
              <div
                key={label}
                className="rounded-xl p-4 text-center"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  backdropFilter: 'blur(8px)',
                }}
              >
                <p className="text-2xl font-black text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                  {value}
                </p>
                <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.45)' }}>{label}</p>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ repeat: Infinity, duration: 1.8 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1"
          style={{ color: 'rgba(255,255,255,0.25)' }}
        >
          <div className="w-px h-8" style={{ background: 'linear-gradient(to bottom, rgba(255,255,255,0.25), transparent)' }} />
          <p className="text-xs">Scroll</p>
        </motion.div>
      </section>

      {/* ════════════════════════════════════════════════════
          FEATURES SECTION
          ════════════════════════════════════════════════════ */}
      <section ref={featuresRef} className="py-24" style={{ background: 'var(--bg-subtle)' }}>
        <div className="page-container">
          <motion.div
            variants={stagger}
            initial="hidden"
            animate={featuresInView ? 'visible' : 'hidden'}
            className="text-center mb-14"
          >
            <motion.p
              variants={fadeUp}
              className="text-sm font-bold uppercase tracking-widest mb-2"
              style={{ color: 'var(--accent-primary)' }}
            >
              Why JeeWallah?
            </motion.p>
            <motion.h2 variants={fadeUp} className="section-title">
              Everything you need to{' '}
              <span className="text-gradient">rank higher</span>
            </motion.h2>
            <motion.p variants={fadeUp} className="section-subtitle max-w-xl mx-auto">
              We've built every single feature that JEE toppers actually use — not things
              that look good in a marketing deck.
            </motion.p>
          </motion.div>

          <motion.div
            variants={stagger}
            initial="hidden"
            animate={featuresInView ? 'visible' : 'hidden'}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
          >
            {FEATURES.map(({ icon: Icon, title, desc, color, bg }) => (
              <motion.div
                key={title}
                variants={fadeUp}
                className="card card-hover p-6"
              >
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center mb-4"
                  style={{ background: bg }}
                >
                  <Icon size={20} style={{ color }} />
                </div>
                <h3 className="font-bold text-base mb-2" style={{ color: 'var(--text-heading)' }}>
                  {title}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {desc}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════
          NTA CBT PREVIEW SECTION
          ════════════════════════════════════════════════════ */}
      <section className="py-24 overflow-hidden" style={{ background: 'var(--bg-base)' }}>
        <div className="page-container">
          <div className="grid lg:grid-cols-2 items-center gap-14">
            <div>
              <p className="text-sm font-bold uppercase tracking-widest mb-2"
                 style={{ color: 'var(--accent-primary)' }}>
                The Real Deal
              </p>
              <h2 className="section-title mb-4">
                A mock test that{' '}
                <em style={{ fontStyle: 'normal', color: 'var(--accent-primary)' }}>feels</em>{' '}
                like JEE day
              </h2>
              <p className="section-subtitle mb-8">
                We've replicated the NTA CBT portal pixel-by-pixel — from the timer,
                question palette colour codes, to the exact submit confirmation dialog.
              </p>
              <ul className="space-y-3">
                {[
                  'Color-coded question palette (Not Visited, Answered, Marked, etc.)',
                  'Per-section timers with Physics / Chemistry / Maths toggling',
                  'Exact marking scheme: +4, –1 for MCQs; +4 / 0 for integers',
                  'Auto-submit on timer expiry + answer-save confirmation',
                  'Anti-cheating: tab-switch detection, right-click disabled',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm"
                      style={{ color: 'var(--text-secondary)' }}>
                    <CheckCircle2 size={15} className="mt-0.5 flex-shrink-0"
                                 style={{ color: 'var(--accent-success)' }} />
                    {item}
                  </li>
                ))}
              </ul>
              <Link to="/register" className="btn btn-primary btn-lg mt-8 gap-2">
                Try a Free Mock Test <ArrowRight size={15} />
              </Link>
            </div>

            {/* Mini NTA CBT mockup */}
            <div
              className="rounded-2xl overflow-hidden border"
              style={{
                borderColor: 'var(--border-subtle)',
                boxShadow: 'var(--shadow-xl)',
                background: '#f0f9ff',
              }}
            >
              {/* CBT Header */}
              <div className="px-4 py-3 flex items-center justify-between"
                   style={{ background: '#1e3a5f', color: '#fff' }}>
                <div className="text-xs font-bold">JEE Main Mock Test – 2024</div>
                <div className="flex items-center gap-2 text-xs">
                  <Clock size={11} />
                  <span className="font-mono font-bold text-yellow-300">2:47:33</span>
                </div>
              </div>

              {/* Subject tabs */}
              <div className="flex border-b" style={{ background: '#fff', borderColor: '#e2e8f0' }}>
                {['Physics', 'Chemistry', 'Mathematics'].map((s, i) => (
                  <button
                    key={s}
                    className="px-4 py-2 text-xs font-semibold border-b-2 transition-colors"
                    style={{
                      borderBottomColor: i === 0 ? '#f97316' : 'transparent',
                      color: i === 0 ? '#f97316' : '#64748b',
                      background: 'transparent',
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>

              {/* Question area (skeleton) */}
              <div className="p-4" style={{ background: '#fff' }}>
                <p className="text-xs font-semibold mb-2" style={{ color: '#475569' }}>
                  Q.5 (Single Correct)
                </p>
                <div className="space-y-2 mb-4">
                  <div className="skeleton h-4 w-full rounded" />
                  <div className="skeleton h-4 w-4/5 rounded" />
                  <div className="skeleton h-4 w-3/4 rounded" />
                </div>
                <div className="space-y-2">
                  {['A', 'B', 'C', 'D'].map((opt, i) => (
                    <div key={opt}
                         className="flex items-center gap-2 p-2 rounded text-xs"
                         style={{
                           background: i === 1 ? '#dcfce7' : '#f8fafc',
                           border: `1px solid ${i === 1 ? '#22c55e' : '#e2e8f0'}`,
                         }}>
                      <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
                            style={{
                              background: i === 1 ? '#22c55e' : '#e2e8f0',
                              color: i === 1 ? '#fff' : '#475569',
                            }}>
                        {opt}
                      </span>
                      <div className="skeleton h-3 flex-1 rounded" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Question palette */}
              <div className="p-3 border-t" style={{ background: '#f8fafc', borderColor: '#e2e8f0' }}>
                <p className="text-xs font-bold mb-2" style={{ color: '#64748b' }}>
                  Question Palette
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {Array.from({ length: 20 }, (_, i) => {
                    const states = ['q-answered','q-answered','q-not-answered','q-marked','q-not-visited','q-answered','q-not-visited'];
                    const s = states[i % states.length];
                    return (
                      <div key={i} className={`q-btn text-xs ${s}`}
                           style={{ width: '28px', height: '28px', fontSize: '10px' }}>
                        {i + 1}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════
          TESTIMONIALS
          ════════════════════════════════════════════════════ */}
      <section className="py-24" style={{ background: 'var(--bg-subtle)' }}>
        <div className="page-container">
          <div className="text-center mb-12">
            <p className="text-sm font-bold uppercase tracking-widest mb-2"
               style={{ color: 'var(--accent-primary)' }}>Testimonials</p>
            <h2 className="section-title">Trusted by JEE toppers</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {TESTIMONIALS.map(({ name, rank, text, avatar }) => (
              <div key={name} className="card p-6">
                {/* Stars */}
                <div className="flex gap-0.5 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={13} fill="#f97316" style={{ color: '#f97316' }} />
                  ))}
                </div>
                <p className="text-sm leading-relaxed mb-5" style={{ color: 'var(--text-secondary)' }}>
                  "{text}"
                </p>
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-white"
                    style={{ background: 'var(--gradient-brand)', fontSize: '0.875rem' }}
                  >
                    {avatar}
                  </div>
                  <div>
                    <p className="font-semibold text-sm" style={{ color: 'var(--text-heading)' }}>{name}</p>
                    <p className="text-xs" style={{ color: 'var(--accent-primary)' }}>{rank}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════
          PRICING TEASER
          ════════════════════════════════════════════════════ */}
      <section className="py-24" style={{ background: 'var(--bg-base)' }}>
        <div className="page-container">
          <div className="max-w-2xl mx-auto text-center">
            <p className="text-sm font-bold uppercase tracking-widest mb-2"
               style={{ color: 'var(--accent-primary)' }}>Pricing</p>
            <h2 className="section-title mb-4">Start free. Scale when you're ready.</h2>
            <p className="section-subtitle mb-8">
              Practice for free forever. Unlock deep analytics, AI insights, and unlimited full-length 
              mock tests with our premium plans starting at just ₹499/month.
            </p>
            <ul className="flex flex-wrap items-center justify-center gap-3 mb-8">
              {PLAN_HIGHLIGHTS.map((item) => (
                <li key={item} className="flex items-center gap-1.5 text-sm"
                    style={{ color: 'var(--text-secondary)' }}>
                  <CheckCircle2 size={14} style={{ color: 'var(--accent-success)' }} /> {item}
                </li>
              ))}
            </ul>
            <Link to="/subscription" className="btn btn-primary btn-lg gap-2">
              View Plans <ChevronRight size={15} />
            </Link>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════
          CTA BANNER
          ════════════════════════════════════════════════════ */}
      <section
        className="py-20"
        style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1a0a2e 100%)' }}
      >
        <div className="page-container text-center">
          <h2
            className="text-4xl sm:text-5xl font-black text-white mb-4"
            style={{ fontFamily: 'Space Grotesk, sans-serif', letterSpacing: '-0.03em' }}
          >
            Your JEE journey starts today.
          </h2>
          <p className="text-lg mb-8" style={{ color: 'rgba(255,255,255,0.5)' }}>
            Join 50,000+ students who've already taken the smarter path to IIT.
          </p>
          <Link to="/register" className="btn btn-primary btn-xl gap-2">
            <Zap size={16} /> Create Your Free Account
          </Link>
        </div>
      </section>
    </div>
  );
}
