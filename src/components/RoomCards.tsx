import React from 'react';
import { Users, MapPin, Tv, Video, Wifi, Coffee, CalendarPlus, CheckCircle2, Clock } from 'lucide-react';
import { Room, Booking } from '../types';

interface RoomCardsProps {
  rooms: Room[];
  bookings: Booking[];
  selectedDate: string;
  onSelectRoomToBook: (roomId: string) => void;
  onFilterRoom?: (roomId: string) => void;
  activeFilterRoomId?: string;
}

export const RoomCards: React.FC<RoomCardsProps> = ({
  rooms,
  bookings,
  selectedDate,
  onSelectRoomToBook,
  onFilterRoom,
  activeFilterRoomId,
}) => {
  // Helper to get bookings for a room on selected date
  const getRoomBookingsToday = (roomId: string) => {
    return bookings.filter((b) => b.roomId === roomId && b.date === selectedDate);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6 mb-6">
      {rooms.map((room) => {
        const todayBookings = getRoomBookingsToday(room.id);
        const isFiltered = activeFilterRoomId === room.id;

        return (
          <div
            key={room.id}
            className={`relative rounded-2xl border transition-all duration-200 bg-white overflow-hidden shadow-xs hover:shadow-md ${
              isFiltered ? 'ring-2 ring-blue-500 border-blue-400' : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            {/* Top colored accent line */}
            <div
              className="h-1.5 w-full"
              style={{ backgroundColor: room.color.primary }}
            />

            <div className="p-5">
              {/* Header */}
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className="px-2 py-0.5 rounded text-xs font-bold font-mono tracking-wider"
                      style={{
                        backgroundColor: `${room.color.primary}15`,
                        color: room.color.primary,
                      }}
                    >
                      {room.code}
                    </span>
                    <h3 className="font-bold text-slate-900 text-base">
                      {room.name}
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{room.subtitle}</p>
                </div>

                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-medium shrink-0">
                  <Users className="w-3.5 h-3.5 text-slate-500" />
                  <span>容納 {room.capacity} 人</span>
                </div>
              </div>

              {/* Location & Status */}
              <div className="flex items-center justify-between text-xs text-slate-600 py-2 border-y border-slate-100 my-3">
                <div className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span>{room.location}</span>
                </div>
                <div className="flex items-center gap-1 font-medium">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>
                    當日預約：
                    <strong className="text-slate-900 ml-0.5">
                      {todayBookings.length} 場
                    </strong>
                  </span>
                </div>
              </div>

              {/* Amenities list */}
              <div className="space-y-1.5 mb-4">
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  主要設備特色
                </p>
                <div className="grid grid-cols-2 gap-1.5 text-xs text-slate-600">
                  {room.amenities.map((amenity, idx) => (
                    <div key={idx} className="flex items-center gap-1.5 truncate" title={amenity.label}>
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: room.color.primary }} />
                      <span className="truncate">{amenity.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={() => onSelectRoomToBook(room.id)}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-white shadow-xs transition-colors cursor-pointer"
                  style={{ backgroundColor: room.color.primary }}
                >
                  <CalendarPlus className="w-3.5 h-3.5" />
                  預約此會議室
                </button>
                {onFilterRoom && (
                  <button
                    onClick={() => onFilterRoom(isFiltered ? 'all' : room.id)}
                    className={`px-3 py-2 rounded-xl text-xs font-medium border transition-colors ${
                      isFiltered
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {isFiltered ? '顯示全部' : '僅看此室'}
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
