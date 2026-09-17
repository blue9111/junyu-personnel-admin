import React from 'react';
import { Calendar, Plus, User as UserIcon, LogOut, Settings2, ShieldCheck, Sparkles } from 'lucide-react';
import { User, ViewMode } from '../types';

interface NavbarProps {
  currentUser: User | null;
  currentTab: 'calendar' | 'my-bookings' | 'rooms';
  setCurrentTab: (tab: 'calendar' | 'my-bookings' | 'rooms') => void;
  onOpenBookingModal: () => void;
  onOpenOAuthModal: () => void;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  currentTab,
  setCurrentTab,
  onOpenBookingModal,
  onOpenOAuthModal,
  onLogout,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 text-lg tracking-tight">
                  會議室預約系統
                </span>
                <span className="hidden md:inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                  三室排程管理
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">
                智慧時段防撞 • 支援 Google 與 Microsoft 帳號排程
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center bg-slate-100/90 p-1 rounded-xl border border-slate-200/80">
            <button
              onClick={() => setCurrentTab('calendar')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                currentTab === 'calendar'
                  ? 'bg-white text-blue-600 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              月曆排程
            </button>
            <button
              onClick={() => setCurrentTab('my-bookings')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                currentTab === 'my-bookings'
                  ? 'bg-white text-blue-600 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              我的預約
            </button>
            <button
              onClick={() => setCurrentTab('rooms')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                currentTab === 'rooms'
                  ? 'bg-white text-blue-600 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              會議室設備
            </button>
          </nav>

          {/* Right Action: User & Quick Booking */}
          <div className="flex items-center gap-3">
            {/* Quick Booking Button */}
            <button
              onClick={onOpenBookingModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl text-sm font-medium shadow-sm transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">立即預約</span>
            </button>

            {/* User Account / Auth Section */}
            {currentUser ? (
              <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
                <button
                  onClick={onOpenOAuthModal}
                  title="帳號排程設定"
                  className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-slate-100 transition-colors text-left group"
                >
                  <div className="relative">
                    <img
                      src={currentUser.avatar}
                      alt={currentUser.name}
                      className="w-8 h-8 rounded-full object-cover border border-slate-300 ring-2 ring-white"
                      referrerPolicy="no-referrer"
                    />
                    <span
                      className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${
                        currentUser.provider === 'google' ? 'bg-amber-500' : 'bg-sky-500'
                      }`}
                      title={currentUser.provider === 'google' ? 'Google 帳號連線' : 'Microsoft 帳號連線'}
                    />
                  </div>
                  <div className="hidden lg:block text-xs">
                    <div className="font-semibold text-slate-800 truncate max-w-[120px]">
                      {currentUser.name}
                    </div>
                    <div className="text-slate-500 text-[10px] flex items-center gap-1">
                      {currentUser.provider === 'google' ? (
                        <span className="text-amber-700 font-medium">Google</span>
                      ) : (
                        <span className="text-sky-700 font-medium">Microsoft</span>
                      )}
                      <span>帳號</span>
                    </div>
                  </div>
                </button>

                <button
                  onClick={onOpenOAuthModal}
                  className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                  title="排程授權設定"
                >
                  <Settings2 className="w-4 h-4" />
                </button>

                <button
                  onClick={onLogout}
                  className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="登出"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenOAuthModal}
                className="inline-flex items-center gap-2 px-3 py-1.5 border border-slate-300 hover:border-slate-400 text-slate-700 bg-white hover:bg-slate-50 rounded-xl text-sm font-medium transition-colors shadow-xs"
              >
                <UserIcon className="w-4 h-4 text-slate-500" />
                <span>帳號登入</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
