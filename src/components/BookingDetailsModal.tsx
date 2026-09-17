import React from 'react';
import {
  X,
  Calendar,
  Clock,
  MapPin,
  Users,
  FileText,
  Mail,
  Download,
  ExternalLink,
  Edit3,
  Trash2,
  Share2,
} from 'lucide-react';
import { Booking, Room } from '../types';
import {
  formatZhDate,
  createGoogleCalendarUrl,
  createOutlookCalendarUrl,
  downloadIcsFile,
  timeToMinutes,
} from '../utils/dateUtils';
import { CATEGORY_MAP } from '../data/mockData';

interface BookingDetailsModalProps {
  booking: Booking | null;
  onClose: () => void;
  room?: Room;
  onEdit: (booking: Booking) => void;
  onDelete: (bookingId: string) => void;
}

export const BookingDetailsModal: React.FC<BookingDetailsModalProps> = ({
  booking,
  onClose,
  room,
  onEdit,
  onDelete,
}) => {
  if (!booking) return null;

  const roomName = room ? room.name : '會議室';
  const cat = CATEGORY_MAP[booking.category] || CATEGORY_MAP.other;

  const startMin = timeToMinutes(booking.startTime);
  const endMin = timeToMinutes(booking.endTime);
  const durationMin = endMin - startMin;

  const handleOpenGoogleCalendar = () => {
    const url = createGoogleCalendarUrl(booking, roomName);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleOpenOutlookCalendar = () => {
    const url = createOutlookCalendarUrl(booking, roomName);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleDownloadIcs = () => {
    downloadIcsFile(booking, roomName);
  };

  const handleDeleteConfirm = () => {
    if (window.confirm(`確定要取消「${booking.title}」的會議室預約嗎？`)) {
      onDelete(booking.id);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Color bar top accent */}
        <div
          className="h-2 w-full"
          style={{ backgroundColor: room?.color.primary || '#3b82f6' }}
        />

        {/* Modal Header */}
        <div className="flex items-start justify-between p-6 pb-3">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span
                className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${cat.bg} ${cat.text} ${cat.border}`}
              >
                {cat.label}
              </span>
              <span
                className="text-xs px-2 py-0.5 rounded font-mono font-bold"
                style={{
                  backgroundColor: `${room?.color.primary}15`,
                  color: room?.color.primary,
                }}
              >
                {room?.code}室
              </span>
            </div>
            <h3 className="text-xl font-bold text-slate-900 leading-snug">
              {booking.title}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="px-6 py-4 space-y-4 text-sm">
          {/* Room & Time info card */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 space-y-2.5">
            <div className="flex items-center gap-2.5 text-slate-700">
              <Calendar className="w-4 h-4 text-blue-600 shrink-0" />
              <span className="font-semibold">
                {formatZhDate(booking.date, { showYear: true, showWeekday: true })}
              </span>
            </div>

            <div className="flex items-center gap-2.5 text-slate-700">
              <Clock className="w-4 h-4 text-blue-600 shrink-0" />
              <span className="font-mono font-bold text-slate-900">
                {booking.startTime} - {booking.endTime}
              </span>
              <span className="text-xs text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                {Math.floor(durationMin / 60)}小時 {durationMin % 60 > 0 ? `${durationMin % 60}分` : ''}
              </span>
            </div>

            <div className="flex items-center gap-2.5 text-slate-700">
              <MapPin className="w-4 h-4 text-blue-600 shrink-0" />
              <span>
                <strong>{room?.name}</strong> ({room?.location})
              </span>
            </div>
          </div>

          {/* Organizer Info */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200">
            <div className="flex items-center gap-3">
              <div className="relative">
                {booking.userAvatar ? (
                  <img
                    src={booking.userAvatar}
                    alt={booking.organizerName}
                    className="w-10 h-10 rounded-full object-cover border border-slate-200"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                    {booking.organizerName.substring(0, 2)}
                  </div>
                )}
                <span
                  className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border border-white ${
                    booking.provider === 'microsoft' ? 'bg-sky-500' : 'bg-amber-500'
                  }`}
                  title={booking.provider === 'microsoft' ? 'Microsoft 帳號' : 'Google 帳號'}
                />
              </div>
              <div>
                <div className="font-bold text-slate-900 text-sm">
                  {booking.organizerName}
                </div>
                <div className="text-xs text-slate-500 flex items-center gap-1">
                  <Mail className="w-3 h-3 text-slate-400" />
                  <span>{booking.organizerEmail}</span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <span className="inline-flex items-center gap-1 text-xs text-slate-600 bg-slate-100 px-2 py-1 rounded-md font-medium">
                <Users className="w-3.5 h-3.5 text-slate-400" />
                <span>{booking.attendeesCount} 人與會</span>
              </span>
            </div>
          </div>

          {/* Attendees List if present */}
          {booking.attendeesList && booking.attendeesList.length > 0 && (
            <div>
              <div className="text-xs font-bold text-slate-600 mb-1.5 flex items-center gap-1">
                <Users className="w-3.5 h-3.5" />
                與會受邀名單
              </div>
              <div className="flex flex-wrap gap-1.5">
                {booking.attendeesList.map((email, idx) => (
                  <span
                    key={idx}
                    className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md border border-slate-200"
                  >
                    {email}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {booking.notes && (
            <div>
              <div className="text-xs font-bold text-slate-600 mb-1 flex items-center gap-1">
                <FileText className="w-3.5 h-3.5" />
                會議備註與設備需求
              </div>
              <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-200 whitespace-pre-line leading-relaxed">
                {booking.notes}
              </p>
            </div>
          )}

          {/* Calendar Export & Sync Actions */}
          <div className="pt-2 border-t border-slate-100">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
              <Share2 className="w-3.5 h-3.5" />
              排程管理與外部日曆同步
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                onClick={handleOpenGoogleCalendar}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border border-slate-300 hover:bg-slate-50 text-slate-700 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5 text-amber-600" />
                <span>Google 日曆</span>
              </button>
              <button
                onClick={handleOpenOutlookCalendar}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border border-slate-300 hover:bg-slate-50 text-slate-700 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5 text-sky-600" />
                <span>Outlook 日曆</span>
              </button>
              <button
                onClick={handleDownloadIcs}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border border-slate-300 hover:bg-slate-50 text-slate-700 transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span>下載 .ics 檔</span>
              </button>
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="flex items-center justify-between p-4 px-6 bg-slate-50 border-t border-slate-100">
          <button
            onClick={handleDeleteConfirm}
            className="inline-flex items-center gap-1.5 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-3 py-1.5 rounded-lg font-medium transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>取消此預約</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onClose();
                onEdit(booking);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition-colors"
            >
              <Edit3 className="w-3.5 h-3.5 text-slate-500" />
              <span>修改預約</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-1.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors"
            >
              關閉
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
