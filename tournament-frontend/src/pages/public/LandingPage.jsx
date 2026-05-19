import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

/* ─── tiny helpers ─────────────────────────────────────────────────── */
function useScrolled(threshold = 60) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > threshold);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, [threshold]);
  return scrolled;
}

/* ─── top nav ──────────────────────────────────────────────────────── */
function TopNav() {
  const scrolled = useScrolled();
  const [open, setOpen] = useState(false);
  return (
    <header className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${scrolled ? 'bg-slate-950/95 backdrop-blur shadow-xl shadow-black/20 border-b border-slate-800' : 'bg-transparent'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 group shrink-0">
          <div className="w-9 h-9 bg-gradient-to-br from-amber-400 to-amber-600 rounded-xl flex items-center justify-center shadow-lg shadow-amber-900/30 group-hover:scale-105 transition-transform">
            <span className="text-slate-900 font-black text-sm">CF</span>
          </div>
          <span className="font-black text-xl tracking-tight">
            <span className="text-white">Cric</span><span className="text-amber-400">Flow</span>
          </span>
        </Link>

        {/* Desktop nav links */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-400">
          {[['Features', '#features'], ['How It Works', '#how'], ['For You', '#roles'], ['Contact', '#contact']].map(([label, href]) => (
            <a key={label} href={href} className="hover:text-white transition-colors">{label}</a>
          ))}
        </nav>

        {/* CTA buttons */}
        <div className="hidden md:flex items-center gap-3">
          <Link to="/login" className="text-sm font-semibold text-slate-300 hover:text-white px-4 py-2 rounded-xl hover:bg-slate-800 transition-all">
            Sign In
          </Link>
          <Link to="/register" className="text-sm font-bold bg-amber-500 hover:bg-amber-400 text-slate-900 px-5 py-2.5 rounded-xl shadow-lg shadow-amber-900/20 hover:-translate-y-0.5 transition-all">
            Get Started Free
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button onClick={() => setOpen(o => !o)} className="md:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors" aria-label="Menu">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {open
              ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />}
          </svg>
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden bg-slate-950 border-t border-slate-800 px-4 py-4 space-y-2">
          {[['Features', '#features'], ['How It Works', '#how'], ['For You', '#roles'], ['Contact', '#contact']].map(([label, href]) => (
            <a key={label} href={href} onClick={() => setOpen(false)}
              className="block px-3 py-2.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl text-sm font-medium transition-colors">
              {label}
            </a>
          ))}
          <div className="flex gap-2 pt-2 border-t border-slate-800">
            <Link to="/login" className="flex-1 text-center py-2.5 text-sm font-semibold text-slate-300 border border-slate-700 rounded-xl hover:bg-slate-800 transition-colors">
              Sign In
            </Link>
            <Link to="/register" className="flex-1 text-center py-2.5 text-sm font-bold bg-amber-500 text-slate-900 rounded-xl hover:bg-amber-400 transition-colors">
              Get Started
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}

/* ─── hero ─────────────────────────────────────────────────────────── */
function HeroSection() {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center text-center bg-slate-950 overflow-hidden px-4 pt-16">
      {/* Background blobs */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[700px] bg-amber-500/5 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -left-32 w-80 h-80 bg-blue-700/10 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -right-32 w-80 h-80 bg-violet-700/10 rounded-full blur-3xl" />
      </div>

      {/* Badge */}
      <div className="relative mb-6 inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-full">
        <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse" />
        IPL-Style Tournament Platform
      </div>

      {/* Headline */}
      <h1 className="relative text-5xl sm:text-6xl lg:text-7xl font-black text-white leading-tight max-w-5xl">
        Where Cricket<br />
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500">
          Meets Technology
        </span>
      </h1>

      {/* Subtext */}
      <p className="relative mt-6 text-slate-400 text-lg sm:text-xl max-w-2xl leading-relaxed">
        CricFlow gives every cricket lover a professional tournament experience — live auctions, ball-by-ball scoring, real-time standings, and deep player stats. All in one place.
      </p>

      {/* CTAs */}
      <div className="relative mt-10 flex flex-col sm:flex-row items-center gap-4">
        <Link to="/register"
          className="px-8 py-4 bg-gradient-to-r from-amber-500 to-amber-400 text-slate-900 font-black text-base rounded-2xl shadow-2xl shadow-amber-500/25 hover:-translate-y-1 hover:shadow-amber-500/40 transition-all">
          Start Your Tournament — Free
        </Link>
        <a href="#features"
          className="flex items-center gap-2 px-6 py-4 text-slate-300 hover:text-white font-semibold text-sm rounded-2xl border border-slate-700 hover:border-slate-500 hover:bg-slate-800/50 transition-all">
          <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          See All Features
        </a>
      </div>

      {/* Floating scoreboard mockup */}
      <div className="relative mt-16 w-full max-w-3xl mx-auto">
        <div className="bg-slate-900/80 border border-slate-700 rounded-3xl shadow-2xl shadow-black/50 overflow-hidden backdrop-blur">
          {/* Mock match bar */}
          <div className="bg-gradient-to-r from-slate-800 to-slate-900 px-6 py-4 flex items-center justify-between border-b border-slate-700">
            <div className="flex items-center gap-3">
              <span className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse" />
              <span className="text-green-400 text-xs font-bold uppercase tracking-wider">Live Match</span>
            </div>
            <span className="text-slate-500 text-xs">League Stage · Over 14.3</span>
          </div>
          <div className="px-6 py-5 grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-black text-lg mx-auto mb-2 shadow-lg">M</div>
              <p className="text-white font-black text-sm">Mumbai Strikers</p>
              <p className="text-2xl font-black text-amber-400 mt-1">142/4</p>
              <p className="text-slate-500 text-xs">(14.3 ov)</p>
            </div>
            <div className="flex flex-col items-center justify-center">
              <span className="text-slate-600 text-xs font-black tracking-widest uppercase mb-1">vs</span>
              <div className="text-xs text-slate-500 text-center mt-2">Target: —</div>
            </div>
            <div className="text-center">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-white font-black text-lg mx-auto mb-2 shadow-lg">C</div>
              <p className="text-white font-black text-sm">Chennai Kings</p>
              <p className="text-2xl font-black text-slate-400 mt-1">Yet to bat</p>
              <p className="text-slate-600 text-xs">—</p>
            </div>
          </div>
          <div className="px-6 pb-5 grid grid-cols-4 gap-3">
            {[['Last 5', '4 . W 6 1 4'], ['Rohit K', '62* (41)'], ['Suresh P', '24 (18)'], ['Economy', '9.8']].map(([l, v]) => (
              <div key={l} className="bg-slate-800/60 rounded-xl px-3 py-2.5 text-center">
                <p className="text-amber-400 text-xs font-bold truncate">{v}</p>
                <p className="text-slate-500 text-xs mt-0.5">{l}</p>
              </div>
            ))}
          </div>
        </div>
        {/* glow */}
        <div className="absolute inset-0 -z-10 bg-amber-500/10 blur-3xl rounded-full scale-75 translate-y-12" />
      </div>

      {/* Scroll cue */}
      <a href="#features" className="relative mt-12 text-slate-600 hover:text-slate-400 transition-colors">
        <svg className="w-6 h-6 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </a>
    </section>
  );
}

/* ─── stats bar ────────────────────────────────────────────────────── */
function StatsBar() {
  const stats = [
    { icon: '🏏', label: 'Tournaments', value: 'Multi' },
    { icon: '⚡', label: 'Auction System', value: 'Live' },
    { icon: '📊', label: 'Ball-by-Ball', value: 'Scoring' },
    { icon: '🏆', label: 'Standings', value: 'Real-time' },
  ];
  return (
    <div className="bg-slate-900 border-y border-slate-800">
      <div className="max-w-5xl mx-auto px-4 py-6 grid grid-cols-2 sm:grid-cols-4 gap-6">
        {stats.map((s) => (
          <div key={s.label} className="flex items-center gap-3">
            <span className="text-2xl">{s.icon}</span>
            <div>
              <p className="text-amber-400 font-black text-base leading-none">{s.value}</p>
              <p className="text-slate-500 text-xs mt-0.5">{s.label}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── features grid ─────────────────────────────────────────────────── */
const FEATURES = [
  {
    icon: '🏆',
    color: 'from-amber-500/10 to-amber-600/5 border-amber-500/20',
    iconBg: 'bg-amber-500/10 text-amber-400',
    title: 'Tournament Management',
    desc: 'Create multi-phase tournaments from scratch. Set registration windows, auction dates, match schedules, and fees. Track every phase — Registration → Auction → League → Playoffs — all from your organizer dashboard.',
  },
  {
    icon: '🎙',
    color: 'from-blue-500/10 to-blue-600/5 border-blue-500/20',
    iconBg: 'bg-blue-500/10 text-blue-400',
    title: 'Live IPL-Style Auction',
    desc: 'Experience the thrill of a real auction room. Organizers start the auction, team owners place real-time bids, and the system enforces budget limits automatically. Every sold player updates instantly across all screens.',
  },
  {
    icon: '📡',
    color: 'from-green-500/10 to-green-600/5 border-green-500/20',
    iconBg: 'bg-green-500/10 text-green-400',
    title: 'Ball-by-Ball Live Scoring',
    desc: 'Record every delivery — runs, extras, wides, no-balls, wickets. WebSocket-powered updates push scores to all viewers instantly. Full innings scorecard with batting and bowling summaries generated automatically.',
  },
  {
    icon: '📊',
    color: 'from-violet-500/10 to-violet-600/5 border-violet-500/20',
    iconBg: 'bg-violet-500/10 text-violet-400',
    title: 'Deep Player Statistics',
    desc: 'Comprehensive batting and bowling stats per tournament — runs, strike rate, average, high score, wickets, economy, maidens. Every player has a detailed profile card ranking them across the tournament leaderboard.',
  },
  {
    icon: '📋',
    color: 'from-rose-500/10 to-rose-600/5 border-rose-500/20',
    iconBg: 'bg-rose-500/10 text-rose-400',
    title: 'Smart Points Table',
    desc: 'Live standings update automatically as matches complete. Won, Lost, No Result, and Net Run Rate tracked per tournament. Gold, silver, bronze ranks highlighted. No manual entry needed.',
  },
  {
    icon: '👥',
    color: 'from-cyan-500/10 to-cyan-600/5 border-cyan-500/20',
    iconBg: 'bg-cyan-500/10 text-cyan-400',
    title: 'Team & Squad Builder',
    desc: 'Organizers create teams and assign owners. Owners manage their budget and squad. Players register, get approved, and are available for auction. Full Playing XI selection before each match.',
  },
];

function FeaturesSection() {
  return (
    <section id="features" className="bg-slate-950 py-24 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-amber-400 text-sm font-bold uppercase tracking-widest mb-3">Platform Features</p>
          <h2 className="text-4xl sm:text-5xl font-black text-white leading-tight">
            Everything a cricket<br />tournament needs
          </h2>
          <p className="text-slate-400 mt-4 max-w-xl mx-auto text-lg">
            From the first registration to the final ball — CricFlow handles it all.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f) => (
            <div key={f.title}
              className={`bg-gradient-to-br ${f.color} border rounded-2xl p-6 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/30 transition-all duration-300 group`}>
              <div className={`w-12 h-12 rounded-2xl ${f.iconBg} flex items-center justify-center text-2xl mb-5 group-hover:scale-110 transition-transform`}>
                {f.icon}
              </div>
              <h3 className="text-white font-black text-lg mb-2">{f.title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── how it works ──────────────────────────────────────────────────── */
const STEPS = [
  {
    num: '01',
    color: 'border-amber-500/30 bg-amber-500/5',
    numColor: 'text-amber-400',
    title: 'Create Your Tournament',
    desc: 'Sign up as an organizer. Set your tournament name, registration fee, auction date, player base price, and team budget limit. Invite players to register.',
    icon: '🏟️',
  },
  {
    num: '02',
    color: 'border-blue-500/30 bg-blue-500/5',
    numColor: 'text-blue-400',
    title: 'Auction Your Players',
    desc: 'Start the live auction room. Team owners join and bid for registered players. The system enforces budgets in real time — no overbuying allowed.',
    icon: '🎙',
  },
  {
    num: '03',
    color: 'border-green-500/30 bg-green-500/5',
    numColor: 'text-green-400',
    title: 'Schedule & Play Matches',
    desc: 'Generate round-robin fixtures with one click or create individual matches. Set toss, playing XI, and start. Score ball-by-ball right from the app.',
    icon: '🏏',
  },
  {
    num: '04',
    color: 'border-violet-500/30 bg-violet-500/5',
    numColor: 'text-violet-400',
    title: 'Watch Stats Come Alive',
    desc: 'Live leaderboards, standings, and player stats update automatically. Share your tournament link so fans can follow every match in real time.',
    icon: '📈',
  },
];

function HowItWorksSection() {
  return (
    <section id="how" className="bg-slate-900 py-24 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-amber-400 text-sm font-bold uppercase tracking-widest mb-3">How It Works</p>
          <h2 className="text-4xl sm:text-5xl font-black text-white">From zero to finals<br />in four steps</h2>
        </div>

        <div className="grid sm:grid-cols-2 gap-6">
          {STEPS.map((s) => (
            <div key={s.num} className={`border ${s.color} rounded-2xl p-7 flex gap-5`}>
              <div className="shrink-0">
                <span className={`text-5xl font-black ${s.numColor} opacity-30 leading-none`}>{s.num}</span>
              </div>
              <div>
                <div className="text-3xl mb-3">{s.icon}</div>
                <h3 className="text-white font-black text-lg mb-2">{s.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── for whom ──────────────────────────────────────────────────────── */
const ROLES = [
  {
    emoji: '🏏',
    role: 'Cricket Players',
    bg: 'bg-gradient-to-br from-blue-900/40 to-slate-900 border-blue-700/30',
    badge: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    perks: [
      'Register for tournaments with one click',
      'Get auctioned to your team in a live bidding room',
      'See your batting & bowling stats after every match',
      'Track your batting average, strike rate, wickets & more',
      'Follow your team\'s journey through the season',
    ],
    cta: 'Register as Player',
    link: '/register',
  },
  {
    emoji: '🎯',
    role: 'Tournament Organizers',
    bg: 'bg-gradient-to-br from-amber-900/40 to-slate-900 border-amber-700/30',
    badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    perks: [
      'Create and manage unlimited tournaments',
      'Control every phase: Registration → Auction → League',
      'Approve players and assign team owners',
      'Schedule matches and control live scoring',
      'Complete dashboard with all key metrics',
    ],
    cta: 'Start Organizing',
    link: '/register',
  },
  {
    emoji: '👑',
    role: 'Team Owners',
    bg: 'bg-gradient-to-br from-emerald-900/40 to-slate-900 border-emerald-700/30',
    badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    perks: [
      'Join the live auction and build your dream squad',
      'Smart budget tracker — never overspend',
      'Pick your Playing XI before each match',
      'Monitor your team\'s performance in real time',
      'Compete on the live points table',
    ],
    cta: 'Own a Team',
    link: '/register',
  },
];

function RolesSection() {
  return (
    <section id="roles" className="bg-slate-950 py-24 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-amber-400 text-sm font-bold uppercase tracking-widest mb-3">Built For Everyone</p>
          <h2 className="text-4xl sm:text-5xl font-black text-white">One platform,<br />every role covered</h2>
          <p className="text-slate-400 mt-4 max-w-lg mx-auto">Whether you're swinging the bat, running the show, or building the team — CricFlow has you covered.</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {ROLES.map((r) => (
            <div key={r.role} className={`border ${r.bg} rounded-2xl p-7 flex flex-col`}>
              <div className="text-4xl mb-4">{r.emoji}</div>
              <span className={`text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full border w-fit mb-3 ${r.badge}`}>{r.role}</span>
              <ul className="space-y-3 flex-1 mb-6">
                {r.perks.map((p) => (
                  <li key={p} className="flex items-start gap-2.5 text-sm text-slate-300">
                    <svg className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                    {p}
                  </li>
                ))}
              </ul>
              <Link to={r.link}
                className="w-full text-center py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold text-sm rounded-xl transition-colors">
                {r.cta} →
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── CTA section ───────────────────────────────────────────────────── */
function CtaSection() {
  return (
    <section className="bg-slate-900 py-24 px-4">
      <div className="max-w-4xl mx-auto text-center relative">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-amber-500/5 rounded-3xl blur-3xl scale-110" />
        </div>
        <div className="relative bg-gradient-to-br from-amber-500/10 via-slate-800/40 to-slate-900 border border-amber-500/20 rounded-3xl p-14">
          <p className="text-amber-400 text-sm font-bold uppercase tracking-widest mb-4">Ready to Play?</p>
          <h2 className="text-4xl sm:text-5xl font-black text-white mb-5">
            Your tournament is<br />one click away
          </h2>
          <p className="text-slate-400 text-lg max-w-xl mx-auto mb-10">
            Free to get started. No credit card needed. Create your first tournament in minutes and experience cricket management like never before.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/register"
              className="px-10 py-4 bg-gradient-to-r from-amber-500 to-amber-400 text-slate-900 font-black text-base rounded-2xl shadow-2xl shadow-amber-500/30 hover:-translate-y-1 hover:shadow-amber-500/50 transition-all">
              Create Free Account
            </Link>
            <Link to="/login"
              className="px-8 py-4 text-slate-300 hover:text-white font-semibold text-sm rounded-2xl border border-slate-600 hover:border-slate-400 hover:bg-slate-800/50 transition-all">
              Already have an account? Sign in
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── contact ───────────────────────────────────────────────────────── */
function ContactSection() {
  return (
    <section id="contact" className="bg-slate-950 py-24 px-4 border-t border-slate-800">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <p className="text-amber-400 text-sm font-bold uppercase tracking-widest mb-3">Get In Touch</p>
          <h2 className="text-4xl font-black text-white">We'd love to hear from you</h2>
          <p className="text-slate-400 mt-3 max-w-md mx-auto">Have questions about CricFlow? Want to organize a tournament? Reach out and we'll get back to you.</p>
        </div>

        <div className="grid sm:grid-cols-3 gap-5 mb-12">
          {[
            { icon: '📧', label: 'Email Us', value: 'hello@cricflow.online', sub: 'We reply within 24 hours' },
            { icon: '📱', label: 'WhatsApp', value: '+91 98765 43210', sub: 'Mon – Sat, 9 AM to 7 PM' },
            { icon: '🌐', label: 'Website', value: 'cricflow.online', sub: 'Always online' },
          ].map((c) => (
            <div key={c.label} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center hover:border-slate-600 transition-colors">
              <div className="text-3xl mb-3">{c.icon}</div>
              <p className="text-slate-500 text-xs font-semibold uppercase tracking-wide mb-1">{c.label}</p>
              <p className="text-white font-bold text-sm">{c.value}</p>
              <p className="text-slate-500 text-xs mt-1">{c.sub}</p>
            </div>
          ))}
        </div>

        {/* Quick contact form */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 max-w-xl mx-auto">
          <h3 className="text-white font-black text-lg mb-5">Send a Message</h3>
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); alert('Message sent! We\'ll get back to you soon.'); e.target.reset(); }}>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Your Name</label>
                <input required type="text" placeholder="Virat Sharma"
                  className="w-full bg-slate-800 border border-slate-700 text-white placeholder-slate-500 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 transition" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Email Address</label>
                <input required type="email" placeholder="you@example.com"
                  className="w-full bg-slate-800 border border-slate-700 text-white placeholder-slate-500 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 transition" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Subject</label>
              <select className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 transition">
                <option>I want to organize a tournament</option>
                <option>I want to register as a player</option>
                <option>I have a technical issue</option>
                <option>Partnership / Sponsorship</option>
                <option>Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Message</label>
              <textarea required rows={4} placeholder="Tell us more..."
                className="w-full bg-slate-800 border border-slate-700 text-white placeholder-slate-500 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 transition resize-none" />
            </div>
            <button type="submit"
              className="w-full py-3.5 bg-amber-500 hover:bg-amber-400 text-slate-900 font-black rounded-xl shadow-lg shadow-amber-500/20 hover:-translate-y-0.5 transition-all text-sm">
              Send Message →
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}

/* ─── footer ────────────────────────────────────────────────────────── */
function Footer() {
  return (
    <footer className="bg-slate-950 border-t border-slate-800 py-10 px-4">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-amber-600 rounded-lg flex items-center justify-center">
            <span className="text-slate-900 font-black text-xs">CF</span>
          </div>
          <span className="font-black text-lg tracking-tight">
            <span className="text-white">Cric</span><span className="text-amber-400">Flow</span>
          </span>
        </div>

        <div className="flex items-center gap-6 text-xs text-slate-500">
          {[['Features', '#features'], ['How It Works', '#how'], ['Contact', '#contact']].map(([l, h]) => (
            <a key={l} href={h} className="hover:text-slate-300 transition-colors">{l}</a>
          ))}
          <Link to="/login" className="hover:text-slate-300 transition-colors">Sign In</Link>
          <Link to="/register" className="text-amber-400 hover:text-amber-300 font-semibold transition-colors">Register</Link>
        </div>

        <p className="text-slate-600 text-xs">© 2026 CricFlow · cricflow.online</p>
      </div>
    </footer>
  );
}

/* ─── main export ───────────────────────────────────────────────────── */
export default function LandingPage() {
  const { token, user } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (token) {
      navigate(user?.role === 'admin' ? '/admin' : '/tournaments', { replace: true });
    }
  }, [token, user, navigate]);

  return (
    <div className="bg-slate-950 font-sans">
      <TopNav />
      <HeroSection />
      <StatsBar />
      <FeaturesSection />
      <HowItWorksSection />
      <RolesSection />
      <CtaSection />
      <ContactSection />
      <Footer />
    </div>
  );
}
