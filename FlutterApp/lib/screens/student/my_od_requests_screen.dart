import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../../providers/auth_provider.dart';
import '../../services/api_service.dart';
import '../../models/od_request.dart';
import '../../theme/app_theme.dart';
import '../../widgets/status_chip.dart';
import '../../widgets/shimmer_loading.dart';

class MyODRequestsScreen extends StatefulWidget {
  const MyODRequestsScreen({super.key});

  @override
  State<MyODRequestsScreen> createState() => _MyODRequestsScreenState();
}

class _MyODRequestsScreenState extends State<MyODRequestsScreen> {
  List<ODRequest> _requests = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadRequests();
  }

  Future<void> _loadRequests() async {
    setState(() => _loading = true);
    final user = context.read<AuthProvider>().user;
    final studentId = user?.studentId ?? user?.id;
    if (studentId == null) return;

    final res = await ApiService.getStudentODRequests(studentId);
    if (mounted) {
      setState(() {
        _loading = false;
        if (res['success'] == true) {
          _requests = (res['data'] as List)
              .map((e) => ODRequest.fromJson(e))
              .toList();
        }
      });
    }
  }

  Future<void> _cancelRequest(int requestId) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('Cancel Request?'),
        content:
            const Text('Are you sure you want to cancel this OD request?'),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: const Text('No')),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            style:
                ElevatedButton.styleFrom(backgroundColor: AppTheme.danger),
            child: const Text('Cancel Request'),
          ),
        ],
      ),
    );

    if (confirmed != true) return;

    final user = context.read<AuthProvider>().user;
    final studentId = user?.studentId ?? user?.id;
    if (studentId == null) return;

    final res = await ApiService.cancelODRequest(requestId, studentId);
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text(res['success'] == true
            ? 'Request cancelled'
            : res['error'] ?? 'Failed'),
        backgroundColor:
            res['success'] == true ? AppTheme.success : AppTheme.danger,
        behavior: SnackBarBehavior.floating,
      ));
      _loadRequests();
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Padding(
        padding: EdgeInsets.all(16),
        child: ShimmerLoading(itemCount: 5),
      );
    }

    if (_requests.isEmpty) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.list_alt_rounded,
                size: 56, color: AppTheme.textMuted.withOpacity(0.4)),
            const SizedBox(height: 12),
            Text('No OD requests yet',
                style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                    color: AppTheme.textSecondary)),
            const SizedBox(height: 4),
            Text('Submit one from the Apply OD tab',
                style: TextStyle(fontSize: 13, color: AppTheme.textMuted)),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _loadRequests,
      color: AppTheme.primary,
      child: ListView.separated(
        padding: const EdgeInsets.all(16),
        itemCount: _requests.length,
        separatorBuilder: (_, __) => const SizedBox(height: 10),
        itemBuilder: (_, i) => _buildRequestCard(_requests[i]),
      ),
    );
  }

  Widget _buildRequestCard(ODRequest req) {
    final dateFmt = DateFormat('dd MMM yyyy');
    final dateTimeFmt = DateFormat('dd MMM yyyy, hh:mm a');

    return Container(
      decoration: AppTheme.cardDecoration,
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              StatusChip(status: req.status),
              if (req.createdAt != null)
                Text(
                  dateTimeFmt.format(DateTime.parse(req.createdAt!)),
                  style: TextStyle(fontSize: 11, color: AppTheme.textMuted),
                ),
            ],
          ),
          const SizedBox(height: 14),

          // Dates
          _infoRow(
            Icons.calendar_today,
            'Date',
            req.fromDate != req.toDate
                ? '${dateFmt.format(DateTime.parse(req.fromDate))} — ${dateFmt.format(DateTime.parse(req.toDate))}'
                : dateFmt.format(DateTime.parse(req.fromDate)),
          ),
          const SizedBox(height: 8),

          // Reason
          _infoRow(Icons.description_outlined, 'Reason', req.reason),

          // Document
          if (req.supportingDocument != null) ...[
            const SizedBox(height: 8),
            Row(
              children: [
                Icon(Icons.attach_file, size: 14, color: AppTheme.textMuted),
                const SizedBox(width: 6),
                Text(
                  'Document attached',
                  style: TextStyle(
                    fontSize: 12,
                    color: AppTheme.accent,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ],

          // Admin notes
          if (req.adminNotes != null && req.adminNotes!.isNotEmpty) ...[
            const SizedBox(height: 10),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: const Color(0xFFF8FAFC),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                'Admin: "${req.adminNotes}"',
                style: TextStyle(
                  fontSize: 12,
                  fontStyle: FontStyle.italic,
                  color: AppTheme.textSecondary,
                ),
              ),
            ),
          ],

          // Cancel button
          if (req.status == 'pending') ...[
            const SizedBox(height: 12),
            const Divider(),
            const SizedBox(height: 8),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                onPressed: () => _cancelRequest(req.id),
                icon: const Icon(Icons.close, size: 16),
                label: const Text('Cancel Request'),
                style: OutlinedButton.styleFrom(
                  foregroundColor: AppTheme.danger,
                  side: BorderSide(color: AppTheme.danger.withOpacity(0.3)),
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _infoRow(IconData icon, String label, String value) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 14, color: AppTheme.textMuted),
        const SizedBox(width: 6),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(label,
                  style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.w600,
                    color: AppTheme.textMuted,
                    letterSpacing: 0.5,
                  )),
              const SizedBox(height: 2),
              Text(value,
                  style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500)),
            ],
          ),
        ),
      ],
    );
  }
}
