export default function BidButton({ currentBid, bidIncrement, onBid, disabled, loading, remainingBudget }) {
  const nextBid = (Number(currentBid) || 0) + (Number(bidIncrement) || 100);
  const overBudget = remainingBudget != null && nextBid > Number(remainingBudget);

  return (
    <div>
      <button
        onClick={() => onBid(nextBid)}
        disabled={disabled || loading || overBudget}
        className="w-full py-4 text-xl font-bold rounded-xl transition-all
          bg-green-500 hover:bg-green-600 active:scale-95
          disabled:bg-gray-300 disabled:cursor-not-allowed text-white shadow-lg"
      >
        {loading ? 'Placing…' : `Bid ₹${nextBid.toLocaleString('en-IN')}`}
      </button>
      {overBudget && (
        <p className="text-red-500 text-xs font-semibold text-center mt-2">
          Insufficient budget — next bid ₹{nextBid.toLocaleString('en-IN')} exceeds your remaining ₹{Number(remainingBudget).toLocaleString('en-IN')}
        </p>
      )}
    </div>
  );
}
