import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../../providers/auth_provider.dart';
import '../../services/api_service.dart';
import '../../models/od_request.dart';
import '../../theme/app_theme.dart';
import '../../widgets/shimmer_loading.dart';

class ODPendingScreen extends StatefulWidget {
  const ODPendingScreen({super.key});

  @override
  State<ODPendingScreen> createState() => _ODPendingScreenState();
}

class _ODPendingScreenState extends State<ODPendingScreen> {
  List<PendingOD> _pendingODs = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadPending();
  }

  Future<void> _loadPending() async {
    setState(() => _loading = true);
    final user = context.read<AuthProvider>().user;
    final fId = user?.facultyId;
    if (fId == null) return;

    final res = await ApiService.getPendingOD(fId);
    if (mounted) {
      setState(() {
        _loading = false;
        if (res['success'] == true) {
          _pendingODs = (res['data'] as List)
              .map((e) => PendingOD.fromJson(e))
              .toList();
        }
      });
    }
  }

  Future<void> _applyOD(PendingOD od) async {
    final user = context.read<AuthProvider>().user;
    final fId = user?.facultyId;
    if (fId == null) return;

    final res = await ApiService.applyOD(od.id, fId);
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text(res['success'] == true
            ? 'OD applied for ${od.studentName ?? "student"}'
            : res['error'] ?? 'Failed to apply OD'),
        backgroundColor:
            res['success'] == true ? AppTheme.success : AppTheme.danger,
        behavior: SnackBarBehavior.floating,
      ));
      if (res['success'] == true) _loadPending();
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Padding(
        padding: EdgeInsets.all(16),
        child: ShimmerLoading(itemCount: 4),
      );
    }

    if (_pendingODs.isEmpty) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.check_circle_outline,
                size: 56, color: AppTheme.success.withOpacity(0.5)),
            const SizedBox(height: 12),
            Text('No pending OD requests',
                style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                    color: AppTheme.textSecondary)),
            const SizedBox(height: 4),
            Text('All OD requests have been processed',
                style: TextStyle(fontSize: 13, color: AppTheme.textMuted)),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _loadPending,
      color: AppTheme.primary,
      child: ListView.separated(
        padding: const EdgeInsets.all(16),
        itemCount: _pendingODs.length,
        separatorBuilder: (_, __) => const SizedBox(height: 10),
        itemBuilder: (_, i) => _buildODCard(_pendingODs[i]),
      ),
    );
  }

  Widget _buildODCard(PendingOD od) {
    final dateFmt = DateFormat('dd MMM yyyy');

    return Container(
      decoration: AppTheme.cardDecoration,
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: AppTheme.accent.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child:
                    Icon(Icons.person, size: 20, color: AppTheme.accent),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      od.studentName ?? 'Student #${od.studentId}',
                      style: const TextStyle(
                          fontSize: 15, fontWeight: FontWeight.w700),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      dateFmt.format(DateTime.parse(od.date)),
                      style: TextStyle(
                          fontSize: 13, color: AppTheme.textSecondary),
                    ),
                  ],
                ),
              ),
            ],
          ),

          if (od.reason != null && od.reason!.isNotEmpty) ...[
            const SizedBox(height: 10),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: const Color(0xFFF8FAFC),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(od.reason!,
                  style: TextStyle(
                      fontSize: 13, color: AppTheme.textSecondary)),
            ),
          ],

          const SizedBox(height: 12),

          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              onPressed: () => _applyOD(od),
              icon: const Icon(Icons.check, size: 18),
              label: const Text('Apply OD to Attendance'),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.success,
                padding: const EdgeInsets.symmetric(vertical: 12),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
