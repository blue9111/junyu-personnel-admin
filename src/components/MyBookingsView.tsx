import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Search,
  Filter,
  Plus,
  Edit3,
  Trash2,
  ExternalLink,
  Download,
  CalendarCheck,
} from 'lucide-react';
import { Booking, Room, User } from '../types';
import {
  formatZhDate,
  timeToMinutes,
  createGoogleCalendarUrl,
  createOutlookCalendarUrl,
  downloadIcsFile,
  formatDateKey,
} from '../utils/dateUtils';
import { CATEGORY_MAP } from '../data/mockData';

interface MyBookingsViewProps {
  bookings: Booking[];
  rooms: Room[];
  currentUser: User | null;
  onOpenBookingModal: () => void;
  onSelectBooking: (booking: Booking) => void;
  onEditBooking: (booking: Booking) => void;
  onDeleteBooking: (bookingId: string) => void;
}

export const MyBookingsView: React.FC<MyBookingsViewProps> = ({
  bookings,
  rooms,
  currentUser,
  onOpenBookingModal,
  onSelectBooking,
  onEditBooking,
  onDeleteBooking,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRoomId, setFilterRoomId] = useState('all');
  const [filterType, setFilterType] = useState<'my' | 'all'>('my');

  const todayStr = formatDateKey(new Date());
  const roomMap = new Map<string, Room>(rooms.map((r) => [r.id, r]));

  // Filter bookings
  const filteredBookings = bookings.filter((b) => {
    // filterType: 'my' only checks currentUser email match
    if (filterType === 'my' && currentUser) {
      if (b.organizerEmail.toLowerCase() !== currentUser.email.toLowerCase()) {
        return false;
      }
    }

    if (filterRoomId !== 'all' && b.roomId !== filterRoomId) {
      return false;
    }

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchTitle = b.title.toLowerCase().includes(q);
      const matchOrganizer = b.organizerName.toLowerCase().includes(q);
      const matchNotes = b.notes?.toLowerCase().includes(q);
      if (!matchTitle && !matchOrganizer && !matchNotes) return false;
    }

    return true;
  });

  // Split into upcoming and past
  const upcomingBookings = filteredBookings.filter((b) => b.date >= todayStr);
  const pastBookings = filteredBookings.filter((b) => b.date < todayStr);

  // Stats calculation
  const totalUpcomingCount = upcomingBookings.length;
  const totalMinutesSum = upcomingBookings.reduce((acc, b) => {
    return acc + (timeToMinutes(b.endTime) - timeToMinutes(b.startTime));
  }, 0);

  return (
    <div className="space-y-6">
      {/* Overview Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              即將到來會議
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <CalendarCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">
              {totalUpcomingCount}
            </span>
            <span className="text-xs text-slate-500">場</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              累計會議時長
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">
              {(totalMinutesSum / 60).toFixed(1)}
            </span>
            <span className="text-xs text-slate-500">小時</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              快速發起
            </div>
            <p className="text-xs text-slate-600 mt-1">安排新的團隊或客戶會議</p>
          </div>
          <button
            onClick={onOpenBookingModal}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>新增預約</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Toggle between "My" and "All" */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs w-full sm:w-auto">
          <button
            onClick={() => setFilterType('my')}
            className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg font-medium transition-all ${
              filterType === 'my'
                ? 'bg-white text-blue-600 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            我發起的預約 {currentUser ? `(${currentUser.email})` : ''}
          </button>
          <button
            onClick={() => setFilterType('all')}
            className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg font-medium transition-all ${
              filterType === 'all'
                ? 'bg-white text-blue-600 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            全公司所有預約
          </button>
        </div>

        {/* Room & Search Filter */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={filterRoomId}
            onChange={(e) => setFilterRoomId(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">全部會議室</option>
            {rooms.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>

          <div className="relative flex-1 sm:w-60">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="搜尋會議主題或預約人..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-300 text-xs text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Bookings List */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
          <span>即將舉行的會議</span>
          <span className="text-xs text-slate-500 font-normal">
            ({upcomingBookings.length} 場)
          </span>
        </h3>

        {upcomingBookings.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-500">
            <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="font-semibold text-slate-700">目前尚無即將到來的預約</p>
            <p className="text-xs text-slate-400 mt-1">
              點擊「新增預約」或由月曆選擇時段快速安排
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {upcomingBookings.map((b) => {
              const room = roomMap.get(b.roomId);
              const cat = CATEGORY_MAP[b.category] || CATEGORY_MAP.other;
              const duration = timeToMinutes(b.endTime) - timeToMinutes(b.startTime);

              return (
                <div
                  key={b.id}
                  className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs hover:shadow-md transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-3.5 flex-1 min-w-0">
                    <div
                      className="w-2.5 self-stretch rounded-full shrink-0"
                      style={{ backgroundColor: room?.color.primary || '#3b82f6' }}
                    />
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${cat.bg} ${cat.text} ${cat.border}`}
                        >
                          {cat.label}
                        </span>
                        <span className="text-xs font-semibold text-slate-700">
                          {room?.name}
                        </span>
                        <span className="text-slate-400 text-xs">•</span>
                        <span className="text-xs text-slate-500">
                          {room?.location}
                        </span>
                      </div>

                      <h4
                        onClick={() => onSelectBooking(b)}
                        className="font-bold text-slate-900 text-base hover:text-blue-600 transition-colors cursor-pointer truncate"
                      >
                        {b.title}
                      </h4>

                      <div className="flex items-center gap-4 text-xs text-slate-500 flex-wrap">
                        <div className="flex items-center gap-1 font-medium text-slate-700">
                          <Calendar className="w-3.5 h-3.5 text-blue-600" />
                          <span>{formatZhDate(b.date, { showWeekday: true })}</span>
                        </div>
                        <div className="flex items-center gap-1 font-mono font-medium text-slate-800">
                          <Clock className="w-3.5 h-3.5 text-blue-600" />
                          <span>
                            {b.startTime} - {b.endTime} ({duration / 60}小時)
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Users className="w-3.5 h-3.5 text-slate-400" />
                          <span>{b.attendeesCount} 人</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 justify-end">
                    <button
                      onClick={() =>
                        window.open(
                          createGoogleCalendarUrl(b, room?.name || '會議室'),
                          '_blank',
                          'noopener,noreferrer'
                        )
                      }
                      title="加入 Google 日曆"
                      className="p-2 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-xl border border-slate-200 transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => downloadIcsFile(b, room?.name || '會議室')}
                      title="下載 .ics 行事曆"
                      className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onEditBooking(b)}
                      title="編輯此預約"
                      className="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-xl border border-slate-200 transition-colors"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm(`確定取消「${b.title}」預約？`)) {
                          onDeleteBooking(b.id);
                        }
                      }}
                      title="取消預約"
                      className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-xl border border-slate-200 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Past Bookings Section */}
        {pastBookings.length > 0 && (
          <div className="pt-6">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
              已結束的歷史會議 ({pastBookings.length} 場)
            </h3>
            <div className="space-y-2 opacity-75">
              {pastBookings.map((b) => {
                const room = roomMap.get(b.roomId);
                return (
                  <div
                    key={b.id}
                    onClick={() => onSelectBooking(b)}
                    className="bg-white/80 rounded-xl border border-slate-200 p-3 hover:bg-white transition-all flex items-center justify-between text-xs cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-slate-500">{b.date}</span>
                      <span className="font-semibold text-slate-800">{b.title}</span>
                      <span className="text-slate-400">({room?.name})</span>
                    </div>
                    <div className="text-slate-500">
                      {b.startTime} - {b.endTime}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
