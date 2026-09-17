import React from 'react';
import { Plus } from 'lucide-react';
import { Booking, Room } from '../../types';
import { getMonthMatrix, ZH_WEEKDAYS_SHORT, formatDateKey } from '../../utils/dateUtils';

interface MonthViewProps {
  currentDate: Date;
  bookings: Booking[];
  rooms: Room[];
  selectedRoomFilter: string;
  onSelectBooking: (booking: Booking) => void;
  onSelectDateToBook: (dateStr: string) => void;
  onSwitchToDayView: (date: Date) => void;
}

export const MonthView: React.FC<MonthViewProps> = ({
  currentDate,
  bookings,
  rooms,
  selectedRoomFilter,
  onSelectBooking,
  onSelectDateToBook,
  onSwitchToDayView,
}) => {
  const todayKey = formatDateKey(new Date());
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthMatrix = getMonthMatrix(year, month, todayKey);
  const roomMap = new Map<string, Room>(rooms.map((r) => [r.id, r]));

  // Helper to filter bookings for a date
  const getBookingsForDate = (dateKey: string) => {
    return bookings
      .filter((b) => {
        if (b.date !== dateKey) return false;
        if (selectedRoomFilter !== 'all' && b.roomId !== selectedRoomFilter) return false;
        return true;
      })
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
      {/* Weekday Header */}
      <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50/80 text-center text-xs font-semibold text-slate-600">
        {ZH_WEEKDAYS_SHORT.map((day, idx) => (
          <div
            key={idx}
            className={`py-2.5 ${idx === 0 || idx === 6 ? 'text-rose-500' : 'text-slate-700'}`}
          >
            週{day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-slate-100 bg-slate-100">
        {monthMatrix.flat().map((cell, idx) => {
          const dayBookings = getBookingsForDate(cell.dateKey);
          const maxVisible = 3;
          const visibleBookings = dayBookings.slice(0, maxVisible);
          const remainingCount = dayBookings.length - maxVisible;

          return (
            <div
              key={`${cell.dateKey}-${idx}`}
              className={`min-h-[110px] sm:min-h-[130px] p-2 bg-white flex flex-col justify-between transition-colors group relative ${
                !cell.isCurrentMonth ? 'bg-slate-50/50 text-slate-400' : 'hover:bg-slate-50/40'
              }`}
            >
              {/* Day Header */}
              <div className="flex items-center justify-between mb-1.5">
                <button
                  onClick={() => onSwitchToDayView(cell.date)}
                  title="切換至當日三室對照"
                  className={`w-7 h-7 flex items-center justify-center rounded-full text-xs font-semibold transition-transform hover:scale-110 ${
                    cell.isToday
                      ? 'bg-blue-600 text-white shadow-sm'
                      : cell.isCurrentMonth
                      ? 'text-slate-700 hover:bg-slate-200'
                      : 'text-slate-400'
                  }`}
                >
                  {cell.dayNumber}
                </button>

                {/* Quick Add Button */}
                <button
                  onClick={() => onSelectDateToBook(cell.dateKey)}
                  title={`在 ${cell.dateKey} 預約會議室`}
                  className="opacity-0 group-hover:opacity-100 w-6 h-6 rounded-md bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white flex items-center justify-center text-xs transition-all shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Bookings Stack */}
              <div className="space-y-1 flex-1 overflow-hidden">
                {visibleBookings.map((b) => {
                  const room = roomMap.get(b.roomId);
                  const color = room?.color.primary || '#3b82f6';

                  return (
                    <div
                      key={b.id}
                      onClick={() => onSelectBooking(b)}
                      className="text-[11px] leading-tight px-1.5 py-1 rounded-md cursor-pointer transition-all hover:scale-[1.02] hover:shadow-xs truncate flex items-center gap-1 border border-slate-200/80 bg-white"
                      style={{ borderLeft: `3px solid ${color}` }}
                      title={`${b.startTime}-${b.endTime} 【${room?.code || ''}】${b.title} (${b.organizerName})`}
                    >
                      <span className="font-mono text-[10px] text-slate-500 shrink-0">
                        {b.startTime}
                      </span>
                      <span className="font-medium text-slate-800 truncate">
                        {b.title}
                      </span>
                    </div>
                  );
                })}

                {remainingCount > 0 && (
                  <button
                    onClick={() => onSwitchToDayView(cell.date)}
                    className="w-full text-left text-[10px] text-blue-600 font-semibold px-1 py-0.5 hover:underline"
                  >
                    +{remainingCount} 筆更多...
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
