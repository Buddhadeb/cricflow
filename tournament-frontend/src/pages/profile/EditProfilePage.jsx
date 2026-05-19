import { useRef, useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { updateProfile, getMe } from '../../api/auth';
import { getMyPlayers, updateMyPlayer, registerPlayer } from '../../api/players';
import { useAuthStore } from '../../store/authStore';
import NavBar from '../../components/NavBar';

const PLAYER_TYPES = [
  { value: 'batsman',       label: 'Batsman',     icon: '🏏' },
  { value: 'bowler',        label: 'Bowler',       icon: '⚡' },
  { value: 'all_rounder',   label: 'All-Rounder',  icon: '⭐' },
  { value: 'wicket_keeper', label: 'Keeper',       icon: '🧤' },
];

const SIZES = ['S', 'M', 'L', 'XL', 'XXL'];

function calcAge(dob) {
  if (!dob) return null;
  const today = new Date();
  const birth = new Date(dob);
  let age = today.getFullYear() - birth.getFullYear();
  if (today < new Date(today.getFullYear(), birth.getMonth(), birth.getDate())) age--;
  return age;
}

function completionFields(user, player) {
  return [
    { label: 'Profile photo',   done: !!user?.avatar_url },
    { label: 'Player type',     done: !!player?.player_type },
    { label: 'T-shirt size',    done: !!player?.tshirt_size },
    { label: 'Date of birth',   done: !!player?.dob },
    { label: 'Jersey number',   done: !!player?.jersey_number },
    { label: 'Phone number',    done: !!player?.phone },
    { label: 'Address',         done: !!player?.address },
  ];
}

export default function EditProfilePage() {
  const { user, setAuth, token } = useAuthStore();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fileInputRef = useRef(null);

  // ── Account state ──
  const [name, setName] = useState(user?.name ?? '');
  const [preview, setPreview] = useState(user?.avatar_url ?? null);
  const [avatarFile, setAvatarFile] = useState(null);

  // ── Player profile state ──
  const [pType, setPType] = useState('batsman');
  const [pSize, setPSize] = useState('M');
  const [pDob, setPDob] = useState('');
  const [pJersey, setPJersey] = useState('');
  const [pPhone, setPPhone] = useState('');
  const [pAddress, setPAddress] = useState('');
  const [playerError, setPlayerError] = useState('');

  const { data: myPlayers = [] } = useQuery({
    queryKey: ['my-players'],
    queryFn: getMyPlayers,
    enabled: !!user,
  });

  const standalonePlayer = myPlayers.find((p) => !p.tournament_id) ?? null;

  // Pre-fill player form when profile loads
  useEffect(() => {
    if (standalonePlayer) {
      setPType(standalonePlayer.player_type ?? 'batsman');
      setPSize(standalonePlayer.tshirt_size ?? 'M');
      setPDob(standalonePlayer.dob ?? '');
      setPJersey(standalonePlayer.jersey_number?.toString() ?? '');
      setPPhone(standalonePlayer.phone ?? '');
      setPAddress(standalonePlayer.address ?? '');
    }
  }, [standalonePlayer?.id]);

  const fields = completionFields(user, standalonePlayer
    ? { ...standalonePlayer, dob: pDob || standalonePlayer.dob, jersey_number: pJersey || standalonePlayer.jersey_number, phone: pPhone || standalonePlayer.phone }
    : null
  );
  const completedCount = fields.filter((f) => f.done).length;
  const pct = Math.round((completedCount / fields.length) * 100);

  // ── Account save ──
  const accountMut = useMutation({
    mutationFn: async () => {
      const form = new FormData();
      form.append('name', name.trim());
      if (avatarFile) form.append('avatar', avatarFile);
      await updateProfile(form);
      const { data: updated } = await getMe();
      return updated;
    },
    onSuccess: (updated) => {
      setAuth(token, updated);
      qc.invalidateQueries({ queryKey: ['my-players'] });
    },
  });

  // ── Player create ──
  const createMut = useMutation({
    mutationFn: async () => {
      const age = calcAge(pDob);
      if (!age || age < 15 || age > 60) throw new Error('Valid date of birth required (age 15–60)');
      if (!pAddress.trim()) throw new Error('Address is required');
      const fd = new FormData();
      fd.append('name', user?.name ?? name);
      fd.append('age', age);
      fd.append('address', pAddress.trim());
      fd.append('player_type', pType);
      fd.append('tshirt_size', pSize);
      if (pDob) fd.append('dob', pDob);
      if (pJersey) fd.append('jersey_number', pJersey);
      if (pPhone) fd.append('phone', pPhone);
      if (user?.avatar_url) fd.append('photo_url', user.avatar_url);
      return registerPlayer(fd);
    },
    onSuccess: () => {
      setPlayerError('');
      qc.invalidateQueries({ queryKey: ['my-players'] });
    },
    onError: (e) => setPlayerError(e?.response?.data?.detail ?? e?.message ?? 'Failed to create profile'),
  });

  // ── Player update ──
  const updateMut = useMutation({
    mutationFn: () => {
      const payload = {
        player_type: pType,
        tshirt_size: pSize,
        phone: pPhone || null,
        address: pAddress || null,
        jersey_number: pJersey ? Number(pJersey) : null,
        dob: pDob || null,
      };
      if (pDob) payload.age = calcAge(pDob);
      return updateMyPlayer(payload);
    },
    onSuccess: () => {
      setPlayerError('');
      qc.invalidateQueries({ queryKey: ['my-players'] });
    },
    onError: (e) => setPlayerError(e?.response?.data?.detail ?? 'Failed to update profile'),
  });

  const handleAvatarFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setAvatarFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const initials = (user?.name ?? user?.email ?? '?')[0].toUpperCase();
  const age = calcAge(pDob);

  const barColor = pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-400' : 'bg-red-400';

  return (
    <div className="min-h-screen bg-slate-950">
      <NavBar />
      <div className="max-w-lg mx-auto px-4 py-10 space-y-5">

        {/* ── Profile completion card ── */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-bold text-white">Profile Completion</p>
              <p className="text-xs text-slate-500 mt-0.5">
                {pct === 100 ? 'All done! Your profile is complete.' : `${fields.length - completedCount} field${fields.length - completedCount !== 1 ? 's' : ''} remaining`}
              </p>
            </div>
            <span className={`text-2xl font-black ${pct >= 80 ? 'text-emerald-400' : pct >= 50 ? 'text-amber-400' : 'text-red-400'}`}>
              {pct}%
            </span>
          </div>
          <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${pct}%` }} />
          </div>
          <div className="grid grid-cols-2 gap-1.5 mt-3">
            {fields.map((f) => (
              <div key={f.label} className="flex items-center gap-1.5">
                <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 ${f.done ? 'bg-emerald-500' : 'bg-slate-700'}`}>
                  {f.done && (
                    <svg className="w-2 h-2 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </span>
                <span className={`text-xs ${f.done ? 'text-slate-400' : 'text-slate-500'}`}>{f.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Account section ── */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <h2 className="text-base font-bold text-white mb-5">Account</h2>

          <div className="flex flex-col items-center mb-6">
            <div className="relative cursor-pointer group" onClick={() => fileInputRef.current?.click()}>
              {preview ? (
                <img src={preview} alt="Avatar" className="w-20 h-20 rounded-2xl object-cover border-2 border-slate-700 group-hover:border-amber-500 transition-colors" />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-2xl font-bold border-2 border-slate-700 group-hover:border-amber-500 transition-colors">
                  {initials}
                </div>
              )}
              <div className="absolute inset-0 rounded-2xl bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
            </div>
            <p className="text-slate-400 text-xs mt-2">Click to change photo</p>
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png" className="hidden" onChange={handleAvatarFile} />
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Display Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all"
                placeholder="Your name"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Email</label>
              <input
                type="email"
                value={user?.email ?? ''}
                readOnly
                className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-2.5 text-slate-500 text-sm cursor-not-allowed"
              />
            </div>
          </div>

          {accountMut.isSuccess && <p className="text-emerald-400 text-xs mt-3 font-medium">✓ Account saved</p>}
          {accountMut.isError && <p className="text-red-400 text-xs mt-3">{accountMut.error?.response?.data?.detail ?? 'Failed to save'}</p>}

          <button
            onClick={() => accountMut.mutate()}
            disabled={accountMut.isPending || name.trim().length < 2}
            className="w-full mt-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-900 font-bold text-sm transition-all"
          >
            {accountMut.isPending ? 'Saving…' : 'Save Account'}
          </button>
        </div>

        {/* ── Player profile section ── */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-base font-bold text-white">Player Profile</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {standalonePlayer ? 'Update your cricket details' : 'Create your cricket identity'}
              </p>
            </div>
            {standalonePlayer && (
              <span className="text-xs font-bold px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg">
                Active
              </span>
            )}
          </div>

          <div className="space-y-5">
            {/* Player type */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-2">Playing Role</label>
              <div className="grid grid-cols-4 gap-2">
                {PLAYER_TYPES.map((pt) => (
                  <button
                    key={pt.value}
                    type="button"
                    onClick={() => setPType(pt.value)}
                    className={`p-2.5 rounded-xl border-2 text-center transition-all ${
                      pType === pt.value
                        ? 'border-amber-400 bg-amber-400/10 text-amber-300'
                        : 'border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    <span className="text-xl block">{pt.icon}</span>
                    <span className="text-xs font-semibold mt-1 block">{pt.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Jersey + DOB row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Jersey Number</label>
                <input
                  type="number"
                  value={pJersey}
                  onChange={(e) => setPJersey(e.target.value)}
                  placeholder="e.g. 18"
                  min={1} max={99}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                  Date of Birth {age && <span className="text-amber-400 font-bold">· Age {age}</span>}
                </label>
                <input
                  type="date"
                  value={pDob}
                  onChange={(e) => setPDob(e.target.value)}
                  max={new Date(new Date().setFullYear(new Date().getFullYear() - 15)).toISOString().split('T')[0]}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all"
                />
              </div>
            </div>

            {/* T-shirt size */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-2">T-Shirt Size</label>
              <div className="flex gap-2">
                {SIZES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setPSize(s)}
                    className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-black transition-all ${
                      pSize === s
                        ? 'border-amber-400 bg-amber-400/10 text-amber-400'
                        : 'border-slate-700 text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Phone Number</label>
              <input
                type="tel"
                value={pPhone}
                onChange={(e) => setPPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all"
              />
            </div>

            {/* Address */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                Address {!standalonePlayer && <span className="text-red-400">*</span>}
              </label>
              <textarea
                value={pAddress}
                onChange={(e) => setPAddress(e.target.value)}
                rows={2}
                placeholder="12, MG Road, Bengaluru, Karnataka 560001"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all resize-none"
              />
            </div>
          </div>

          {playerError && (
            <p className="text-red-400 text-xs mt-3 font-medium">⚠️ {playerError}</p>
          )}
          {(createMut.isSuccess || updateMut.isSuccess) && (
            <p className="text-emerald-400 text-xs mt-3 font-medium">✓ Player profile saved</p>
          )}

          <button
            onClick={() => {
              setPlayerError('');
              if (standalonePlayer) updateMut.mutate();
              else createMut.mutate();
            }}
            disabled={createMut.isPending || updateMut.isPending}
            className="w-full mt-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-900 font-bold text-sm transition-all"
          >
            {createMut.isPending || updateMut.isPending
              ? 'Saving…'
              : standalonePlayer ? 'Save Player Profile' : 'Create Player Profile'}
          </button>
        </div>

      </div>
    </div>
  );
}
