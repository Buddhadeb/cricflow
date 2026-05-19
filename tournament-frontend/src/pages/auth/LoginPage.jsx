import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { login, googleAuth, getMe } from '../../api/auth';
import { useAuthStore } from '../../store/authStore';

const schema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password required'),
});

const ROLE_REDIRECTS = {
  admin: '/admin',
};

const STATS = [
  { label: 'Live Matches', value: '24/7' },
  { label: 'Players', value: '500+' },
  { label: 'Teams', value: '16' },
  { label: 'Matches', value: '80+' },
];

export default function LoginPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
  });

  const mutation = useMutation({
    mutationFn: async (data) => {
      const { data: { access_token } } = await login(data);
      useAuthStore.setState({ token: access_token });
      const { data: user } = await getMe();
      return { access_token, user };
    },
    onSuccess: ({ access_token, user }) => {
      setAuth(access_token, user);
      navigate(ROLE_REDIRECTS[user.role] ?? '/tournaments');
    },
  });

  const googleMutation = useMutation({
    mutationFn: async (credential) => {
      const { data: { access_token } } = await googleAuth(credential);
      useAuthStore.setState({ token: access_token });
      const { data: user } = await getMe();
      return { access_token, user };
    },
    onSuccess: ({ access_token, user }) => {
      setAuth(access_token, user);
      navigate(ROLE_REDIRECTS[user.role] ?? '/tournaments');
    },
  });

  return (
    <div className="min-h-screen bg-slate-900 flex">
      {/* Left hero panel — hidden on mobile */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 p-12 relative overflow-hidden">
        {/* Background decorative circles */}
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-blue-800/10 rounded-full blur-2xl pointer-events-none" />

        {/* Logo */}
        <div className="flex items-center gap-3 relative">
          <div className="w-11 h-11 bg-gradient-to-br from-amber-400 to-amber-600 rounded-xl flex items-center justify-center shadow-xl shadow-amber-900/40">
            <span className="text-slate-900 font-black text-base">CF</span>
          </div>
          <span className="text-2xl font-black tracking-tight">
            <span className="text-white">Cric</span><span className="text-amber-400">Flow</span>
          </span>
        </div>

        {/* Hero text */}
        <div className="relative space-y-6">
          <div>
            <p className="text-amber-400 text-sm font-semibold uppercase tracking-widest mb-3">Live Cricket Tournament</p>
            <h2 className="text-4xl font-black text-white leading-tight">
              Where every<br />
              ball <span className="text-amber-400">matters.</span>
            </h2>
            <p className="text-slate-400 mt-4 text-base leading-relaxed max-w-sm">
              Real-time scoring, live auctions, and deep statistics. Manage your tournament end-to-end at cricflow.online
            </p>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 gap-3 max-w-sm">
            {STATS.map((s) => (
              <div key={s.label} className="bg-slate-800/60 border border-slate-700 rounded-xl p-4">
                <p className="text-2xl font-black text-amber-400">{s.value}</p>
                <p className="text-slate-400 text-xs font-medium mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <p className="text-slate-600 text-xs relative">© 2025 CricFlow · cricflow.online</p>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 bg-slate-950 lg:bg-slate-900">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-amber-600 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-slate-900 font-black text-sm">CF</span>
            </div>
            <span className="text-2xl font-black tracking-tight">
              <span className="text-white">Cric</span><span className="text-amber-400">Flow</span>
            </span>
          </div>

          {/* Card */}
          <div className="bg-white rounded-2xl shadow-2xl p-8 sm:p-10">
            <div className="mb-7">
              <h1 className="text-2xl font-black text-gray-900">Welcome back</h1>
              <p className="text-gray-500 text-sm mt-1">Sign in to your CricFlow account</p>
            </div>

            <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email address</label>
                <input
                  {...register('email')}
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  className="w-full border border-gray-200 bg-gray-50 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent focus:bg-white transition-all"
                />
                {errors.email && <p className="text-red-500 text-xs mt-1.5 font-medium">{errors.email.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Password</label>
                <input
                  {...register('password')}
                  type="password"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="w-full border border-gray-200 bg-gray-50 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent focus:bg-white transition-all"
                />
                {errors.password && <p className="text-red-500 text-xs mt-1.5 font-medium">{errors.password.message}</p>}
              </div>

              {mutation.isError && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                  <p className="text-red-600 text-sm font-medium">
                    {mutation.error?.response?.data?.detail ?? 'Invalid email or password'}
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={mutation.isPending}
                className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-slate-900 font-bold rounded-xl py-3 text-sm transition-all shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30 hover:-translate-y-0.5 active:translate-y-0"
              >
                {mutation.isPending ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Signing in…
                  </span>
                ) : 'Sign In'}
              </button>
            </form>

            <div className="mt-6">
              <div className="relative flex items-center gap-3">
                <div className="flex-1 border-t border-gray-200" />
                <span className="text-xs text-gray-400 font-medium">or continue with</span>
                <div className="flex-1 border-t border-gray-200" />
              </div>
              <div className="mt-4 flex justify-center">
                {import.meta.env.VITE_GOOGLE_CLIENT_ID ? (
                  <GoogleLogin
                    onSuccess={(res) => googleMutation.mutate(res.credential)}
                    onError={() => {}}
                    size="large"
                    shape="rectangular"
                    theme="outline"
                    text="signin_with"
                  />
                ) : (
                  <p className="text-xs text-gray-400 text-center">Google sign-in not configured</p>
                )}
              </div>
              {googleMutation.isError && (
                <p className="text-red-500 text-xs mt-2 text-center font-medium">
                  {googleMutation.error?.response?.data?.detail ?? 'Google sign-in failed'}
                </p>
              )}
            </div>

            <div className="mt-6 pt-6 border-t border-gray-100 text-center">
              <p className="text-sm text-gray-500">
                New to CricFlow?{' '}
                <Link to="/register" className="text-amber-600 hover:text-amber-500 font-semibold">
                  Create account
                </Link>
              </p>
            </div>
          </div>

          <p className="text-center text-slate-600 text-xs mt-6">cricflow.online · Powered by CricFlow</p>
        </div>
      </div>
    </div>
  );
}
