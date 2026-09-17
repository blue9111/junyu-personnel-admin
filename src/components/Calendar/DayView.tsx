import React from 'react';
import { Users, Clock, Plus, Video } from 'lucide-react';
import { Booking, Room } from '../../types';
import {
  formatDateKey,
  timeToMinutes,
  TIME_SLOTS,
} from '../../utils/dateUtils';
import { CATEGORY_MAP } from '../../data/mockData';

interface DayViewProps {
  currentDate: Date;
  bookings: Booking[];
  rooms: Room[];
  selectedRoomFilter: string;
  onSelectBooking: (booking: Booking) => void;
  onSelectSlotToBook: (roomId: string, dateStr: string, timeStr: string) => void;
}

export const DayView: React.FC<DayViewProps> = ({
  currentDate,
  bookings,
  rooms,
  selectedRoomFilter,
  onSelectBooking,
  onSelectSlotToBook,
}) => {
  const dateStr = formatDateKey(currentDate);

  // Filter rooms based on selectedRoomFilter
  const displayRooms =
    selectedRoomFilter === 'all'
      ? rooms
      : rooms.filter((r) => r.id === selectedRoomFilter);

  // Hours: 08:00 to 20:00
  const hours = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
  const startMinute = 8 * 60; // 08:00
  const endMinute = 20 * 60; // 20:00
  const totalMinutes = endMinute - startMinute;

  // Day's bookings
  const dayBookings = bookings.filter((b) => b.date === dateStr);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
      <div className="overflow-x-auto">
        <div className="min-w-[720px]">
          {/* Room Columns Header */}
          <div
            className="grid border-b border-slate-200 bg-slate-50/90 text-center sticky top-0 z-10"
            style={{
              gridTemplateColumns: `80px repeat(${displayRooms.length}, 1fr)`,
            }}
          >
            <div className="py-3 text-xs font-semibold text-slate-400 border-r border-slate-200">
              時間
            </div>
            {displayRooms.map((room) => {
              const count = dayBookings.filter((b) => b.roomId === room.id).length;
              return (
                <div
                  key={room.id}
                  className="py-3 px-3 border-r border-slate-200/80 last:border-r-0 text-left"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: room.color.primary }}
                      />
                      <span className="font-bold text-slate-900 text-sm">
                        {room.name}
                      </span>
                    </div>
                    <span className="text-xs text-slate-500 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                      {room.capacity} 人
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5 flex items-center justify-between">
                    <span>{room.location}</span>
                    <span className="font-medium text-slate-700">
                      今日預約 {count} 場
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Time Grid Matrix */}
          <div
            className="relative grid"
            style={{
              gridTemplateColumns: `80px repeat(${displayRooms.length}, 1fr)`,
            }}
          >
            {/* Left time label column */}
            <div className="border-r border-slate-200 divide-y divide-slate-100 bg-slate-50/50">
              {hours.map((h) => (
                <div
                  key={h}
                  className="h-20 flex items-start justify-center pt-1 text-xs font-mono text-slate-400"
                >
                  {String(h).padStart(2, '0')}:00
                </div>
              ))}
            </div>

            {/* Room columns */}
            {displayRooms.map((room) => {
              const roomBookings = dayBookings.filter((b) => b.roomId === room.id);

              return (
                <div
                  key={room.id}
                  className="relative border-r border-slate-200/80 last:border-r-0 bg-white"
                >
                  {/* Background hourly slots */}
                  {hours.map((h) => {
                    const timeStr = `${String(h).padStart(2, '0')}:00`;
                    return (
                      <div
                        key={h}
                        onClick={() => onSelectSlotToBook(room.id, dateStr, timeStr)}
                        className="h-20 border-b border-slate-100 hover:bg-blue-50/30 transition-colors cursor-pointer group flex flex-col justify-between p-1.5"
                        title={`點擊在 ${room.name} 預約 ${timeStr}`}
                      >
                        <div className="text-[10px] text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                          <Plus className="w-3 h-3 text-blue-600" />
                          <span>點擊預約 {timeStr}</span>
                        </div>
                        {/* Half-hour divider */}
                        <div className="border-b border-slate-50 w-full" />
                      </div>
                    );
                  })}

                  {/* Overlaid Bookings */}
                  {roomBookings.map((b) => {
                    const bStart = Math.max(timeToMinutes(b.startTime), startMinute);
                    const bEnd = Math.min(timeToMinutes(b.endTime), endMinute);

                    if (bEnd <= startMinute || bStart >= endMinute) return null;

                    const topPct = ((bStart - startMinute) / totalMinutes) * 100;
                    const heightPct = Math.max(((bEnd - bStart) / totalMinutes) * 100, 4.5);
                    const cat = CATEGORY_MAP[b.category] || CATEGORY_MAP.other;

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
                          borderLeftColor: room.color.primary,
                        }}
                        className="absolute inset-x-2 z-10 p-2.5 rounded-xl border-l-4 bg-white shadow-xs hover:shadow-md cursor-pointer transition-all border border-slate-200 flex flex-col justify-between overflow-hidden group hover:ring-2 hover:ring-blue-400"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <span className="text-xs font-mono font-bold text-slate-700">
                              {b.startTime} - {b.endTime}
                            </span>
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${cat.bg} ${cat.text}`}
                            >
                              {cat.label}
                            </span>
                          </div>
                          <div className="font-bold text-slate-900 text-sm leading-snug line-clamp-2">
                            {b.title}
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100/80 mt-1">
                          <div className="flex items-center gap-1.5 truncate">
                            {b.userAvatar ? (
                              <img
                                src={b.userAvatar}
                                alt={b.organizerName}
                                className="w-4 h-4 rounded-full object-cover"
                                referrerPolicy="no-referrer"
                              />
                            ) : null}
                            <span className="truncate">{b.organizerName}</span>
                          </div>
                          <div className="flex items-center gap-1 text-slate-400 text-[11px] shrink-0">
                            <Users className="w-3 h-3" />
                            <span>{b.attendeesCount}人</span>
                          </div>
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
