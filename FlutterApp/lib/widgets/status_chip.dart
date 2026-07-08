import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

class StatusChip extends StatelessWidget {
  final String status;

  const StatusChip({super.key, required this.status});

  @override
  Widget build(BuildContext context) {
    final s = status.toLowerCase();
    Color bg, fg;
    IconData icon;

    switch (s) {
      case 'pending':
        bg = AppTheme.warningLight;
        fg = const Color(0xFF854D0E);
        icon = Icons.hourglass_empty;
        break;
      case 'approved':
        bg = AppTheme.successLight;
        fg = const Color(0xFF166534);
        icon = Icons.check_circle_outline;
        break;
      case 'rejected':
        bg = AppTheme.dangerLight;
        fg = const Color(0xFF991B1B);
        icon = Icons.cancel_outlined;
        break;
      case 'applied':
        bg = AppTheme.infoLight;
        fg = const Color(0xFF1E40AF);
        icon = Icons.done_all;
        break;
      case 'cancelled':
        bg = const Color(0xFFF1F5F9);
        fg = AppTheme.textMuted;
        icon = Icons.block;
        break;
      default:
        bg = const Color(0xFFF1F5F9);
        fg = AppTheme.textMuted;
        icon = Icons.help_outline;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
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
            status.toUpperCase(),
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w700,
              color: fg,
              letterSpacing: 0.5,
            ),
          ),
        ],
      ),
    );
  }
}
