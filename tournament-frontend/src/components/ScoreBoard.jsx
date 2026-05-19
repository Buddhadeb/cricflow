function BallChip({ ball }) {
  const isWicket = ball === 'W';
  const isExtra = ball.startsWith('wd') || ball.startsWith('nb');
  const isFour = ball === '4';
  const isSix = ball === '6';

  return (
    <span className={`inline-flex items-center justify-center w-9 h-9 rounded-full text-xs font-black border-2 ${
      isWicket ? 'bg-red-500 text-white border-red-600 shadow-md shadow-red-200'
      : isExtra ? 'bg-amber-100 text-amber-800 border-amber-300'
      : isFour ? 'bg-blue-500 text-white border-blue-600 shadow-sm'
      : isSix ? 'bg-violet-600 text-white border-violet-700 shadow-sm'
      : ball === '0' ? 'bg-gray-100 text-gray-500 border-gray-200'
      : 'bg-gray-100 text-gray-700 border-gray-200'
    }`}>
      {ball}
    </span>
  );
}

export default function ScoreBoard({ scorecard, matchStatus }) {
  if (!scorecard || scorecard.innings.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
        <span className="text-4xl">🏏</span>
        <p className="text-gray-400 text-sm mt-3">No scoring data yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {scorecard.innings.map((inn) => (
        <div key={inn.innings_number} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {/* Innings header */}
          <div className={`flex items-center justify-between px-5 py-4 ${
            !inn.is_complete && matchStatus === 'live' ? 'bg-gradient-to-r from-slate-900 to-blue-900' : 'bg-gray-50 border-b border-gray-100'
          }`}>
            <div className="flex items-center gap-3">
              <span className={`text-sm font-bold ${!inn.is_complete && matchStatus === 'live' ? 'text-white' : 'text-gray-800'}`}>
                Innings {inn.innings_number}
              </span>
              {!inn.is_complete && matchStatus === 'live' && (
                <span className="flex items-center gap-1.5 bg-green-500 text-white text-xs font-bold px-2.5 py-1 rounded-full">
                  <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                  Live
                </span>
              )}
            </div>
            <div className="text-right">
              <p className={`text-3xl font-black ${!inn.is_complete && matchStatus === 'live' ? 'text-amber-400' : 'text-gray-900'}`}>
                {inn.score}
              </p>
              <p className={`text-xs font-medium ${!inn.is_complete && matchStatus === 'live' ? 'text-slate-400' : 'text-gray-400'}`}>
                ({inn.overs} ov)
              </p>
            </div>
          </div>

          <div className="p-5 space-y-4">
            {/* Current players */}
            {(inn.striker_name || inn.current_bowler_name) && (
              <div className="flex gap-2 flex-wrap">
                {inn.striker_name && (
                  <span className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1.5 rounded-xl text-sm font-bold">
                    🏏 {inn.striker_name}*
                  </span>
                )}
                {inn.non_striker_name && (
                  <span className="flex items-center gap-1.5 bg-emerald-50 text-emerald-600 border border-emerald-100 px-3 py-1.5 rounded-xl text-sm font-medium">
                    {inn.non_striker_name}
                  </span>
                )}
                {inn.current_bowler_name && (
                  <span className="flex items-center gap-1.5 bg-red-50 text-red-700 border border-red-200 px-3 py-1.5 rounded-xl text-sm font-bold">
                    ⚡ {inn.current_bowler_name}
                  </span>
                )}
              </div>
            )}

            {/* Run rate info */}
            {inn.crr !== undefined && (
              <div className="flex gap-2 flex-wrap">
                <span className="bg-blue-50 text-blue-700 border border-blue-100 px-3 py-1.5 rounded-xl text-xs font-bold">
                  CRR: {inn.crr}
                </span>
                {inn.target && (
                  <>
                    <span className="bg-amber-50 text-amber-700 border border-amber-100 px-3 py-1.5 rounded-xl text-xs font-bold">
                      Target: {inn.target}
                    </span>
                    <span className="bg-red-50 text-red-700 border border-red-100 px-3 py-1.5 rounded-xl text-xs font-bold">
                      Need {inn.runs_needed} @ {inn.rrr}
                    </span>
                  </>
                )}
              </div>
            )}

            {/* Recent balls */}
            {inn.recent_balls?.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-gray-400 font-medium shrink-0">Recent:</span>
                {inn.recent_balls.map((b, i) => <BallChip key={i} ball={b} />)}
              </div>
            )}

            {/* Batting table */}
            {Object.keys(inn.batsmen ?? {}).length > 0 && (
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Batting</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 text-gray-400 text-xs">
                        <th className="pb-2 text-left font-semibold">Batter</th>
                        <th className="pb-2 text-center font-semibold">R</th>
                        <th className="pb-2 text-center font-semibold">B</th>
                        <th className="pb-2 text-center font-semibold">4s</th>
                        <th className="pb-2 text-center font-semibold">6s</th>
                        <th className="pb-2 text-center font-semibold">SR</th>
                        <th className="pb-2 text-center font-semibold"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {Object.entries(inn.batsmen).map(([pid, b]) => (
                        <tr key={pid} className="hover:bg-gray-50 transition-colors">
                          <td className="py-2.5 font-semibold text-gray-800">{b.name ?? pid.slice(0, 8)}</td>
                          <td className="py-2.5 text-center font-black text-gray-900">{b.runs}</td>
                          <td className="py-2.5 text-center text-gray-500">{b.balls}</td>
                          <td className="py-2.5 text-center font-bold text-blue-600">{b.fours}</td>
                          <td className="py-2.5 text-center font-bold text-violet-600">{b.sixes}</td>
                          <td className="py-2.5 text-center text-gray-500">
                            {b.balls > 0 ? ((b.runs / b.balls) * 100).toFixed(1) : '0.0'}
                          </td>
                          <td className="py-2.5 text-center">
                            {b.dismissed
                              ? <span className="text-xs text-red-500 font-bold">out</span>
                              : <span className="text-xs text-emerald-600 font-black">*</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Bowling table */}
            {Object.keys(inn.bowlers ?? {}).length > 0 && (
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Bowling</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 text-gray-400 text-xs">
                        <th className="pb-2 text-left font-semibold">Bowler</th>
                        <th className="pb-2 text-center font-semibold">O</th>
                        <th className="pb-2 text-center font-semibold">R</th>
                        <th className="pb-2 text-center font-semibold">W</th>
                        <th className="pb-2 text-center font-semibold">Eco</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {Object.entries(inn.bowlers).map(([pid, bw]) => {
                        const [ovs, balls] = bw.overs.split('.').map(Number);
                        const legal = ovs * 6 + (balls || 0);
                        const eco = legal > 0 ? (bw.runs / (legal / 6)).toFixed(2) : '0.00';
                        return (
                          <tr key={pid} className="hover:bg-gray-50 transition-colors">
                            <td className="py-2.5 font-semibold text-gray-800">{bw.name ?? pid.slice(0, 8)}</td>
                            <td className="py-2.5 text-center text-gray-500">{bw.overs}</td>
                            <td className="py-2.5 text-center">{bw.runs}</td>
                            <td className="py-2.5 text-center font-black text-red-600">{bw.wickets}</td>
                            <td className="py-2.5 text-center font-medium text-orange-600">{eco}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
