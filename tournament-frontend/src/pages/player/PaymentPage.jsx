import { useEffect, useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import client from '../../api/client';

export default function PaymentPage() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const user = useAuthStore((s) => s.user);
  const player_id = state?.player_id;
  const stateFee = state?.fee ?? null;

  const [status, setStatus] = useState('idle'); // idle | loading | submitted | error
  const [fee, setFee] = useState(stateFee);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!player_id) return;
    // Register a pending payment so organizer can see it
    setStatus('loading');
    client.post('/payments/create-order', { player_id })
      .then(({ data }) => {
        setFee(data.amount);
        setStatus('submitted');
      })
      .catch((err) => {
        const detail = err?.response?.data?.detail ?? '';
        // Already paid or already pending — treat as submitted
        if (err?.response?.status === 400) {
          setStatus('submitted');
        } else {
          setErrorMsg(detail || 'Could not register payment. Please try again.');
          setStatus('error');
        }
      });
  }, [player_id]);

  if (!player_id) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 flex items-center justify-center p-4">
        <div className="bg-slate-800 rounded-2xl border border-slate-700 p-8 max-w-md w-full text-center">
          <p className="text-4xl mb-4">⚠️</p>
          <p className="text-white font-bold mb-2">No registration found</p>
          <p className="text-slate-400 text-sm mb-6">Please register as a player first.</p>
          <Link to="/tournaments" className="inline-block px-6 py-2.5 bg-amber-400 text-slate-900 font-bold rounded-xl text-sm hover:bg-amber-300 transition-colors">
            Browse Tournaments
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 flex items-center justify-center p-4">
      {/* Nav */}
      <div className="fixed top-0 left-0 right-0 bg-slate-900/80 backdrop-blur border-b border-slate-800 z-10">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-400 hover:text-white text-sm font-medium group">
            <span className="w-8 h-8 rounded-lg bg-slate-800 group-hover:bg-slate-700 flex items-center justify-center">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </span>
            Back
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-gradient-to-br from-amber-400 to-amber-600 rounded-lg flex items-center justify-center">
              <span className="text-slate-900 font-black text-xs">CF</span>
            </div>
            <span className="font-black text-sm"><span className="text-white">Cric</span><span className="text-amber-400">Flow</span></span>
          </div>
        </div>
      </div>

      <div className="w-full max-w-md mt-14">
        {status === 'error' ? (
          <div className="bg-slate-800 rounded-2xl border border-slate-700 p-8 text-center">
            <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-5">
              <svg className="w-10 h-10 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-xl font-black text-white mb-2">Something went wrong</h2>
            <p className="text-red-400 text-sm mb-6">{errorMsg}</p>
            <button onClick={() => window.location.reload()}
              className="w-full py-3 bg-amber-400 hover:bg-amber-300 text-slate-900 font-bold rounded-xl transition-colors">
              Try Again
            </button>
          </div>
        ) : status === 'submitted' ? (
          <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-slate-900 to-blue-950 px-6 py-6 text-center border-b border-slate-700">
              <div className="w-16 h-16 bg-amber-400/10 border-2 border-amber-400/30 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <svg className="w-8 h-8 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-xl font-black text-white">Pay Registration Fee</h2>
              <p className="text-slate-400 text-sm mt-1">Pay the organizer directly to complete registration</p>
            </div>

            <div className="px-6 py-6 space-y-5">
              {/* Amount */}
              <div className="flex items-center justify-between p-4 bg-slate-700/50 rounded-2xl">
                <div>
                  <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Amount to Pay</p>
                  <p className="text-3xl font-black text-amber-400 mt-0.5">
                    {fee !== null ? `₹${fee}` : '—'}
                  </p>
                </div>
                <div className="w-12 h-12 bg-amber-400/10 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
              </div>

              {/* Steps */}
              <div className="space-y-3">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">How to complete payment</p>
                {[
                  { step: '1', text: 'Contact the tournament organizer via phone, WhatsApp, or in person.' },
                  { step: '2', text: `Pay ₹${fee ?? '—'} via UPI, cash, or bank transfer as instructed by the organizer.` },
                  { step: '3', text: 'Once the organizer confirms receipt, they will approve your registration.' },
                  { step: '4', text: 'You will appear as an approved player and be eligible for the auction.' },
                ].map(({ step, text }) => (
                  <div key={step} className="flex gap-3">
                    <div className="w-6 h-6 rounded-full bg-amber-400 text-slate-900 font-black text-xs flex items-center justify-center shrink-0 mt-0.5">{step}</div>
                    <p className="text-slate-300 text-sm">{text}</p>
                  </div>
                ))}
              </div>

              {/* Status banner */}
              <div className="p-4 bg-blue-900/20 border border-blue-800/40 rounded-xl">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-blue-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-blue-300 text-sm font-medium">Your registration is pending payment approval</p>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">Account</span>
                  <span className="text-slate-200 font-medium">{user?.email ?? '—'}</span>
                </div>
              </div>

              <Link to="/tournaments"
                className="block w-full py-3 text-center bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-xl transition-colors">
                Back to Tournaments
              </Link>
            </div>
          </div>
        ) : (
          /* loading */
          <div className="bg-slate-800 rounded-2xl border border-slate-700 p-12 flex flex-col items-center gap-4">
            <svg className="animate-spin w-10 h-10 text-amber-400" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <p className="text-slate-400 text-sm">Setting up your payment record…</p>
          </div>
        )}
      </div>
    </div>
  );
}
