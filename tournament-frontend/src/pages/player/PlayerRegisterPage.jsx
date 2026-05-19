import { useRef, useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { registerPlayer, getMyPlayers } from '../../api/players';
import { getTournament } from '../../api/tournaments';
import { updateProfile, getMe } from '../../api/auth';
import { useAuthStore } from '../../store/authStore';

const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  age: z.coerce.number().int().min(15, 'Must be at least 15').max(60, 'Must be 60 or under'),
  address: z.string().min(5, 'Please enter your full address'),
  player_type: z.enum(['batsman', 'bowler', 'all_rounder', 'wicket_keeper']),
  tshirt_size: z.enum(['S', 'M', 'L', 'XL', 'XXL']),
  phone: z.string().max(20).optional().or(z.literal('')),
});

const PLAYER_TYPES = [
  {
    value: 'batsman',
    label: 'Batsman',
    icon: '🏏',
    desc: 'Specialist batter',
    active: 'border-blue-500 bg-blue-50 text-blue-700',
    dot: 'bg-blue-500',
  },
  {
    value: 'bowler',
    label: 'Bowler',
    icon: '⚡',
    desc: 'Pace or spin',
    active: 'border-emerald-500 bg-emerald-50 text-emerald-700',
    dot: 'bg-emerald-500',
  },
  {
    value: 'all_rounder',
    label: 'All-Rounder',
    icon: '⭐',
    desc: 'Bat & ball',
    active: 'border-violet-500 bg-violet-50 text-violet-700',
    dot: 'bg-violet-500',
  },
  {
    value: 'wicket_keeper',
    label: 'Keeper',
    icon: '🧤',
    desc: 'Wicket keeper',
    active: 'border-orange-500 bg-orange-50 text-orange-700',
    dot: 'bg-orange-500',
  },
];

const STEPS = ['Profile', 'Role', 'Review'];

