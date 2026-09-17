import React from 'react';
import { Booking, Room } from '../../types';
import {
  getWeekDates,
  formatDateKey,
  timeToMinutes,
  ZH_WEEKDAYS_SHORT,
  TIME_SLOTS,
} from '../../utils/dateUtils';

interface WeekViewProps {
  currentDate: Date;
  bookings: Booking[];
  rooms: Room[];
  selectedRoomFilter: string;
  onSelectBooking: (booking: Booking) => void;
  onSelectDateTimeToBook: (dateStr: string, timeStr: string, roomId?: string) => void;
}

export const WeekView: React.FC<WeekViewProps> = ({
  currentDate,
  bookings,
  rooms,
  selectedRoomFilter,
  onSelectBooking,
  onSelectDateTimeToBook,
}) => {
  const weekDates = getWeekDates(currentDate);
  const todayKey = formatDateKey(new Date());
  const roomMap = new Map<string, Room>(rooms.map((r) => [r.id, r]));

  // Hours to display (08:00 to 20:00)
  const hours = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
  const startMinute = 8 * 60; // 08:00
  const endMinute = 20 * 60; // 20:00
  const totalMinutes = endMinute - startMinute;

  // Filter bookings for this week
  const weekDateKeys = new Set(weekDates.map(formatDateKey));
  const weekBookings = bookings.filter((b) => {
    if (!weekDateKeys.has(b.date)) return false;
    if (selectedRoomFilter !== 'all' && b.roomId !== selectedRoomFilter) return false;
    return true;
  });

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
      <div className="overflow-x-auto">
        <div className="min-w-[800px]">
          {/* Day Columns Header */}
          <div className="grid grid-cols-[80px_repeat(7,1fr)] border-b border-slate-200 bg-slate-50/90 text-center sticky top-0 z-10">
            <div className="py-3 text-xs font-semibold text-slate-400 border-r border-slate-200">
              時間
            </div>
            {weekDates.map((d, i) => {
              const dKey = formatDateKey(d);
              const isToday = dKey === todayKey;
              return (
                <div
                  key={i}
                  className={`py-2.5 px-2 border-r border-slate-200/80 last:border-r-0 ${
                    isToday ? 'bg-blue-50/60' : ''
                  }`}
                >
                  <div className="text-xs font-medium text-slate-500">
                    週{ZH_WEEKDAYS_SHORT[d.getDay()]}
                  </div>
                  <div
                    className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold mt-0.5 ${
                      isToday
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-800'
                    }`}
                  >
                    {d.getDate()}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Time Grid Area */}
          <div className="relative grid grid-cols-[80px_repeat(7,1fr)]">
            {/* Left time labels column */}
            <div className="border-r border-slate-200 divide-y divide-slate-100 bg-slate-50/50">
              {hours.map((h) => (
                <div
                  key={h}
                  className="h-16 flex items-start justify-center pt-1 text-[11px] font-mono text-slate-400"
                >
                  {String(h).padStart(2, '0')}:00
                </div>
              ))}
            </div>

            {/* 7 Days Columns */}
            {weekDates.map((dayDate, dayIdx) => {
              const dateStr = formatDateKey(dayDate);
              const dayBookings = weekBookings.filter((b) => b.date === dateStr);

              return (
                <div
                  key={dayIdx}
                  className="relative border-r border-slate-200/80 last:border-r-0 bg-white"
                >
                  {/* Background hourly slots (clickable) */}
                  {hours.map((h) => {
                    const timeStr = `${String(h).padStart(2, '0')}:00`;
                    return (
                      <div
                        key={h}
                        onClick={() => onSelectDateTimeToBook(dateStr, timeStr)}
                        className="h-16 border-b border-slate-100 hover:bg-blue-50/30 transition-colors cursor-pointer group"
                        title={`點擊預約 ${dateStr} ${timeStr}`}
                      >
                        {/* Sub half-hour subtle line */}
                        <div className="h-1/2 border-b border-slate-50/80" />
                      </div>
                    );
                  })}

                  {/* Overlaid Bookings */}
                  {dayBookings.map((b) => {
                    const room = roomMap.get(b.roomId);
                    const bStart = Math.max(timeToMinutes(b.startTime), startMinute);
                    const bEnd = Math.min(timeToMinutes(b.endTime), endMinute);

                    if (bEnd <= startMinute || bStart >= endMinute) return null;

                    // Calculate position in percentage
                    const topPct = ((bStart - startMinute) / totalMinutes) * 100;
                    const heightPct = Math.max(((bEnd - bStart) / totalMinutes) * 100, 3.5);

                    const color = room?.color.primary || '#3b82f6';

                    return (
                      <div
                        key={b.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectBooking(b);
                        }}
                        style={{
                          top: `${topPct}%`,
                          height: `${heightPct}%`,
                          borderColor: color,
                        }}
                        className="absolute inset-x-1 z-10 p-1.5 rounded-lg border-l-4 bg-white/95 shadow-xs hover:shadow-md cursor-pointer transition-all overflow-hidden border border-slate-200 hover:scale-[1.01]"
                      >
                        <div className="flex items-center justify-between gap-1 text-[10px] text-slate-500 font-mono">
                          <span>
                            {b.startTime} - {b.endTime}
                          </span>
                          <span
                            className="px-1 rounded text-[9px] font-bold"
                            style={{
                              backgroundColor: `${color}15`,
                              color: color,
                            }}
                          >
                            {room?.code}室
                          </span>
                        </div>
                        <div className="font-semibold text-slate-900 text-xs truncate mt-0.5">
                          {b.title}
                        </div>
                        <div className="text-[10px] text-slate-500 truncate">
                          {b.organizerName}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
