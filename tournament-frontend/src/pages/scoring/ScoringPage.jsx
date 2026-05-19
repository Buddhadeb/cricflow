import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { getMatch, getPlayingXI } from '../../api/matches';
import { recordDelivery, undoLastBall } from '../../api/scoring';
import { useScoringWS } from '../../hooks/useScoringWS';
import NavBar from '../../components/NavBar';

const DELIVERY_TYPES = [
  { value: 'normal', label: 'Normal' },
  { value: 'wide', label: 'Wide' },
  { value: 'no_ball', label: 'No Ball' },
  { value: 'bye', label: 'Bye' },
  { value: 'leg_bye', label: 'Leg Bye' },
];

const WICKET_TYPES = ['bowled', 'caught', 'lbw', 'run_out', 'stumped', 'hit_wicket', 'obstructing_field'];

const DEFAULT_FORM = {
  bowler_id: '',
  batsman_id: '',
  non_striker_id: '',
  runs_batsman: 0,
  runs_extras: 0,
  delivery_type: 'normal',
  is_wicket: false,
  wicket_type: '',
  fielder_id: '',
};

export default function ScoringPage() {
  const { matchId } = useParams();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [form, setForm] = useState(DEFAULT_FORM);
  const [lastScore, setLastScore] = useState('');
  const [lastOvers, setLastOvers] = useState('');
  const [feed, setFeed] = useState([]);
  const { lastEvent, connected } = useScoringWS(matchId);

  const { data: match } = useQuery({
    queryKey: ['match', matchId],
    queryFn: () => getMatch(matchId).then((r) => r.data),
  });

  // Load playing XI for both teams (to populate player selects)
  const teamAId = match?.team_a_id;
  const teamBId = match?.team_b_id;

  const { data: xiA = [] } = useQuery({
    queryKey: ['xi', matchId, teamAId],
    queryFn: () => getPlayingXI(matchId, teamAId).then((r) => r.data),
    enabled: !!teamAId,
  });
  const { data: xiB = [] } = useQuery({
    queryKey: ['xi', matchId, teamBId],
    queryFn: () => getPlayingXI(matchId, teamBId).then((r) => r.data),
    enabled: !!teamBId,
  });

  const allPlayers = [...xiA, ...xiB];

  useEffect(() => {
    if (!lastEvent) return;
    if (lastEvent.score) setLastScore(lastEvent.score);
    if (lastEvent.overs) setLastOvers(lastEvent.overs);
    setFeed((prev) => [lastEvent, ...prev].slice(0, 30));
  }, [lastEvent]);

  const deliveryMut = useMutation({
    mutationFn: (data) => recordDelivery(matchId, data),
    onSuccess: (res) => {
      const events = res.data?.events ?? [];
      if (events.length > 0) {
        const last = events[events.length - 1];
        if (last.score) setLastScore(last.score);
        if (last.overs) setLastOvers(last.overs);
      }
      setFeed((prev) => [...events.reverse(), ...prev].slice(0, 30));
      setForm({ ...DEFAULT_FORM, bowler_id: form.bowler_id, batsman_id: form.batsman_id, non_striker_id: form.non_striker_id });
      qc.invalidateQueries(['match', matchId]);
    },
  });

  const undoMut = useMutation({
    mutationFn: () => undoLastBall(matchId),
    onSuccess: (res) => {
      const ev = res.data;
      if (ev.score) setLastScore(ev.score);
      if (ev.overs) setLastOvers(ev.overs);
      setFeed((prev) => [{ type: 'UNDO', ...ev }, ...prev].slice(0, 30));
      qc.invalidateQueries(['match', matchId]);
    },
  });

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (form.is_wicket && !form.wicket_type) return;
    deliveryMut.mutate({
      bowler_id: form.bowler_id,
      batsman_id: form.batsman_id,
      non_striker_id: form.non_striker_id,
      runs_batsman: Number(form.runs_batsman),
      runs_extras: Number(form.runs_extras),
      delivery_type: form.delivery_type,
      is_wicket: form.is_wicket,
      wicket_type: form.is_wicket ? form.wicket_type || null : null,
      fielder_id: form.fielder_id || null,
      over_number: 0,
      ball_number: 0,
    });
  };

  if (match?.status !== 'live') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center space-y-4">
          <p className="text-gray-500 text-lg">Match is not live</p>
          <button onClick={() => navigate(-1)} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />
      <div className="bg-slate-900 border-b border-slate-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to={`/matches/${matchId}`} className="flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors text-sm">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Match
            </Link>
            <span className="text-slate-700">/</span>
            <h1 className="text-base font-bold text-white">Live Scoring</h1>
            <span className={`w-2.5 h-2.5 rounded-full ${connected ? 'bg-green-500 animate-pulse' : 'bg-slate-600'}`} />
          </div>
          {lastScore && (
            <div className="text-right">
              <p className="text-2xl font-black text-amber-400">{lastScore}</p>
              <p className="text-xs text-slate-400 font-medium">({lastOvers} ov)</p>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Entry form */}
        <div className="bg-white rounded-2xl shadow p-5 space-y-4">
          <h2 className="font-semibold text-gray-800">Record Delivery</h2>

          {deliveryMut.isError && (
            <p className="text-red-500 text-sm">
              {deliveryMut.error?.response?.data?.detail ?? 'Error recording delivery'}
            </p>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="text-xs text-gray-500 font-medium">Bowler</label>
              <select required value={form.bowler_id} onChange={set('bowler_id')}
                className="w-full mt-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
                <option value="">Select bowler</option>
                {allPlayers.map((p) => (
                  <option key={p.player_id} value={p.player_id}>{p.player?.name ?? p.player_id.slice(0, 8)}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-500 font-medium">Striker</label>
                <select required value={form.batsman_id} onChange={set('batsman_id')}
                  className="w-full mt-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
                  <option value="">Select batsman</option>
                  {allPlayers.map((p) => (
                    <option key={p.player_id} value={p.player_id}>{p.player?.name ?? p.player_id.slice(0, 8)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 font-medium">Non-striker</label>
                <select required value={form.non_striker_id} onChange={set('non_striker_id')}
                  className="w-full mt-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
                  <option value="">Select non-striker</option>
                  {allPlayers.map((p) => (
                    <option key={p.player_id} value={p.player_id}>{p.player?.name ?? p.player_id.slice(0, 8)}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-500 font-medium">Delivery Type</label>
              <div className="flex gap-2 flex-wrap mt-1">
                {DELIVERY_TYPES.map((dt) => (
                  <button
                    key={dt.value}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, delivery_type: dt.value, runs_extras: 0 }))}
                    className={`px-3 py-1.5 text-xs rounded-lg border font-medium transition-colors ${
                      form.delivery_type === dt.value
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {dt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-500 font-medium">Runs (Batsman)</label>
                <div className="flex gap-1 mt-1 flex-wrap">
                  {[0, 1, 2, 3, 4, 6].map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, runs_batsman: r }))}
                      className={`w-9 h-9 text-sm rounded-lg border font-medium transition-colors ${
                        Number(form.runs_batsman) === r
                          ? r === 4 ? 'bg-blue-600 text-white border-blue-600'
                          : r === 6 ? 'bg-purple-600 text-white border-purple-600'
                          : 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
              {(form.delivery_type === 'wide' || form.delivery_type === 'no_ball' || form.delivery_type === 'bye' || form.delivery_type === 'leg_bye') && (
                <div>
                  <label className="text-xs text-gray-500 font-medium">Extras Runs</label>
                  <input
                    type="number"
                    min="0"
                    max="6"
                    value={form.runs_extras}
                    onChange={set('runs_extras')}
                    className="w-full mt-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_wicket}
                  onChange={(e) => setForm((f) => ({ ...f, is_wicket: e.target.checked, wicket_type: '' }))}
                  className="w-4 h-4 accent-red-600"
                />
                <span className="text-sm font-medium text-red-700">Wicket</span>
              </label>
            </div>

            {form.is_wicket && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-gray-500 font-medium">Wicket Type <span className="text-red-500">*</span></label>
                  <select required value={form.wicket_type} onChange={set('wicket_type')}
                    className="w-full mt-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400">
                    <option value="">Select type</option>
                    {WICKET_TYPES.map((wt) => (
                      <option key={wt} value={wt}>{wt.replace('_', ' ')}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 font-medium">Fielder (optional)</label>
                  <select value={form.fielder_id} onChange={set('fielder_id')}
                    className="w-full mt-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
                    <option value="">None</option>
                    {allPlayers.map((p) => (
                      <option key={p.player_id} value={p.player_id}>{p.player?.name ?? p.player_id.slice(0, 8)}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                disabled={deliveryMut.isPending}
                className="flex-1 py-2.5 bg-green-600 text-white font-semibold rounded-xl hover:bg-green-700 disabled:opacity-50"
              >
                {deliveryMut.isPending ? 'Recording…' : 'Record Ball'}
              </button>
              <button
                type="button"
                onClick={() => undoMut.mutate()}
                disabled={undoMut.isPending}
                className="px-4 py-2.5 bg-orange-100 text-orange-700 font-semibold rounded-xl hover:bg-orange-200 disabled:opacity-50 text-sm"
              >
                Undo
              </button>
            </div>
          </form>
        </div>

        {/* Event feed */}
        <div className="bg-white rounded-2xl shadow p-5 space-y-3">
          <h2 className="font-semibold text-gray-800">Ball-by-ball Feed</h2>
          {feed.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">No events yet</p>
          ) : (
            <div className="space-y-1.5 max-h-[480px] overflow-y-auto">
              {feed.map((ev, i) => (
                <div key={i} className={`flex items-start gap-2 px-3 py-2 rounded-lg text-sm ${
                  ev.type === 'WICKET' ? 'bg-red-50 border border-red-200'
                  : ev.type === 'OVER_COMPLETE' ? 'bg-blue-50 border border-blue-200'
                  : ev.type === 'MATCH_COMPLETE' ? 'bg-green-50 border border-green-200 font-semibold'
                  : ev.type === 'UNDO' ? 'bg-orange-50 border border-orange-200'
                  : 'bg-gray-50'
                }`}>
                  <span className="font-bold text-gray-400 text-xs mt-0.5 shrink-0">{ev.type}</span>
                  <span className="text-gray-700">
                    {ev.type === 'DELIVERY' && `${ev.over}.${ev.ball} — ${ev.delivery_type} — ${ev.total} run(s) — ${ev.score} (${ev.overs})`}
                    {ev.type === 'WICKET' && `${ev.wicket_type ?? 'out'}`}
                    {ev.type === 'OVER_COMPLETE' && `Over ${ev.over + 1} complete`}
                    {ev.type === 'INNINGS_COMPLETE' && `Innings 1 complete: ${ev.runs} runs. Target: ${ev.target}`}
                    {ev.type === 'MATCH_COMPLETE' && (ev.result_summary ?? 'Match complete')}
                    {ev.type === 'UNDO' && `Reverted — ${ev.score} (${ev.overs})`}
                    {ev.type === 'SNAPSHOT' && 'Live snapshot received'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
