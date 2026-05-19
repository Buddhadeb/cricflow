import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

function Avatar({ user, size = 'sm' }) {
  const initials = user ? (user.name ?? user.email ?? '?')[0].toUpperCase() : '?';
  const dim = size === 'sm' ? 'w-7 h-7 text-xs' : 'w-8 h-8 text-sm';
  if (user?.avatar_url) {
    return (
      <img
        src={user.avatar_url}
        alt={user.name}
        className={`${dim} rounded-lg object-cover shadow`}
        onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
      />
    );
  }
  return (
    <div className={`${dim} rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-bold shadow`}>
      {initials}
    </div>
  );
}

const ROLE_COLOR = {
  admin: 'text-rose-400',
  user: 'text-slate-400',
};

const NAV_ICONS = {
  Tournaments: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
    </svg>
  ),
  'My Tournaments': (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
    </svg>
  ),
  Schedule: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  'Points Table': (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
  Auction: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  Stats: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    </svg>
  ),
  Admin: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  'My Team': (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  Challenges: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243 4.243 3 3 0 004.243-4.243zm0-5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243z" />
    </svg>
  ),
};

export default function NavBar() {
  const { user, logout } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const links = [
    { to: '/tournaments', label: 'Tournaments' },
    { to: '/organizer', label: 'My Tournaments' },
    { to: '/my-team', label: 'My Team' },
    { to: '/challenges', label: 'Challenges' },
    ...(user?.role === 'admin' ? [{ to: '/admin', label: 'Admin' }] : []),
  ];

  const isActive = (to) => location.pathname === to || location.pathname.startsWith(to + '/');

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="bg-slate-900 sticky top-0 z-50 shadow-xl border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <Link to="/matches" className="flex items-center gap-3 shrink-0 group">
            <div className="w-9 h-9 bg-gradient-to-br from-amber-400 to-amber-600 rounded-xl flex items-center justify-center shadow-lg shadow-amber-900/30 group-hover:scale-105 transition-transform">
              <span className="text-slate-900 font-black text-sm tracking-tighter">CF</span>
            </div>
            <span className="font-black text-xl tracking-tight hidden sm:block">
              <span className="text-white">Cric</span><span className="text-amber-400">Flow</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-0.5">
            {links.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                  isActive(l.to)
                    ? 'bg-amber-500 text-slate-900 shadow-lg shadow-amber-900/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <span className={isActive(l.to) ? 'text-slate-900' : ''}>{NAV_ICONS[l.label]}</span>
                {l.label}
              </Link>
            ))}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {user && (
              <div className="hidden sm:flex items-center gap-3">
                <Link to="/profile" className="flex items-center gap-2.5 bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-xl border border-slate-700 hover:border-slate-600 transition-all">
                  <Avatar user={user} size="sm" />
                  <p className="text-white text-xs font-semibold leading-none">{user.name ?? user.email}</p>
                </Link>
              </div>
            )}

            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-slate-400 hover:text-red-400 text-xs font-medium px-3 py-2 rounded-lg hover:bg-slate-800 transition-all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span className="hidden sm:inline">Sign out</span>
            </button>

            {/* Mobile hamburger */}
            <button
              className="md:hidden flex flex-col gap-1.5 p-2 rounded-lg hover:bg-slate-800 transition-colors"
              onClick={() => setMenuOpen((o) => !o)}
              aria-label="Menu"
            >
              <span className={`block w-5 h-0.5 bg-slate-400 transition-all ${menuOpen ? 'rotate-45 translate-y-2' : ''}`} />
              <span className={`block w-5 h-0.5 bg-slate-400 transition-all ${menuOpen ? 'opacity-0' : ''}`} />
              <span className={`block w-5 h-0.5 bg-slate-400 transition-all ${menuOpen ? '-rotate-45 -translate-y-2' : ''}`} />
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden border-t border-slate-800 py-3 space-y-1">
            {user && (
              <Link to="/profile" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 px-3 py-2.5 mb-2 bg-slate-800 hover:bg-slate-700 rounded-xl mx-0 transition-colors">
                <Avatar user={user} size="md" />
                <div>
                  <p className="text-white text-sm font-semibold">{user.name ?? user.email}</p>
                  <p className={`text-xs font-medium capitalize ${ROLE_COLOR[user.role] ?? 'text-slate-400'}`}>
                    {user.role?.replace('_', ' ')}
                  </p>
                </div>
              </Link>
            )}
            {links.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                onClick={() => setMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive(l.to)
                    ? 'bg-amber-500 text-slate-900'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                {NAV_ICONS[l.label]}
                {l.label}
              </Link>
            ))}
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-red-400 hover:bg-slate-800 w-full transition-colors mt-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Sign out
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
