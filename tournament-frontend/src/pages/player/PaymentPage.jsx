import { useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import client from '../../api/client';
import { useAuthStore } from '../../store/authStore';

const RAZORPAY_KEY = import.meta.env.VITE_RAZORPAY_KEY_ID;

function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (document.getElementById('rzp-script')) return resolve(true);
    const script = document.createElement('script');
    script.id = 'rzp-script';
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function PaymentPage() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const user = useAuthStore((s) => s.user);
  const player_id = state?.player_id;
  const stateFee = state?.fee ?? null;

  const [payStatus, setPayStatus] = useState('idle'); // idle | loading | success | failed
  const [errorMsg, setErrorMsg] = useState('');
  const [actualFee, setActualFee] = useState(null);

  const displayFee = actualFee ?? stateFee;

  const verifyMutation = useMutation({
    mutationFn: (data) => client.post('/payments/verify', data),
    onSuccess: () => setPayStatus('success'),
    onError: (err) => {
      setPayStatus('failed');
      setErrorMsg(err?.response?.data?.detail ?? 'Payment verification failed');
    },
  });

  const startPayment = async () => {
    if (!player_id) {
      setErrorMsg('No player ID found. Please register first.');
      setPayStatus('failed');
      return;
    }

    setPayStatus('loading');
    const loaded = await loadRazorpayScript();
    if (!loaded) {
      setPayStatus('failed');
      setErrorMsg('Could not load Razorpay. Check your internet connection.');
      return;
    }

    let orderData;
    try {
      const { data } = await client.post('/payments/create-order', { player_id });
      orderData = data;
      // store real fee from backend
      setActualFee(Number(orderData.amount) / 100);
    } catch (err) {
      setPayStatus('failed');
      setErrorMsg(err?.response?.data?.detail ?? 'Could not create payment order');
      return;
    }

    const options = {
      key: RAZORPAY_KEY,
      amount: orderData.amount,
      currency: orderData.currency,
      name: 'CricFlow',
      description: 'Player Registration Fee',
      order_id: orderData.razorpay_order_id,
      prefill: { name: user?.name ?? '', email: user?.email ?? '' },
      theme: { color: '#f59e0b' },
      method: {
        upi: true,
        card: true,
        netbanking: true,
        wallet: true,
        paylater: true,
      },
      config: {
        display: {
          preferences: { show_default_blocks: true },
          blocks: {
            upi: { name: 'Pay via UPI', instruments: [{ method: 'upi' }] },
          },
          sequence: ['block.upi'],
          hide: [],
        },
      },
      handler: (response) => {
        verifyMutation.mutate({
          razorpay_order_id: response.razorpay_order_id,
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_signature: response.razorpay_signature,
        });
      },
      modal: {
        ondismiss: () => setPayStatus('idle'),
      },
    };

    const rzp = new window.Razorpay(options);
    rzp.on('payment.failed', (response) => {
      setPayStatus('failed');
      setErrorMsg(response.error?.description ?? 'Payment failed');
    });
    rzp.open();
  };

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
        {payStatus === 'success' ? (
          <div className="bg-slate-800 rounded-2xl border border-slate-700 p-8 text-center">
            <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-5">
              <svg className="w-10 h-10 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-black text-white mb-2">Payment Successful!</h2>
            <p className="text-slate-400 text-sm leading-relaxed mb-6">
              Your registration fee has been received. The organizer will review and approve your profile before the auction.
            </p>
            <div className="p-4 bg-emerald-900/20 border border-emerald-800/40 rounded-xl mb-6">
              <p className="text-emerald-400 text-sm font-medium">✓ Fee paid · Pending organizer approval</p>
            </div>
            <Link to="/tournaments" className="block w-full py-3 bg-amber-400 hover:bg-amber-300 text-slate-900 font-bold rounded-xl transition-colors text-center">
              Back to Tournaments
            </Link>
          </div>
        ) : payStatus === 'failed' ? (
          <div className="bg-slate-800 rounded-2xl border border-slate-700 p-8 text-center">
            <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-5">
              <svg className="w-10 h-10 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-2xl font-black text-white mb-2">Payment Failed</h2>
            <p className="text-red-400 text-sm mb-6">{errorMsg}</p>
            <button
              onClick={() => { setPayStatus('idle'); setErrorMsg(''); }}
              className="w-full py-3 bg-amber-400 hover:bg-amber-300 text-slate-900 font-bold rounded-xl transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : (
          <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-slate-900 to-blue-950 px-6 py-6 text-center border-b border-slate-700">
              <div className="w-16 h-16 bg-amber-400/10 border-2 border-amber-400/30 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <svg className="w-8 h-8 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </div>
              <h2 className="text-xl font-black text-white">Registration Fee Payment</h2>
              <p className="text-slate-400 text-sm mt-1">Complete payment to finalise your registration</p>
            </div>

            {/* Fee display */}
            <div className="px-6 py-6">
              <div className="flex items-center justify-between p-4 bg-slate-700/50 rounded-2xl mb-6">
                <div>
                  <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Amount to Pay</p>
                  <p className="text-3xl font-black text-amber-400 mt-0.5">
                    {displayFee !== null ? `₹${displayFee}` : (
                      <span className="flex items-center gap-2">
                        <svg className="animate-spin w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        <span className="text-base text-slate-400">Loading…</span>
                      </span>
                    )}
                  </p>
                </div>
                <div className="w-12 h-12 bg-amber-400/10 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>

              {/* Info rows */}
              <div className="space-y-3 mb-6">
                {[
                  { label: 'Payment for', value: 'Player Registration' },
                  { label: 'Account', value: user?.email ?? '—' },
                  { label: 'Secured by', value: 'Razorpay' },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between text-sm">
                    <span className="text-slate-400">{label}</span>
                    <span className="text-slate-200 font-medium">{value}</span>
                  </div>
                ))}
              </div>

              {/* Pay button */}
              <button
                onClick={startPayment}
                disabled={payStatus === 'loading' || verifyMutation.isPending}
                className="w-full py-4 bg-amber-400 hover:bg-amber-300 disabled:opacity-60 text-slate-900 font-black rounded-xl transition-all shadow-lg shadow-amber-400/20 hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2 text-sm"
              >
                {payStatus === 'loading' || verifyMutation.isPending ? (
                  <>
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    {verifyMutation.isPending ? 'Verifying…' : 'Opening Razorpay…'}
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                    Pay {displayFee !== null ? `₹${displayFee}` : 'Now'} with Razorpay
                  </>
                )}
              </button>

              <p className="text-center text-slate-500 text-xs mt-4">
                🔒 Payments are encrypted and processed securely by Razorpay
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
