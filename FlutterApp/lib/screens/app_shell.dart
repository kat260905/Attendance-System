import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../theme/app_theme.dart';
import 'student/student_dashboard.dart';
import 'student/apply_od_screen.dart';
import 'student/my_od_requests_screen.dart';
import 'faculty/faculty_dashboard.dart';
import 'faculty/my_classes_screen.dart';
import 'faculty/mark_attendance_screen.dart';
import 'faculty/od_pending_screen.dart';
import 'faculty/attendance_report_screen.dart';
import 'admin/admin_dashboard.dart';
import 'admin/od_review_screen.dart';

class AppShell extends StatefulWidget {
  const AppShell({super.key});

  @override
  State<AppShell> createState() => _AppShellState();
}

class _AppShellState extends State<AppShell> {
  int _currentIndex = 0;

  List<_NavItem> _getNavItems(String role) {
    switch (role) {
      case 'STUDENT':
        return [
          _NavItem('Dashboard', Icons.dashboard_rounded, const StudentDashboard()),
          _NavItem('Apply OD', Icons.edit_calendar_rounded, const ApplyODScreen()),
          _NavItem('Requests', Icons.list_alt_rounded, const MyODRequestsScreen()),
        ];
      case 'FACULTY':
        return [
          _NavItem('Dashboard', Icons.dashboard_rounded, const FacultyDashboard()),
          _NavItem('Classes', Icons.class_rounded, const MyClassesScreen()),
          _NavItem('Attendance', Icons.fact_check_rounded, const MarkAttendanceScreen()),
          _NavItem('OD', Icons.pending_actions_rounded, const ODPendingScreen()),
          _NavItem('Reports', Icons.assessment_rounded, const AttendanceReportScreen()),
        ];
      case 'ADMIN':
        return [
          _NavItem('Dashboard', Icons.dashboard_rounded, const AdminDashboard()),
          _NavItem('OD Review', Icons.rate_review_rounded, const ODReviewScreen()),
        ];
      default:
        return [];
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final user = auth.user;
    if (user == null) return const SizedBox.shrink();

    final navItems = _getNavItems(user.role);
    if (_currentIndex >= navItems.length) {
      _currentIndex = 0;
    }

    return Scaffold(
      appBar: AppBar(
        title: Text(navItems[_currentIndex].label),
        actions: [
          // User info pill
          Container(
            margin: const EdgeInsets.only(right: 8),
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(
              color: AppTheme.primary.withOpacity(0.08),
              borderRadius: BorderRadius.circular(20),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.person, size: 16, color: AppTheme.primary),
                const SizedBox(width: 4),
                Text(
                  user.name.split(' ').first,
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: AppTheme.primary,
                  ),
                ),
              ],
            ),
          ),
          // Notification Bell
          IconButton(
            icon: const Icon(Icons.notifications_none_rounded, size: 22),
            tooltip: 'Notifications',
            onPressed: () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('No new notifications')),
              );
            },
          ),
          // Logout
          IconButton(
            icon: const Icon(Icons.logout_rounded, size: 22),
            tooltip: 'Logout',
            onPressed: () => _showLogoutDialog(context),
          ),
        ],
      ),
      body: IndexedStack(
        index: _currentIndex,
        children: navItems.map((e) => e.screen).toList(),
      ),
      bottomNavigationBar: Container(
        decoration: BoxDecoration(
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.05),
              blurRadius: 10,
              offset: const Offset(0, -2),
            ),
          ],
        ),
        child: BottomNavigationBar(
          currentIndex: _currentIndex,
          onTap: (i) => setState(() => _currentIndex = i),
          items: navItems
              .map((e) => BottomNavigationBarItem(
                    icon: Icon(e.icon),
                    label: e.label,
                  ))
              .toList(),
        ),
      ),
    );
  }

  void _showLogoutDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('Logout'),
        content: const Text('Are you sure you want to sign out?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(ctx);
              context.read<AuthProvider>().logout();
            },
            style: ElevatedButton.styleFrom(backgroundColor: AppTheme.danger),
            child: const Text('Logout'),
          ),
        ],
      ),
    );
  }
}

class _NavItem {
  final String label;
  final IconData icon;
  final Widget screen;
  _NavItem(this.label, this.icon, this.screen);
}
