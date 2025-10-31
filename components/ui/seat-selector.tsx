import { Seat } from '@/types';

interface SeatSelectorProps {
  seats: Seat[];
  selectedSeats: string[];
  onSeatSelect: (seatId: string) => void;
}

export default function SeatSelector({ seats, selectedSeats, onSeatSelect }: SeatSelectorProps) {
  const seatsByRow = seats.reduce((acc, seat) => {
    if (!acc[seat.row]) {
      acc[seat.row] = [];
    }
    acc[seat.row].push(seat);
    return acc;
  }, {} as Record<string, Seat[]>);

  const rows = Object.keys(seatsByRow).sort();

  return (
    <div className="space-y-4">
      {/* Screen */}
      <div className="mb-8">
        <div className="bg-white/20 h-2 rounded-t-3xl mx-auto w-3/4 mb-2" />
        <div className="text-center text-white/60 text-sm">Screen</div>
      </div>

      {/* Seats */}
      <div className="space-y-3">
        {rows.map((row) => (
          <div key={row} className="flex items-center justify-center space-x-2">
            <div className="w-8 text-center text-white/60 font-semibold">{row}</div>
            <div className="flex space-x-2">
              {seatsByRow[row].sort((a, b) => a.number - b.number).map((seat) => {
                const isSelected = selectedSeats.includes(seat.id);
                const isBooked = seat.status === 'booked';
                return (
                  <button
                    key={seat.id}
                    onClick={() => !isBooked && onSeatSelect(seat.id)}
                    disabled={isBooked}
                    className={`w-10 h-10 rounded-md transition-all ${
                      isBooked
                        ? 'bg-white/10 cursor-not-allowed opacity-40'
                        : isSelected
                        ? 'bg-[#F84464] text-white shadow'
                        : 'bg-[#2B3148] hover:bg-[#3b4463] text-white'
                    }`}
                    title={`${row}${seat.number} - $${seat.price}`}
                  >
                    {isBooked ? '✕' : seat.number}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex justify-center space-x-6 pt-6 border-t border-white/10">
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 bg-[#2B3148] rounded" />
          <span className="text-white/70 text-sm">Available</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 bg-[#F84464] rounded" />
          <span className="text-white/70 text-sm">Selected</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 bg-white/10 rounded" />
          <span className="text-white/70 text-sm">Booked</span>
        </div>
      </div>
    </div>
  );
}