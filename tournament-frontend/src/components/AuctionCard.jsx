export default function AuctionCard({ player, currentBid, bidderName, tournamentBasePrice }) {
  if (!player) {
    return (
      <div className="flex flex-col items-center justify-center h-72 bg-gray-100 rounded-2xl border-2 border-dashed border-gray-300">
        <span className="text-5xl mb-3">🏏</span>
        <p className="text-gray-500 text-lg font-medium">Waiting for next player…</p>
      </div>
    );
  }

  const typeLabel = player.player_type?.replace('_', ' ') ?? '';

  return (
    <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
      <div className="relative h-64 bg-gradient-to-br from-blue-600 to-purple-700">
        {player.photo_url ? (
          <img
            src={player.photo_url}
            alt={player.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <span className="text-white text-8xl select-none">👤</span>
          </div>
        )}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-5 py-4">
          <h2 className="text-white text-2xl font-bold leading-tight">{player.name}</h2>
          <span className="inline-block mt-1 px-2 py-0.5 bg-blue-400/70 text-blue-100 text-xs rounded-full capitalize">
            {typeLabel}
          </span>
        </div>
      </div>

      <div className="p-5 grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide">Base Price</p>
          <p className="text-xl font-bold text-gray-700">
            ₹{Number(tournamentBasePrice ?? player.base_price).toLocaleString('en-IN')}
          </p>
          {tournamentBasePrice && Number(tournamentBasePrice) !== Number(player.base_price) && (
            <p className="text-xs text-gray-400 line-through mt-0.5">₹{Number(player.base_price).toLocaleString('en-IN')}</p>
          )}
        </div>
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide">Current Bid</p>
          {currentBid ? (
            <>
              <p className="text-xl font-bold text-green-600">
                ₹{Number(currentBid).toLocaleString('en-IN')}
              </p>
              {bidderName && (
                <p className="text-xs text-gray-400 mt-0.5">by {bidderName}</p>
              )}
            </>
          ) : (
            <p className="text-xl font-bold text-gray-400">—</p>
          )}
        </div>
      </div>
    </div>
  );
}
