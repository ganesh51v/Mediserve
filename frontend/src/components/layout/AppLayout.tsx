import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Pill,
  Cpu,
  Bell,
  FileBarChart2,
  Shield,
  LogOut,
  Menu,
  X,
  Activity,
  HeartPulse,
  Radio,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useSocket } from '../../hooks/useSocket';
import { alertService } from '../../services/alertService';
import { Alert } from '../../types';

export const AppLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [notificationOpen, setNotificationOpen] = useState<boolean>(false);
  const [recentAlerts, setRecentAlerts] = useState<Alert[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  // Hook into real-time websockets
  const { isConnected, lastNotification, clearNotification } = useSocket({
    onAlertNew: (newAlert) => {
      setRecentAlerts((prev) => [newAlert, ...prev.slice(0, 9)]);
      setUnreadCount((c) => c + 1);
    },
    onAlertUpdated: (updatedAlert) => {
      setRecentAlerts((prev) =>
        prev.map((a) => (a.id === updatedAlert.id ? updatedAlert : a))
      );
    },
  });

  // Fetch initial alerts
  useEffect(() => {
    async function fetchAlerts() {
      try {
        const res = await alertService.getAlerts({ limit: 10 });
        setRecentAlerts(res.alerts);
        setUnreadCount(res.unreadCount);
      } catch (e) {
        // console.error(e);
      }
    }
    fetchAlerts();
  }, []);

  // Determine home path by role
  const getHomePath = () => {
    if (user?.role === 'admin') return '/admin';
    if (user?.role === 'doctor') return '/doctor';
    return '/caretaker';
  };

  const navItems = [
    {
      name: 'Dashboard',
      path: getHomePath(),
      icon: LayoutDashboard,
      roles: ['admin', 'doctor', 'caretaker'],
    },
    {
      name: 'Patients',
      path: '/patients',
      icon: Users,
      roles: ['admin', 'doctor', 'caretaker'],
    },
    {
      name: 'Medications',
      path: '/medications',
      icon: Pill,
      roles: ['admin', 'doctor', 'caretaker'],
    },
    {
      name: 'Smart Devices',
      path: '/devices',
      icon: Cpu,
      roles: ['admin', 'doctor', 'caretaker'],
    },
    {
      name: 'Hardware Simulator',
      path: '/simulator',
      icon: Radio,
      badge: 'Live IoT',
      roles: ['admin', 'doctor', 'caretaker'],
    },
    {
      name: 'Alerts',
      path: '/alerts',
      icon: Bell,
      badge: unreadCount > 0 ? unreadCount : undefined,
      roles: ['admin', 'doctor', 'caretaker'],
    },
    {
      name: 'Reports & Audits',
      path: '/reports',
      icon: FileBarChart2,
      roles: ['admin', 'doctor', 'caretaker'],
    },
    {
      name: 'Audit Trail',
      path: '/audit-logs',
      icon: Shield,
      roles: ['admin'],
    },
  ];

  const visibleNav = navItems.filter((item) =>
    user ? item.roles.includes(user.role) : false
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Real-Time Live Notification Toast */}
      {lastNotification && (
        <div className="fixed top-4 right-4 z-50 max-w-sm bg-white border border-teal-200 rounded-xl shadow-xl p-4 flex items-start gap-3 animate-slideDown">
          <div className="p-2 bg-teal-50 text-teal-600 rounded-lg">
            <HeartPulse className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h5 className="text-xs font-bold text-slate-900">{lastNotification.title}</h5>
            <p className="text-xs text-slate-600 mt-0.5">{lastNotification.message}</p>
          </div>
          <button
            onClick={clearNotification}
            className="text-slate-400 hover:text-slate-600"
            aria-label="Dismiss toast"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Desktop / Tablet Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200/80 fixed inset-y-0 z-30">
        {/* Brand */}
        <div className="h-16 px-6 border-b border-slate-100 flex items-center justify-between">
          <Link to={getHomePath()} className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-600 flex items-center justify-center text-white shadow-md shadow-teal-600/30">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <span className="font-extrabold text-slate-900 text-lg tracking-tight">MediServe</span>
              <span className="text-[10px] block font-semibold text-teal-600 uppercase tracking-widest -mt-1">
                Healthcare System
              </span>
            </div>
          </Link>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {visibleNav.map((item) => {
            const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path + '/'));
            const Icon = item.icon;

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-teal-50 text-teal-700 font-semibold'
                    : 'text-slate-600 hover:bg-slate-100/70 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-teal-600' : 'text-slate-400'}`} />
                  <span>{item.name}</span>
                </div>
                {item.badge !== undefined && (
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                      typeof item.badge === 'number'
                        ? 'bg-rose-500 text-white'
                        : 'bg-teal-100 text-teal-800'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Live Hardware & User Profile Footer */}
        <div className="p-4 border-t border-slate-100 space-y-3">
          {/* WebSocket Status Indicator */}
          <div className="flex items-center justify-between text-xs px-2 py-1.5 rounded-lg bg-slate-50 border border-slate-200/60">
            <span className="text-slate-500 flex items-center gap-1.5">
              <span
                className={`w-2 h-2 rounded-full ${
                  isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
                }`}
              />
              Hardware IoT Link
            </span>
            <span className={`font-semibold ${isConnected ? 'text-emerald-700' : 'text-rose-700'}`}>
              {isConnected ? 'Connected' : 'Offline'}
            </span>
          </div>

          {/* User profile */}
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-xs uppercase flex-shrink-0">
                {user?.name.charAt(0) || 'U'}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 truncate">{user?.name}</p>
                <p className="text-[10px] font-semibold text-teal-600 uppercase tracking-wider capitalize">
                  {user?.role}
                </p>
              </div>
            </div>
            <button
              onClick={logout}
              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
              title="Sign Out"
              aria-label="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Top Header */}
      <header className="md:hidden bg-white border-b border-slate-200/80 h-16 px-4 flex items-center justify-between sticky top-0 z-40">
        <Link to={getHomePath()} className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center text-white">
            <Activity className="w-4 h-4" />
          </div>
          <span className="font-extrabold text-slate-900 text-base">MediServe</span>
        </Link>

        <div className="flex items-center gap-2">
          {/* Notification bell on mobile */}
          <button
            onClick={() => setNotificationOpen(!notificationOpen)}
            className="relative p-2 text-slate-600 hover:bg-slate-100 rounded-lg"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white" />
            )}
          </button>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </header>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex">
          <div className="w-64 bg-white h-full flex flex-col p-4 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <span className="font-bold text-slate-900">MediServe Menu</span>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="flex-1 space-y-1 overflow-y-auto">
              {visibleNav.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-teal-50 hover:text-teal-700"
                >
                  <div className="flex items-center gap-3">
                    <item.icon className="w-4 h-4 text-teal-600" />
                    <span>{item.name}</span>
                  </div>
                </Link>
              ))}
            </nav>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-900">{user?.name}</p>
                <p className="text-[10px] text-teal-600 capitalize font-medium">{user?.role}</p>
              </div>
              <button
                onClick={logout}
                className="text-xs text-rose-600 font-semibold p-1 hover:underline"
              >
                Logout
              </button>
            </div>
          </div>
          <div className="flex-1" onClick={() => setMobileMenuOpen(false)} />
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 md:ml-64 flex flex-col min-h-screen">
        {/* Desktop Top Bar */}
        <header className="hidden md:flex h-16 bg-white border-b border-slate-200/80 px-8 items-center justify-between sticky top-0 z-20">
          <div>
            <h1 className="text-sm font-semibold text-slate-700 capitalize">
              Role: <span className="text-teal-700 font-bold">{user?.role}</span>
              {user?.specialization && (
                <span className="text-slate-400 font-normal"> • {user.specialization}</span>
              )}
            </h1>
          </div>

          <div className="flex items-center gap-4">
            {/* Quick Link to Hardware Simulator */}
            <Link
              to="/simulator"
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 bg-teal-50 text-teal-700 hover:bg-teal-100 rounded-lg border border-teal-200 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Dispenser Simulator</span>
            </Link>

            {/* Notification Bell Dropdown */}
            <div className="relative">
              <button
                onClick={() => setNotificationOpen(!notificationOpen)}
                className="relative p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                aria-label="Alerts"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white" />
                )}
              </button>

              {notificationOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200/80 overflow-hidden z-50">
                  <div className="p-3 border-b border-slate-100 flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-800">Recent Alerts</span>
                    <Link
                      to="/alerts"
                      onClick={() => setNotificationOpen(false)}
                      className="text-[11px] font-semibold text-teal-600 hover:underline"
                    >
                      View All ({unreadCount} unread)
                    </Link>
                  </div>
                  <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                    {recentAlerts.length === 0 ? (
                      <div className="p-4 text-center text-xs text-slate-400">
                        No active alerts
                      </div>
                    ) : (
                      recentAlerts.map((al) => (
                        <div key={al.id} className="p-3 hover:bg-slate-50 text-xs">
                          <p className="font-semibold text-slate-900">{al.title}</p>
                          <p className="text-slate-500 mt-0.5 line-clamp-2">{al.message}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content Viewport */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
