import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

class AttendanceBadge extends StatelessWidget {
  final String status;
  final bool small;

  const AttendanceBadge({
    super.key,
    required this.status,
    this.small = false,
  });

  @override
  Widget build(BuildContext context) {
    final s = status.toLowerCase();
    Color bg, fg;
    String label;
    IconData icon;

    switch (s) {
      case 'present':
        bg = AppTheme.successLight;
        fg = const Color(0xFF166534);
        label = 'Present';
        icon = Icons.check_circle_outline;
        break;
      case 'absent':
        bg = AppTheme.dangerLight;
        fg = const Color(0xFF991B1B);
        label = 'Absent';
        icon = Icons.cancel_outlined;
        break;
      case 'od':
        bg = AppTheme.infoLight;
        fg = const Color(0xFF1E40AF);
        label = 'OD';
        icon = Icons.access_time;
        break;
      default:
        bg = const Color(0xFFF1F5F9);
        fg = AppTheme.textMuted;
        label = status;
        icon = Icons.help_outline;
    }

    if (small) {
      return Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
        decoration: BoxDecoration(
          color: bg,
          borderRadius: BorderRadius.circular(6),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w600,
            color: fg,
          ),
        ),
      );
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: fg),
          const SizedBox(width: 4),
          Text(
            label,
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w600,
              color: fg,
            ),
          ),
        ],
      ),
    );
  }
}
