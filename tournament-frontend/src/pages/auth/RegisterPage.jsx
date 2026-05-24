import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { register as registerUser } from '../../api/auth';

const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

const ROLES = [
  {
    value: 'player',
    label: 'Player',
    icon: '🏏',
    desc: 'Register for tournaments, get drafted in auctions, play matches',
  },
  {
    value: 'team_owner',
    label: 'Team Owner',
    icon: '🏆',
    desc: 'Own and manage a cricket team, bid in auctions, set your squad',
  },
  {
    value: 'scorer',
    label: 'Scorer',
    icon: '📊',
    desc: 'Score live matches ball by ball, track stats in real time',
  },
];

export default function RegisterPage() {
  const navigate = useNavigate();
  const [role, setRole] = useState('player');

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
  });

  const mutation = useMutation({
    mutationFn: (data) => registerUser({ ...data, role }),
    onSuccess: () => navigate('/login'),
  });

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-600/5 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="w-11 h-11 bg-gradient-to-br from-amber-400 to-amber-600 rounded-xl flex items-center justify-center shadow-xl shadow-amber-900/40">
            <span className="text-slate-900 font-black text-base">CF</span>
          </div>
          <span className="text-2xl font-black tracking-tight">
            <span className="text-white">Cric</span><span className="text-amber-400">Flow</span>
          </span>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8 sm:p-10">
          <div className="mb-7">
            <h1 className="text-2xl font-black text-gray-900">Join CricFlow</h1>
            <p className="text-gray-500 text-sm mt-1">Choose your role to get started</p>
          </div>

          {/* Role selector */}
          <div className="space-y-2 mb-6">
            {ROLES.map((r) => (
              <button
                key={r.value}
                type="button"
                onClick={() => setRole(r.value)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all ${
                  role === r.value
                    ? 'border-amber-400 bg-amber-50'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <span className="text-2xl">{r.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className={`font-bold text-sm ${role === r.value ? 'text-amber-700' : 'text-gray-800'}`}>{r.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{r.desc}</p>
                </div>
                <div className={`w-4 h-4 rounded-full border-2 shrink-0 ${role === r.value ? 'border-amber-400 bg-amber-400' : 'border-gray-300'}`} />
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Full Name</label>
              <input
                {...register('name')}
                placeholder="Ravi Kumar"
                className="w-full border border-gray-200 bg-gray-50 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent focus:bg-white transition-all"
              />
              {errors.name && <p className="text-red-500 text-xs mt-1.5 font-medium">{errors.name.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email address</label>
              <input
                {...register('email')}
                type="email"
                placeholder="you@example.com"
                className="w-full border border-gray-200 bg-gray-50 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent focus:bg-white transition-all"
              />
              {errors.email && <p className="text-red-500 text-xs mt-1.5 font-medium">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Password</label>
              <input
                {...register('password')}
                type="password"
                placeholder="Min 8 characters"
                className="w-full border border-gray-200 bg-gray-50 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent focus:bg-white transition-all"
              />
              {errors.password && <p className="text-red-500 text-xs mt-1.5 font-medium">{errors.password.message}</p>}
            </div>

            <p className="text-xs text-gray-400">
              Note: Anyone can organize a tournament from the "Organize" tab regardless of role.
            </p>

            {mutation.isError && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                <p className="text-red-600 text-sm font-medium">
                  {mutation.error?.response?.data?.detail ?? 'Registration failed. Try again.'}
                </p>
              </div>
            )}

            {mutation.isSuccess && (
              <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                <p className="text-green-700 text-sm font-medium">Account created! Redirecting to login…</p>
              </div>
            )}

            <button
              type="submit"
              disabled={mutation.isPending}
              className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-slate-900 font-bold rounded-xl py-3 text-sm transition-all shadow-lg shadow-amber-500/20 hover:-translate-y-0.5 active:translate-y-0"
            >
              {mutation.isPending ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Creating account…
                </span>
              ) : `Create Account as ${ROLES.find(r => r.value === role)?.label} →`}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-100 text-center">
            <p className="text-sm text-gray-500">
              Already have an account?{' '}
              <Link to="/login" className="text-amber-600 hover:text-amber-500 font-semibold">Sign in</Link>
            </p>
          </div>
        </div>

        <p className="text-center text-slate-600 text-xs mt-6">cricflow.online · One account, everything cricket</p>
      </div>
    </div>
  );
}
