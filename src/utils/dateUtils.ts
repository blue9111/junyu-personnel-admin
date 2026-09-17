import { Booking, ConflictCheckResult } from '../types';

// Convert "HH:MM" to minutes from midnight
export function timeToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return (hours || 0) * 60 + (minutes || 0);
}

// Convert minutes to "HH:MM"
export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// Format date into YYYY-MM-DD
export function formatDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Traditional Chinese weekday names
export const ZH_WEEKDAYS_SHORT = ['日', '一', '二', '三', '四', '五', '六'];
export const ZH_WEEKDAYS_FULL = [
  '星期日',
  '星期一',
  '星期二',
  '星期三',
  '星期四',
  '星期五',
  '星期六',
];

// Display formatted date string in Traditional Chinese
export function formatZhDate(dateInput: string | Date, options?: { showWeekday?: boolean; showYear?: boolean }): string {
  const date = typeof dateInput === 'string' ? new Date(dateInput.replace(/-/g, '/')) : dateInput;
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const weekday = ZH_WEEKDAYS_SHORT[date.getDay()];

  let result = '';
  if (options?.showYear !== false) {
    result += `${year}年`;
  }
  result += `${month}月${day}日`;
  if (options?.showWeekday !== false) {
    result += ` (${weekday})`;
  }
  return result;
}

// Generate month calendar matrix (6 weeks x 7 days)
export interface MonthDayCell {
  date: Date;
  dateKey: string;
  isCurrentMonth: boolean;
  isToday: boolean;
  dayNumber: number;
}

export function getMonthMatrix(year: number, month: number, todayKey: string): MonthDayCell[][] {
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);

  const startDayOfWeek = firstDayOfMonth.getDay(); // 0 = Sunday
  const totalDays = lastDayOfMonth.getDate();

  const matrix: MonthDayCell[][] = [];
  let currentWeek: MonthDayCell[] = [];

  // Previous month trailing days
  const prevMonthLastDay = new Date(year, month, 0).getDate();
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const day = prevMonthLastDay - i;
    const date = new Date(year, month - 1, day);
    const dateKey = formatDateKey(date);
    currentWeek.push({
      date,
      dateKey,
      isCurrentMonth: false,
      isToday: dateKey === todayKey,
      dayNumber: day,
    });
  }

  // Current month days
  for (let day = 1; day <= totalDays; day++) {
    const date = new Date(year, month, day);
    const dateKey = formatDateKey(date);
    currentWeek.push({
      date,
      dateKey,
      isCurrentMonth: true,
      isToday: dateKey === todayKey,
      dayNumber: day,
    });

    if (currentWeek.length === 7) {
      matrix.push(currentWeek);
      currentWeek = [];
    }
  }

  // Next month leading days to complete the matrix
  let nextMonthDay = 1;
  while (currentWeek.length > 0 && currentWeek.length < 7) {
    const date = new Date(year, month + 1, nextMonthDay);
    const dateKey = formatDateKey(date);
    currentWeek.push({
      date,
      dateKey,
      isCurrentMonth: false,
      isToday: dateKey === todayKey,
      dayNumber: nextMonthDay,
    });
    nextMonthDay++;
  }
  if (currentWeek.length === 7) {
    matrix.push(currentWeek);
  }

  return matrix;
}

// Get dates for the week of an anchor date (Monday to Sunday)
export function getWeekDates(anchorDate: Date): Date[] {
  const curr = new Date(anchorDate);
  const day = curr.getDay(); // 0 is Sunday, 1 is Monday...
  const diffToMonday = curr.getDate() - day + (day === 0 ? -6 : 1);

  const monday = new Date(curr.setDate(diffToMonday));
  const week: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    week.push(d);
  }
  return week;
}

