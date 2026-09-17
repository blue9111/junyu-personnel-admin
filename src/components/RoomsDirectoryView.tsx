import React from 'react';
import {
  Users,
  MapPin,
  Tv,
  Video,
  Wifi,
  Coffee,
  CalendarPlus,
  CheckCircle2,
  Sparkles,
  Shield,
  Volume2,
} from 'lucide-react';
import { Room, Booking } from '../types';

interface RoomsDirectoryViewProps {
  rooms: Room[];
  bookings: Booking[];
  onSelectRoomToBook: (roomId: string) => void;
}

export const RoomsDirectoryView: React.FC<RoomsDirectoryViewProps> = ({
  rooms,
  bookings,
  onSelectRoomToBook,
}) => {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              會議室空間與視訊設備規格
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              提供 3 間不同容納規模之標準專業會議空間，全數配備高品質遠端視訊系統與無線投影
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl self-start sm:self-auto">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>全棟會議室正常開放預約中</span>
          </div>
        </div>
      </div>

      {/* 3 Rooms Detail Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {rooms.map((room) => {
          const roomBookings = bookings.filter((b) => b.roomId === room.id);

          return (
            <div
              key={room.id}
              className="bg-white rounded-3xl border border-slate-200 shadow-xs hover:shadow-lg transition-all duration-300 flex flex-col justify-between overflow-hidden"
            >
              <div>
                {/* Visual Header Banner */}
                <div
                  className="p-6 text-white relative overflow-hidden"
                  style={{
                    background: `linear-gradient(135deg, ${room.color.primary}, ${room.color.primary}dd)`,
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-1 rounded-lg bg-white/20 backdrop-blur-xs font-mono font-bold text-xs">
                      {room.code} 號會議室
                    </span>
                    <span className="px-3 py-1 rounded-full bg-white/25 backdrop-blur-xs font-semibold text-xs flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5" />
                      上限 {room.capacity} 人
                    </span>
                  </div>

                  <h3 className="text-xl font-bold mt-4 tracking-tight">
                    {room.name}
                  </h3>
                  <p className="text-white/80 text-xs mt-1 font-medium">
                    {room.subtitle}
                  </p>

                  <div className="flex items-center gap-1.5 text-white/90 text-xs mt-3 pt-3 border-t border-white/20">
                    <MapPin className="w-3.5 h-3.5 shrink-0" />
                    <span>{room.location}</span>
                  </div>
                </div>

                {/* Body Content */}
                <div className="p-6 space-y-5">
                  <div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                      空間介紹
                    </h4>
                    <p className="text-xs text-slate-700 leading-relaxed">
                      {room.description}
                    </p>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                      建議使用情境
                    </h4>
                    <div className="text-xs bg-slate-50 border border-slate-200/80 p-2.5 rounded-xl text-slate-700 font-medium">
                      🎯 {room.recommendedFor}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5">
                      核心硬體與軟體設備
                    </h4>
                    <ul className="space-y-2 text-xs text-slate-600">
                      {room.amenities.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <CheckCircle2
                            className="w-4 h-4 shrink-0 mt-0.5"
                            style={{ color: room.color.primary }}
                          />
                          <span>{item.label}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              {/* Bottom Action Footer */}
              <div className="p-6 pt-0">
                <button
                  onClick={() => onSelectRoomToBook(room.id)}
                  className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
                  style={{ backgroundColor: room.color.primary }}
                >
                  <CalendarPlus className="w-4 h-4" />
                  <span>立即預約 {room.name}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
