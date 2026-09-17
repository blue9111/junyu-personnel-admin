import React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Filter,
  Layers,
} from 'lucide-react';
import { ViewMode, Room } from '../../types';
import { formatZhDate } from '../../utils/dateUtils';

interface CalendarHeaderProps {
  currentDate: Date;
  viewMode: 'month' | 'week' | 'day';
  setViewMode: (mode: 'month' | 'week' | 'day') => void;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  rooms: Room[];
  selectedRoomFilter: string;
  setSelectedRoomFilter: (roomId: string) => void;
}

export const CalendarHeader: React.FC<CalendarHeaderProps> = ({
  currentDate,
  viewMode,
  setViewMode,
  onPrev,
  onNext,
  onToday,
  rooms,
  selectedRoomFilter,
  setSelectedRoomFilter,
}) => {
  // Format title based on viewMode
  const getHeaderTitle = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;

    if (viewMode === 'month') {
      return `${year} 年 ${month} 月`;
    }

    if (viewMode === 'day') {
      return formatZhDate(currentDate, { showYear: true, showWeekday: true });
    }

    // Week view title: start of week to end of week
    const curr = new Date(currentDate);
    const day = curr.getDay();
    const diffToMonday = curr.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(curr.setDate(diffToMonday));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    return `${monday.getMonth() + 1}月${monday.getDate()}日 ～ ${sunday.getMonth() + 1}月${sunday.getDate()}日`;
  };

  return (
    <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs mb-4">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Navigation & Date Label */}
        <div className="flex items-center flex-wrap gap-2 sm:gap-3">
          <div className="flex items-center bg-slate-100 p-1 rounded-xl">
            <button
              onClick={onPrev}
              className="p-1.5 hover:bg-white text-slate-700 hover:text-slate-900 rounded-lg transition-colors"
              title="往前"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={onToday}
              className="px-3 py-1 hover:bg-white text-slate-700 hover:text-slate-900 rounded-lg text-xs font-semibold transition-colors"
            >
              今天
            </button>
            <button
              onClick={onNext}
              className="p-1.5 hover:bg-white text-slate-700 hover:text-slate-900 rounded-lg transition-colors"
              title="往後"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-blue-600 hidden sm:inline" />
            <span>{getHeaderTitle()}</span>
          </h2>
        </div>

        {/* View Mode Switcher & Room Filter */}
        <div className="flex items-center flex-wrap gap-2.5">
          {/* Room Filter */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs">
            <span className="text-slate-500 pl-2 hidden sm:inline flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" />
              篩選:
            </span>
            <button
              onClick={() => setSelectedRoomFilter('all')}
              className={`px-2.5 py-1.5 rounded-lg font-medium transition-all ${
                selectedRoomFilter === 'all'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              全部 (3間)
            </button>
            {rooms.map((room) => (
              <button
                key={room.id}
                onClick={() => setSelectedRoomFilter(room.id)}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-medium transition-all ${
                  selectedRoomFilter === room.id
                    ? 'bg-white shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                style={
                  selectedRoomFilter === room.id
                    ? { color: room.color.primary }
                    : undefined
                }
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: room.color.primary }}
                />
                <span>{room.code}室</span>
              </button>
            ))}
          </div>

          {/* View Modes */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs">
            <button
              onClick={() => setViewMode('month')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                viewMode === 'month'
                  ? 'bg-white text-blue-600 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              月視圖
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                viewMode === 'week'
                  ? 'bg-white text-blue-600 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              週時間軸
            </button>
            <button
              onClick={() => setViewMode('day')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                viewMode === 'day'
                  ? 'bg-white text-blue-600 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              三室當日對照
            </button>
          </div>
        </div>
      </div>

      {/* Room Legend Chips */}
      <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2 text-xs">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="text-slate-400 text-[11px] font-medium">會議室色標：</span>
          {rooms.map((room) => (
            <div key={room.id} className="flex items-center gap-1.5">
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: room.color.primary }}
              />
              <span className="text-slate-700 font-medium">{room.name}</span>
              <span className="text-slate-400">({room.capacity}人)</span>
            </div>
          ))}
        </div>
        <div className="text-[11px] text-slate-400">
          💡 點擊任一日曆空格即可快速建立預約，點擊預約方塊可查看詳情
        </div>
      </div>
    </div>
  );
};