// Check time overlap and conflict
export function checkBookingConflict(
  candidate: {
    id?: string;
    roomId: string;
    date: string;
    startTime: string;
    endTime: string;
  },
  existingBookings: Booking[]
): ConflictCheckResult {
  const candStart = timeToMinutes(candidate.startTime);
  const candEnd = timeToMinutes(candidate.endTime);

  if (candStart >= candEnd) {
    return {
      hasConflict: true,
      message: '結束時間必須晚於開始時間！',
    };
  }

  const conflict = existingBookings.find((b) => {
    // skip same booking if editing
    if (candidate.id && b.id === candidate.id) return false;
    // must be same room and same date
    if (b.roomId !== candidate.roomId || b.date !== candidate.date) return false;

    const bStart = timeToMinutes(b.startTime);
    const bEnd = timeToMinutes(b.endTime);

    // Overlap condition: start1 < end2 AND start2 < end1
    return candStart < bEnd && bStart < candEnd;
  });

  if (conflict) {
    return {
      hasConflict: true,
      conflictingBooking: conflict,
      message: `與現有會議「${conflict.title}」(${conflict.startTime} - ${conflict.endTime}) 時間衝突！請更換時段或會議室。`,
    };
  }

  return { hasConflict: false };
}

// Generate time options between 08:00 and 21:00 in 30-minute intervals
export const TIME_SLOTS: string[] = [];
for (let h = 8; h <= 21; h++) {
  const hh = String(h).padStart(2, '0');
  TIME_SLOTS.push(`${hh}:00`);
  if (h < 21) {
    TIME_SLOTS.push(`${hh}:30`);
  }
}

// Generate Google Calendar Link
export function createGoogleCalendarUrl(booking: Booking, roomName: string): string {
  const [y, m, d] = booking.date.split('-');
  const [sh, sm] = booking.startTime.split(':');
  const [eh, em] = booking.endTime.split(':');

  const startUtc = `${y}${m}${d}T${sh}${sm}00`;
  const endUtc = `${y}${m}${d}T${eh}${em}00`;

  const title = encodeURIComponent(`【會議】${booking.title} (${roomName})`);
  const details = encodeURIComponent(
    `會議室：${roomName}\n預約人：${booking.organizerName} (${booking.organizerEmail})\n與會人數：${booking.attendeesCount} 人\n\n備註：\n${booking.notes || '無'}`
  );
  const location = encodeURIComponent(roomName);

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startUtc}/${endUtc}&details=${details}&location=${location}`;
}

// Generate Outlook / Microsoft 365 Calendar Link
export function createOutlookCalendarUrl(booking: Booking, roomName: string): string {
  const startIso = `${booking.date}T${booking.startTime}:00`;
  const endIso = `${booking.date}T${booking.endTime}:00`;

  const subject = encodeURIComponent(`【會議】${booking.title} (${roomName})`);
  const body = encodeURIComponent(
    `會議室：${roomName}\n預約人：${booking.organizerName} (${booking.organizerEmail})\n與會人數：${booking.attendeesCount} 人\n\n備註：${booking.notes || '無'}`
  );
  const location = encodeURIComponent(roomName);

  return `https://outlook.live.com/calendar/0/deeplink/compose?subject=${subject}&body=${body}&location=${location}&startdt=${startIso}&enddt=${endIso}`;
}

// Download .ics file
export function downloadIcsFile(booking: Booking, roomName: string) {
  const [y, m, d] = booking.date.split('-');
  const [sh, sm] = booking.startTime.split(':');
  const [eh, em] = booking.endTime.split(':');

  const start = `${y}${m}${d}T${sh}${sm}00`;
  const end = `${y}${m}${d}T${eh}${em}00`;
  const now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Gotofunapp//Meeting Room Booking//ZH',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${booking.id}@gotofunapp.com`,
    `DTSTAMP:${now}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${booking.title}`,
    `DESCRIPTION:${booking.notes || '會議預約'} - 預約人: ${booking.organizerName}`,
    `LOCATION:${roomName}`,
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `meeting-${booking.date}-${booking.startTime}.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
