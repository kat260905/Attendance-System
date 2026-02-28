import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  BarChart3, Users, LogOut, Menu, X, FileCheck,
  Bell, ChevronDown, LayoutDashboard, ClipboardCheck,
  BookOpen, FileBarChart, Settings, UserCircle
} from 'lucide-react';

export default function Navigation({ currentPage, onPageChange }) {
  const { user, logout } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsUserDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Build navigation items based on role
  const navigationItems = [];

  if (user?.role === 'ADMIN') {
    navigationItems.push(
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'adminAttendance', label: 'Attendance Controls', icon: Settings },
      { id: 'reports', label: 'Reports', icon: FileBarChart },
      { id: 'odApproval', label: 'OD Approval', icon: FileCheck }
    );
  } else if (user?.role === 'FACULTY') {
    navigationItems.push(
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'attendance', label: 'Mark Attendance', icon: ClipboardCheck },
      { id: 'myClasses', label: 'My Classes', icon: BookOpen },
      { id: 'reports', label: 'Reports', icon: FileBarChart },
      { id: 'pendingOD', label: 'Pending OD', icon: FileCheck }
    );
  } else if (user?.role === 'STUDENT') {
    navigationItems.push(
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'applyOD', label: 'Apply for OD', icon: FileCheck },
      { id: 'myRequests', label: 'My OD Requests', icon: ClipboardCheck },
      { id: 'upcomingClasses', label: 'Upcoming Classes', icon: BookOpen }
    );
  }

  // Count for notification badge (e.g., pending OD count)
  // This can be enhanced with real data later
  const notificationCount = 0;

  const handleLogout = () => {
    logout();
  };

  const handleNavClick = (id) => {
    onPageChange(id);
    setIsSidebarOpen(false); // Close mobile sidebar on nav click
  };

  const userInitials = user?.name
    ? user.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  return (
    <>
      {/* ============ TOP NAVBAR ============ */}
      <nav className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-200 z-50 shadow-sm">
        <div className="flex items-center justify-between h-full px-4 lg:px-6">
          {/* Left: Logo + Mobile menu toggle */}
          <div className="flex items-center gap-3">
            {/* Mobile sidebar toggle */}
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="lg:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
            >
              {isSidebarOpen ? <X size={22} /> : <Menu size={22} />}
            </button>

            {/* Logo + System Name */}
            <div className="flex items-center gap-3">
              <img
                src="/ssn_logo.png"
                alt="SSN College Logo"
                className="h-9 w-auto object-contain"
              />
              <div className="hidden sm:block">
                <h1 className="text-lg font-bold text-blue-900 leading-tight">SSN College Attendance System</h1>
              </div>
            </div>
          </div>

          {/* Right: Notifications + User Dropdown */}
          <div className="flex items-center gap-2">
            {/* Notification Bell */}
            <button className="relative p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors">
              <Bell size={20} />
              {notificationCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-5 w-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {notificationCount}
                </span>
              )}
            </button>

            {/* User Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center">
                  <span className="text-xs font-semibold text-white">{userInitials}</span>
                </div>
                <div className="hidden md:block text-left">
                  <p className="text-sm font-medium text-gray-900 leading-tight">{user?.name}</p>
                  <p className="text-[11px] text-gray-500 leading-tight capitalize">{user?.role?.toLowerCase()}</p>
                </div>
                <ChevronDown size={16} className="text-gray-400 hidden md:block" />
              </button>

              {/* Dropdown Menu */}
              {isUserDropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                  {/* User Info (visible on mobile where it's hidden in the button) */}
                  <div className="px-4 py-3 border-b border-gray-100 md:hidden">
                    <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                    <p className="text-xs text-gray-500 capitalize">{user?.role?.toLowerCase()}</p>
                  </div>

                  <div className="px-4 py-3 border-b border-gray-100 hidden md:block">
                    <p className="text-xs text-gray-500">Signed in as</p>
                    <p className="text-sm font-medium text-gray-900 truncate">{user?.email || user?.name}</p>
                  </div>

                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <LogOut size={16} />
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* ============ SIDEBAR ============ */}
      {/* Desktop Sidebar (always visible on lg+) */}
      <aside className="fixed top-16 left-0 bottom-0 w-60 bg-white border-r border-gray-200 z-40 hidden lg:flex flex-col">
        <div className="flex-1 py-4 overflow-y-auto">
          <nav className="px-3 space-y-1">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${isActive
                    ? 'bg-blue-50 text-blue-700 border-l-[3px] border-blue-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                >
                  <Icon size={20} className={isActive ? 'text-blue-700' : 'text-gray-400'} />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-semibold text-blue-700">{userInitials}</span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{user?.name}</p>
              <p className="text-xs text-gray-500 capitalize">{user?.role?.toLowerCase()}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Sidebar (overlay) */}
      {isSidebarOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />

          {/* Sidebar */}
          <aside className="fixed top-16 left-0 bottom-0 w-64 bg-white border-r border-gray-200 z-50 lg:hidden flex flex-col shadow-xl">
            <div className="flex-1 py-4 overflow-y-auto">
              <nav className="px-3 space-y-1">
                {navigationItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentPage === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNavClick(item.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${isActive
                        ? 'bg-blue-50 text-blue-700 border-l-[3px] border-blue-700'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                        }`}
                    >
                      <Icon size={20} className={isActive ? 'text-blue-700' : 'text-gray-400'} />
                      {item.label}
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Sidebar Footer (mobile) */}
            <div className="p-4 border-t border-gray-200">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-9 w-9 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-semibold text-blue-700">{userInitials}</span>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{user?.name}</p>
                  <p className="text-xs text-gray-500 capitalize">{user?.role?.toLowerCase()}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut size={16} />
                Sign out
              </button>
            </div>
          </aside>
        </>
      )}

      {/* ============ SPACER ============ */}
      {/* This ensures main content is pushed below the fixed navbar and beside the sidebar */}
      <div className="h-16" /> {/* Top navbar spacer */}
    </>
  );
}
