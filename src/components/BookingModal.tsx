import React, { useState, useEffect } from 'react';
import {
  X,
  Calendar,
  Clock,
  Users,
  AlertCircle,
  CheckCircle2,
  Tv,
  Video,
  FileText,
  Mail,
  User,
  Sparkles,
} from 'lucide-react';
import { Room, Booking, MeetingCategory, User as AppUser } from '../types';
import {
  TIME_SLOTS,
  checkBookingConflict,
  timeToMinutes,
  minutesToTime,
} from '../utils/dateUtils';
import { CATEGORY_MAP } from '../data/mockData';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (bookingData: Partial<Booking>) => Promise<boolean>;
  rooms: Room[];
  existingBookings: Booking[];
  currentUser: AppUser | null;
  initialRoomId?: string;
  initialDate?: string;
  initialTime?: string;
  editingBooking?: Booking | null;
}

export const BookingModal: React.FC<BookingModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  rooms,
  existingBookings,
  currentUser,
  initialRoomId,
  initialDate,
  initialTime,
  editingBooking,
}) => {
  if (!isOpen) return null;

  // Form states
  const [roomId, setRoomId] = useState<string>(
    editingBooking?.roomId || initialRoomId || rooms[0]?.id || 'room-1'
  );
  const [title, setTitle] = useState<string>(editingBooking?.title || '');
  const [date, setDate] = useState<string>(
    editingBooking?.date || initialDate || new Date().toISOString().split('T')[0]
  );
  const [startTime, setStartTime] = useState<string>(
    editingBooking?.startTime || initialTime || '09:00'
  );
  const [endTime, setEndTime] = useState<string>(() => {
    if (editingBooking?.endTime) return editingBooking.endTime;
    const startM = timeToMinutes(initialTime || '09:00');
    return minutesToTime(Math.min(startM + 60, 21 * 60));
  });
  const [category, setCategory] = useState<MeetingCategory>(
    editingBooking?.category || 'team'
  );
  const [organizerName, setOrganizerName] = useState<string>(
    editingBooking?.organizerName || currentUser?.name || 'Jet Lin (林總監)'
  );
  const [organizerEmail, setOrganizerEmail] = useState<string>(
    editingBooking?.organizerEmail || currentUser?.email || 'jet@gotofunapp.com'
  );
  const [attendeesCount, setAttendeesCount] = useState<number>(
    editingBooking?.attendeesCount || 4
  );
  const [attendeesListStr, setAttendeesListStr] = useState<string>(
    editingBooking?.attendeesList?.join(', ') || ''
  );
  const [notes, setNotes] = useState<string>(editingBooking?.notes || '');
  const [syncCalendar, setSyncCalendar] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Sync state if initial inputs change
  useEffect(() => {
    if (initialRoomId) setRoomId(initialRoomId);
    if (initialDate) setDate(initialDate);
    if (initialTime) {
      setStartTime(initialTime);
      const startM = timeToMinutes(initialTime);
      setEndTime(minutesToTime(Math.min(startM + 60, 21 * 60)));
    }
  }, [initialRoomId, initialDate, initialTime]);

  const selectedRoom = rooms.find((r) => r.id === roomId) || rooms[0];

  // Dynamic conflict checking
  const conflictResult = checkBookingConflict(
    {
      id: editingBooking?.id,
      roomId,
      date,
      startTime,
      endTime,
    },
    existingBookings
  );

  // Calculate meeting duration
  const startMin = timeToMinutes(startTime);
  const endMin = timeToMinutes(endTime);
  const durationMin = endMin - startMin;
  const durationText =
    durationMin > 0
      ? `${Math.floor(durationMin / 60)} 小時 ${durationMin % 60 > 0 ? `${durationMin % 60} 分鐘` : ''}`
      : '時間不合邏輯';

  // Quick auto-adjust helper if conflict
  const handleSuggestNextSlot = () => {
    if (!conflictResult.conflictingBooking) return;
    const confEndMin = timeToMinutes(conflictResult.conflictingBooking.endTime);
    if (confEndMin < 20 * 60) {
      const newStart = minutesToTime(confEndMin);
      const newEnd = minutesToTime(Math.min(confEndMin + 60, 21 * 60));
      setStartTime(newStart);
      setEndTime(newEnd);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!title.trim()) {
      setFormError('請輸入會議主題');
      return;
    }

    if (conflictResult.hasConflict) {
      setFormError(conflictResult.message || '該時段時間衝突，無法建立預約');
      return;
    }

    setIsSubmitting(true);
    try {
      const attendees = attendeesListStr
        .split(/[,;\n]/)
        .map((s) => s.trim())
        .filter(Boolean);

      const success = await onSubmit({
        id: editingBooking?.id,
        roomId,
        title: title.trim(),
        date,
        startTime,
        endTime,
        category,
        organizerName: organizerName.trim(),
        organizerEmail: organizerEmail.trim(),
        attendeesCount: Number(attendeesCount) || 1,
        attendeesList: attendees,
        notes: notes.trim(),
        provider: currentUser?.provider || 'google',
        userAvatar: currentUser?.avatar,
      });

      if (success) {
        onClose();
      }
    } catch (err: any) {
      setFormError(err.message || '預約失敗，請稍後重試');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/60">
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              {editingBooking ? '編輯會議室預約' : '預約會議室'}
            </h3>
            <p className="text-xs text-slate-500">
              支援即時時段衝突檢測 • 自動綁定主辦人日程
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Room Selection Cards */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              選擇會議室 <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {rooms.map((room) => {
                const isSelected = roomId === room.id;
                return (
                  <button
                    type="button"
                    key={room.id}
                    onClick={() => setRoomId(room.id)}
                    className={`p-3 rounded-xl border text-left transition-all relative ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/40 ring-2 ring-blue-500/20'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className="px-1.5 py-0.5 rounded text-[10px] font-bold font-mono"
                        style={{
                          backgroundColor: `${room.color.primary}15`,
                          color: room.color.primary,
                        }}
                      >
                        {room.code}室
                      </span>
                      <span className="text-[11px] text-slate-500 flex items-center gap-1 font-medium">
                        <Users className="w-3 h-3" />
                        {room.capacity}人
                      </span>
                    </div>
                    <div className="font-bold text-slate-900 text-xs truncate">
                      {room.name}
                    </div>
                    <div className="text-[10px] text-slate-500 truncate mt-0.5">
                      {room.location}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Meeting Title & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                會議主題 <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="例如：2026 Q4 業務目標規劃會議"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm text-slate-900 bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                會議類型
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as MeetingCategory)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm text-slate-900 bg-white"
              >
                {Object.entries(CATEGORY_MAP).map(([key, info]) => (
                  <option key={key} value={key}>
                    {info.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Date & Time Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                預約日期 <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm text-slate-900 bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                開始時間 <span className="text-rose-500">*</span>
              </label>
              <select
                value={startTime}
                onChange={(e) => {
                  const newStart = e.target.value;
                  setStartTime(newStart);
                  // Auto push end time if invalid
                  const sM = timeToMinutes(newStart);
                  const eM = timeToMinutes(endTime);
                  if (sM >= eM) {
                    setEndTime(minutesToTime(Math.min(sM + 60, 21 * 60)));
                  }
                }}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm text-slate-900 bg-white font-mono"
              >
                {TIME_SLOTS.filter((t) => t !== '21:00').map((slot) => (
                  <option key={slot} value={slot}>
                    {slot}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  結束時間 <span className="text-rose-500">*</span>
                </label>
                <span className="text-[10px] text-blue-600 font-semibold">
                  {durationText}
                </span>
              </div>
              <select
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm text-slate-900 bg-white font-mono"
              >
                {TIME_SLOTS.filter((t) => timeToMinutes(t) > timeToMinutes(startTime)).map(
                  (slot) => (
                    <option key={slot} value={slot}>
                      {slot}
                    </option>
                  )
                )}
              </select>
            </div>
          </div>

          {/* Real-time Conflict Alert Banner */}
          {conflictResult.hasConflict ? (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="font-bold">時段衝突提醒</div>
                <div className="mt-0.5 text-rose-700 leading-relaxed">
                  {conflictResult.message}
                </div>
                {conflictResult.conflictingBooking && (
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSuggestNextSlot}
                      className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-medium transition-colors shadow-xs"
                    >
                      自動調整為空閒時段 ({conflictResult.conflictingBooking.endTime} 起)
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                <strong>時段檢查通過：</strong>
                {selectedRoom?.name} 在 {date} {startTime} - {endTime} 目前無人預約，可立即登記。
              </span>
            </div>
          )}

          {/* Organizer Info Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-slate-400" />
                預約人姓名 <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={organizerName}
                onChange={(e) => setOrganizerName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm text-slate-900 bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                電子郵件 <span className="text-rose-500">*</span>
              </label>
              <input
                type="email"
                required
                value={organizerEmail}
                onChange={(e) => setOrganizerEmail(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm text-slate-900 bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-slate-400" />
                預計人數 (上限 {selectedRoom?.capacity}人)
              </label>
              <input
                type="number"
                min={1}
                max={selectedRoom?.capacity || 20}
                value={attendeesCount}
                onChange={(e) => setAttendeesCount(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm text-slate-900 bg-white"
              />
            </div>
          </div>

          {/* Attendees List & Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              與會人員名單 (Email，以逗號分隔)
            </label>
            <input
              type="text"
              placeholder="例如：colleague1@gotofunapp.com, guest@client.com"
              value={attendeesListStr}
              onChange={(e) => setAttendeesListStr(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm text-slate-900 bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              會議備註 / 特殊設備需求
            </label>
            <textarea
              rows={2}
              placeholder="例如：需要外接視訊會議設備、需提前 10 分鐘測試投影機、需要熱咖啡茶水..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm text-slate-900 bg-white"
            />
          </div>

          {/* Calendar Sync Toggle */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-600" />
              <div>
                <div className="text-xs font-semibold text-slate-800">
                  同步產生 Google / Outlook 日曆邀請與 .ics 排程
                </div>
                <div className="text-[11px] text-slate-500">
                  預約完成後可一鍵加入您的個人 Google 日曆或 Microsoft 365
                </div>
              </div>
            </div>
            <input
              type="checkbox"
              checked={syncCalendar}
              onChange={(e) => setSyncCalendar(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
            />
          </div>

          {/* Form Error Message */}
          {formError && (
            <div className="p-3 rounded-xl bg-red-50 text-red-700 text-xs font-medium border border-red-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* Modal Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={isSubmitting || conflictResult.hasConflict}
              className={`px-5 py-2 rounded-xl text-sm font-bold text-white shadow-md transition-all ${
                isSubmitting || conflictResult.hasConflict
                  ? 'bg-slate-300 cursor-not-allowed text-slate-500 shadow-none'
                  : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800'
              }`}
            >
              {isSubmitting ? '處理中...' : editingBooking ? '儲存變更' : '確認預約'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