function Field({ label, required, error, children }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-1.5">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      {children}
      {error && (
        <p className="text-red-500 text-xs mt-1.5 font-medium flex items-center gap-1">
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
}

export default function PlayerRegisterPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tournamentId = searchParams.get('tournament_id');
  const { user, setAuth, token } = useAuthStore();
  const fileRef = useRef(null);
  // Pre-fill from user profile picture
  const [photoPreview, setPhotoPreview] = useState(user?.avatar_url ?? null);
  const [photoFile, setPhotoFile] = useState(null);
  // true when displaying the existing profile photo (no new file chosen)
  const [usingProfilePhoto, setUsingProfilePhoto] = useState(!!user?.avatar_url);
  const [photoError, setPhotoError] = useState('');
  const [step, setStep] = useState(0); // 0=Profile, 1=Role, 2=Review

  const { data: tournament } = useQuery({
    queryKey: ['tournament', tournamentId],
    queryFn: () => getTournament(tournamentId),
    enabled: !!tournamentId,
  });

  const { data: myPlayers = [], isLoading: loadingPlayers } = useQuery({
    queryKey: ['my-players'],
    queryFn: getMyPlayers,
    enabled: !!user && !!tournamentId,
  });
  const standalonePlayer = myPlayers.find((p) => !p.tournament_id) ?? null;

  // If we have a standalone profile and a tournament, pre-fill and jump to review
  useEffect(() => {
    if (!standalonePlayer || !tournamentId) return;
    setValue('name', standalonePlayer.name);
    setValue('age', standalonePlayer.age);
    setValue('address', standalonePlayer.address);
    setValue('player_type', standalonePlayer.player_type);
    setValue('tshirt_size', standalonePlayer.tshirt_size);
    if (standalonePlayer.phone) setValue('phone', standalonePlayer.phone);
    if (standalonePlayer.photo_url) {
      setPhotoPreview(standalonePlayer.photo_url);
      setUsingProfilePhoto(true);
    }
    setStep(2);
  }, [standalonePlayer?.id, tournamentId]);

  const registrationFee = tournament?.registration_fee ?? 150;
  const backTo = tournamentId ? `/tournaments/${tournamentId}` : '/tournaments';

  const { register, handleSubmit, watch, setValue, trigger, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { player_type: 'batsman', tshirt_size: 'M' },
  });

  const selectedType = watch('player_type');
  const selectedSize = watch('tshirt_size');
  const watchedName = watch('name');
  const watchedAge = watch('age');

  const activeType = PLAYER_TYPES.find((p) => p.value === selectedType);

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!['image/jpeg', 'image/jpg', 'image/png'].includes(file.type)) {
      setPhotoError('Only JPEG or PNG images are allowed');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setPhotoError('Photo must be under 5 MB');
      return;
    }
    setPhotoError('');
    setPhotoFile(file);
    setUsingProfilePhoto(false);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const mutation = useMutation({
    mutationFn: async (values) => {
      const hasPhoto = photoFile || usingProfilePhoto;
      if (!hasPhoto) throw new Error('Photo is required');

      const fd = new FormData();
      fd.append('name', values.name);
      fd.append('age', values.age);
      fd.append('address', values.address);
      fd.append('player_type', values.player_type);
      fd.append('tshirt_size', values.tshirt_size);
      if (values.phone) fd.append('phone', values.phone);
      if (tournamentId) fd.append('tournament_id', tournamentId);

      if (photoFile) {
        fd.append('photo', photoFile);
        const profileForm = new FormData();
        profileForm.append('name', user?.name ?? values.name);
        profileForm.append('avatar', photoFile);
        await updateProfile(profileForm);
        const { data: updated } = await getMe();
        setAuth(token, updated);
      } else {
        fd.append('photo_url', user?.avatar_url ?? '');
      }

      return registerPlayer(fd);
    },
    onSuccess: ({ data }) => {
      if (tournamentId) {
        navigate('/player/payment', { state: { player_id: data.id, fee: registrationFee } });
      } else {
        navigate('/my-team');
      }
    },
  });

  const goNext = async () => {
    if (step === 0) {
      if (!photoFile && !usingProfilePhoto) { setPhotoError('Please upload your photo'); return; }
      const ok = await trigger(['name', 'age', 'address']);
      if (ok) setStep(1);
    } else if (step === 1) {
      setStep(2);
    }
  };

  const onSubmit = (values) => {
    if (!photoFile && !usingProfilePhoto) { setPhotoError('Photo is required'); return; }
    mutation.mutate(values);
  };

  // Show spinner while checking for existing profile (avoid flashing step 0)
  if (tournamentId && loadingPlayers) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950">
      {/* Top nav bar */}
      <div className="bg-slate-900/80 backdrop-blur border-b border-slate-800 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          {/* Back button */}
          <Link
            to={backTo}
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm font-medium group"
          >
            <span className="w-8 h-8 rounded-lg bg-slate-800 group-hover:bg-slate-700 flex items-center justify-center transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </span>
            <span>{tournament ? tournament.name : 'Back'}</span>
          </Link>

          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-gradient-to-br from-amber-400 to-amber-600 rounded-lg flex items-center justify-center">
              <span className="text-slate-900 font-black text-xs">CF</span>
            </div>
            <span className="font-black text-sm">
              <span className="text-white">Cric</span><span className="text-amber-400">Flow</span>
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Tournament banner */}
        {tournament && (
          <div className="mb-6 bg-amber-500/10 border border-amber-500/20 rounded-2xl px-5 py-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-500/20 rounded-xl flex items-center justify-center text-xl">🏏</div>
              <div>
                <p className="text-xs text-amber-400/70 font-semibold uppercase tracking-wider">Registering for</p>
                <p className="text-white font-bold">{tournament.name}</p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="text-xs text-slate-400 font-medium">Registration Fee</p>
              <p className="text-2xl font-black text-amber-400">₹{registrationFee}</p>
            </div>
          </div>
        )}

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-8">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-2 flex-1">
              <div className={`flex items-center gap-2 ${i <= step ? 'opacity-100' : 'opacity-40'}`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                  i < step ? 'bg-amber-400 text-slate-900'
                  : i === step ? 'bg-amber-400 text-slate-900 ring-4 ring-amber-400/30'
                  : 'bg-slate-700 text-slate-400'
                }`}>
                  {i < step ? (
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : i + 1}
                </div>
                <span className={`text-sm font-semibold ${i === step ? 'text-white' : 'text-slate-400'}`}>{s}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-px mx-2 ${i < step ? 'bg-amber-400' : 'bg-slate-700'}`} />
              )}
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          {/* ── STEP 0: Profile ── */}
          {step === 0 && (
            <div className="space-y-6">
              {/* Photo upload */}
              <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50">
                <h2 className="text-white font-bold text-base mb-4">Profile Photo</h2>
                <div className="flex items-center gap-6">
                  {/* Preview circle */}
                  <div
                    onClick={() => fileRef.current?.click()}
                    className="relative cursor-pointer group shrink-0"
                  >
                    <div className={`w-24 h-24 rounded-2xl overflow-hidden border-2 transition-all ${
                      photoPreview ? 'border-emerald-400' : 'border-dashed border-slate-600 group-hover:border-amber-400'
                    }`}>
                      {photoPreview ? (
                        <img src={photoPreview} alt="preview" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-slate-700/50 flex flex-col items-center justify-center gap-1">
                          <svg className="w-8 h-8 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <div className={`absolute -bottom-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center shadow-lg ${
                      photoPreview ? 'bg-emerald-500' : 'bg-amber-500 group-hover:bg-amber-400'
                    } transition-colors`}>
                      {photoPreview ? (
                        <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="w-3.5 h-3.5 text-slate-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                        </svg>
                      )}
                    </div>
                  </div>

                  <div className="flex-1">
                    <p className="text-slate-300 text-sm font-medium mb-1">
                      {usingProfilePhoto ? 'Using your profile photo' : photoFile ? 'Photo ready!' : 'Upload your photo'}
                    </p>
                    {usingProfilePhoto && (
                      <p className="text-emerald-400 text-xs mb-2 font-medium">
                        ✓ Auto-filled from your profile
                      </p>
                    )}
                    <p className="text-slate-500 text-xs mb-3">Clear face photo · JPG or PNG · Max 5 MB</p>
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold rounded-xl transition-colors"
                    >
                      {photoPreview ? 'Change Photo' : 'Choose File'}
                    </button>
                  </div>
                </div>
                <input ref={fileRef} type="file" accept="image/jpeg,image/png" className="hidden" onChange={handlePhotoChange} />
                {photoError && (
                  <p className="text-red-400 text-xs mt-3 font-medium flex items-center gap-1">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {photoError}
                  </p>
                )}
              </div>

              {/* Personal info */}
              <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50 space-y-5">
                <h2 className="text-white font-bold text-base">Personal Information</h2>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2">
                    <Field label="Full Name" required error={errors.name?.message}>
                      <input
                        {...register('name')}
                        placeholder="Ravi Kumar"
                        className="w-full bg-slate-700/50 border border-slate-600 text-white placeholder-slate-500 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all"
                      />
                    </Field>
                  </div>
                  <div>
                    <Field label="Age" required error={errors.age?.message}>
                      <input
                        {...register('age')}
                        type="number"
                        placeholder="25"
                        min={15}
                        max={60}
                        className="w-full bg-slate-700/50 border border-slate-600 text-white placeholder-slate-500 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all"
                      />
                    </Field>
                  </div>
                </div>

                <Field label="Residential Address" required error={errors.address?.message}>
                  <textarea
                    {...register('address')}
                    rows={2}
                    placeholder="12, MG Road, Bengaluru, Karnataka 560001"
                    className="w-full bg-slate-700/50 border border-slate-600 text-white placeholder-slate-500 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all resize-none"
                  />
                </Field>

                <Field label="Phone Number" error={errors.phone?.message}>
                  <input
                    {...register('phone')}
                    type="tel"
                    placeholder="+91 98765 43210"
                    className="w-full bg-slate-700/50 border border-slate-600 text-white placeholder-slate-500 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all"
                  />
                </Field>
              </div>

              <button
                type="button"
                onClick={goNext}
                className="w-full py-3.5 bg-amber-400 hover:bg-amber-300 text-slate-900 font-bold rounded-xl transition-all shadow-lg shadow-amber-400/20 hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2"
              >
                Continue — Choose Role
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          )}

          {/* ── STEP 1: Role ── */}
          {step === 1 && (
            <div className="space-y-6">
              {/* Player Type */}
              <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50">
                <h2 className="text-white font-bold text-base mb-1">What's your role?</h2>
                <p className="text-slate-400 text-sm mb-5">Select the position you play best</p>
                <div className="grid grid-cols-2 gap-3">
                  {PLAYER_TYPES.map((pt) => (
                    <button
                      key={pt.value}
                      type="button"
                      onClick={() => setValue('player_type', pt.value)}
                      className={`p-4 rounded-2xl border-2 text-left transition-all ${
                        selectedType === pt.value
                          ? pt.active
                          : 'border-slate-700 bg-slate-700/30 hover:border-slate-500'
                      }`}
                    >
                      <span className="text-3xl block mb-2">{pt.icon}</span>
                      <p className={`font-bold text-sm ${selectedType === pt.value ? '' : 'text-white'}`}>{pt.label}</p>
                      <p className={`text-xs mt-0.5 ${selectedType === pt.value ? 'opacity-70' : 'text-slate-400'}`}>{pt.desc}</p>
                    </button>
                  ))}
                </div>
                <input type="hidden" {...register('player_type')} />
              </div>

              {/* T-Shirt Size */}
              <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50">
                <h2 className="text-white font-bold text-base mb-1">T-Shirt Size</h2>
                <p className="text-slate-400 text-sm mb-4">For your tournament jersey</p>
                <div className="flex gap-2">
                  {['S', 'M', 'L', 'XL', 'XXL'].map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setValue('tshirt_size', size)}
                      className={`flex-1 py-3 rounded-xl border-2 text-sm font-black transition-all ${
                        selectedSize === size
                          ? 'border-amber-400 bg-amber-400/10 text-amber-400'
                          : 'border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-300'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
                <input type="hidden" {...register('tshirt_size')} />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep(0)}
                  className="flex-1 py-3.5 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                  </svg>
                  Back
                </button>
                <button
                  type="button"
                  onClick={goNext}
                  className="flex-2 flex-grow py-3.5 bg-amber-400 hover:bg-amber-300 text-slate-900 font-bold rounded-xl transition-all shadow-lg shadow-amber-400/20 flex items-center justify-center gap-2"
                >
                  Review & Submit
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 2: Review ── */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50">
                <h2 className="text-white font-bold text-base mb-5">Review Your Registration</h2>

                {/* Photo + name row */}
                <div className="flex items-center gap-4 p-4 bg-slate-700/40 rounded-2xl mb-5">
                  {photoPreview && (
                    <img src={photoPreview} alt="you" className="w-16 h-16 rounded-xl object-cover shrink-0" />
                  )}
                  <div>
                    <p className="text-white font-bold text-lg">{watchedName || '—'}</p>
                    <p className="text-slate-400 text-sm">Age {watchedAge || '—'}</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className={`w-2 h-2 rounded-full ${activeType?.dot}`} />
                      <span className="text-xs font-semibold text-slate-300">{activeType?.label} · {selectedSize}</span>
                    </div>
                  </div>
                </div>

                {/* Summary rows */}
                <div className="space-y-3">
                  {[
                    { label: 'Tournament', value: tournament?.name ?? 'Standalone (no tournament)' },
                    { label: 'Player Role', value: activeType?.label },
                    { label: 'T-Shirt Size', value: selectedSize },
                    ...(watch('phone') ? [{ label: 'Phone', value: watch('phone') }] : []),
                    ...(tournamentId ? [{ label: 'Registration Fee', value: `₹${registrationFee}`, highlight: true }] : []),
                  ].map(({ label, value, highlight }) => (
                    <div key={label} className="flex items-center justify-between py-2 border-b border-slate-700/50 last:border-0">
                      <span className="text-slate-400 text-sm">{label}</span>
                      <span className={`text-sm font-bold ${highlight ? 'text-amber-400 text-base' : 'text-white'}`}>{value}</span>
                    </div>
                  ))}
                </div>

                {standalonePlayer && tournamentId && (
                  <div className="mt-4 p-3 bg-emerald-900/30 border border-emerald-800/50 rounded-xl">
                    <p className="text-emerald-300 text-xs font-medium flex items-center gap-2">
                      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                      Auto-filled from your player profile — no changes needed.
                    </p>
                  </div>
                )}
                <div className="mt-3 p-3 bg-blue-900/30 border border-blue-800/50 rounded-xl">
                  <p className="text-blue-300 text-xs font-medium flex items-start gap-2">
                    <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {tournamentId
                      ? "After submitting, you'll be taken to payment. Your registration is confirmed once the organizer approves your profile."
                      : 'Your standalone player profile will be created and you can join a team from the My Team page.'}
                  </p>
                </div>
              </div>

              {mutation.isError && (
                <div className="bg-red-900/30 border border-red-800/50 rounded-xl px-4 py-3">
                  <p className="text-red-400 text-sm font-medium flex items-center gap-2">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {typeof mutation.error?.response?.data?.detail === 'string'
                      ? mutation.error.response.data.detail
                      : mutation.error?.message ?? 'Registration failed. Please try again.'}
                  </p>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex-1 py-3.5 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                  </svg>
                  Back
                </button>
                <button
                  type="submit"
                  disabled={mutation.isPending}
                  className="flex-grow py-3.5 bg-amber-400 hover:bg-amber-300 disabled:opacity-60 text-slate-900 font-black rounded-xl transition-all shadow-lg shadow-amber-400/20 hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2"
                >
                  {mutation.isPending ? (
                    <>
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Submitting…
                    </>
                  ) : tournamentId ? (
                    <>
                      Confirm & Pay ₹{registrationFee}
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                      </svg>
                    </>
                  ) : (
                    <>
                      Create Player Profile
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                      </svg>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
