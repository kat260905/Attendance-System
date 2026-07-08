import 'dart:io';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import 'package:open_filex/open_filex.dart';
import '../../providers/auth_provider.dart';
import '../../services/api_service.dart';
import '../../models/od_request.dart';
import '../../theme/app_theme.dart';
import '../../widgets/shimmer_loading.dart';

class ODReviewScreen extends StatefulWidget {
  const ODReviewScreen({super.key});

  @override
  State<ODReviewScreen> createState() => _ODReviewScreenState();
}

class _ODReviewScreenState extends State<ODReviewScreen> {
  List<ODRequest> _pendingRequests = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadRequests();
  }

  Future<void> _loadRequests() async {
    setState(() => _loading = true);

    final res = await ApiService.getAdminPendingODRequests();
    if (mounted) {
      setState(() {
        _loading = false;
        if (res['success'] == true) {
          _pendingRequests = (res['data'] as List)
              .map((e) => ODRequest.fromJson(e))
              .toList();
        }
      });
    }
  }

  Future<void> _viewDocument(int requestId) async {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Downloading document...'),
        duration: Duration(seconds: 1),
        behavior: SnackBarBehavior.floating,
      ),
    );

    final response = await ApiService.downloadDocument(requestId);
    if (!mounted) return;

    if (response == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Failed to download document'),
          backgroundColor: AppTheme.danger,
          behavior: SnackBarBehavior.floating,
        ),
      );
      return;
    }

    // Get file extension from content-type
    final contentType = response.headers['content-type'] ?? '';
    String ext = '.pdf';
    if (contentType.contains('png')) ext = '.png';
    if (contentType.contains('jpeg') || contentType.contains('jpg')) ext = '.jpg';
    if (contentType.contains('doc')) ext = '.doc';

    // Save to the public Downloads folder so it appears in system Downloads
    final downloadsDir = Directory('/storage/emulated/0/Download');
    if (!downloadsDir.existsSync()) {
      downloadsDir.createSync(recursive: true);
    }
    final fileName = 'OD_Document_$requestId$ext';
    final file = File('${downloadsDir.path}/$fileName');
    await file.writeAsBytes(response.bodyBytes);

    if (!mounted) return;

    // Open the file with the system's default viewer
    final result = await OpenFilex.open(file.path);

    if (result.type != ResultType.done && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Downloaded to: Downloads/$fileName'),
          backgroundColor: AppTheme.success,
          behavior: SnackBarBehavior.floating,
          duration: const Duration(seconds: 3),
        ),
      );
    }
  }

  Future<void> _approveRequest(ODRequest req) async {
    final remarksController = TextEditingController();

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('Approve OD Request'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              '${req.studentName ?? "Student"} — ${req.reason}',
              style: TextStyle(fontSize: 13, color: AppTheme.textSecondary),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: remarksController,
              maxLines: 2,
              decoration: const InputDecoration(
                hintText: 'Add remarks (optional)',
                border: OutlineInputBorder(),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: ElevatedButton.styleFrom(backgroundColor: AppTheme.success),
            child: const Text('Approve'),
          ),
        ],
      ),
    );

    if (confirmed != true) return;

    final user = context.read<AuthProvider>().user;
    final res = await ApiService.adminApproveOD(
      req.id,
      user!.id,
      remarks: remarksController.text.trim(),
    );

    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text(res['success'] == true
            ? 'OD request approved!'
            : res['error'] ?? 'Failed to approve'),
        backgroundColor:
            res['success'] == true ? AppTheme.success : AppTheme.danger,
        behavior: SnackBarBehavior.floating,
      ));
      if (res['success'] == true) _loadRequests();
    }
    remarksController.dispose();
  }

  Future<void> _rejectRequest(ODRequest req) async {
    final remarksController = TextEditingController();

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('Reject OD Request'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              '${req.studentName ?? "Student"} — ${req.reason}',
              style: TextStyle(fontSize: 13, color: AppTheme.textSecondary),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: remarksController,
              maxLines: 2,
              decoration: const InputDecoration(
                hintText: 'Reason for rejection (optional)',
                border: OutlineInputBorder(),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: ElevatedButton.styleFrom(backgroundColor: AppTheme.danger),
            child: const Text('Reject'),
          ),
        ],
      ),
    );

    if (confirmed != true) return;

    final user = context.read<AuthProvider>().user;
    final res = await ApiService.adminRejectOD(
      req.id,
      user!.id,
      remarks: remarksController.text.trim(),
    );

    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text(res['success'] == true
            ? 'OD request rejected'
            : res['error'] ?? 'Failed to reject'),
        backgroundColor:
            res['success'] == true ? AppTheme.success : AppTheme.danger,
        behavior: SnackBarBehavior.floating,
      ));
      if (res['success'] == true) _loadRequests();
    }
    remarksController.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Padding(
          padding: EdgeInsets.all(16), child: ShimmerLoading(itemCount: 4));
    }

    if (_pendingRequests.isEmpty) {
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
            Text('All student requests have been reviewed',
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
        itemCount: _pendingRequests.length,
        separatorBuilder: (_, __) => const SizedBox(height: 10),
        itemBuilder: (_, i) => _buildRequestCard(_pendingRequests[i]),
      ),
    );
  }

  Widget _buildRequestCard(ODRequest req) {
    final dateFmt = DateFormat('dd MMM yyyy');
    final dateTimeFmt = DateFormat('dd MMM, hh:mm a');

    return Container(
      decoration: AppTheme.cardDecoration,
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Student Header
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: AppTheme.primary.withOpacity(0.08),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(Icons.person_rounded,
                    color: AppTheme.primary, size: 22),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      req.studentName ?? 'Student #${req.studentId}',
                      style: const TextStyle(
                          fontSize: 15, fontWeight: FontWeight.w700),
                    ),
                    const SizedBox(height: 2),
                    Row(
                      children: [
                        if (req.rollNo != null)
                          Flexible(
                            child: Text(req.rollNo!,
                                overflow: TextOverflow.ellipsis,
                                style: TextStyle(
                                    fontSize: 12, color: AppTheme.textMuted)),
                          ),
                        if (req.classInfo != null) ...[
                          Text(' • ',
                              style: TextStyle(color: AppTheme.textMuted)),
                          Flexible(
                            child: Text(req.classInfo!,
                                overflow: TextOverflow.ellipsis,
                                style: TextStyle(
                                    fontSize: 12, color: AppTheme.textMuted)),
                          ),
                        ],
                      ],
                    ),
                  ],
                ),
              ),
              if (req.createdAt != null)
                Text(
                  dateTimeFmt.format(DateTime.parse(req.createdAt!)),
                  style: TextStyle(fontSize: 10, color: AppTheme.textMuted),
                ),
            ],
          ),
          const SizedBox(height: 14),

          // Details
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: const Color(0xFFF8FAFC),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _detailRow(
                  Icons.calendar_today,
                  'Dates',
                  req.fromDate != req.toDate
                      ? '${dateFmt.format(DateTime.parse(req.fromDate))} — ${dateFmt.format(DateTime.parse(req.toDate))}'
                      : dateFmt.format(DateTime.parse(req.fromDate)),
                ),
                const SizedBox(height: 8),
                _detailRow(Icons.description_outlined, 'Reason', req.reason),
                if (req.supportingDocument != null) ...[
                  const SizedBox(height: 8),
                  GestureDetector(
                    onTap: () => _viewDocument(req.id),
                    child: Row(
                      children: [
                        Icon(Icons.attach_file,
                            size: 14, color: AppTheme.accent),
                        const SizedBox(width: 6),
                        Text('View Document',
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                              color: AppTheme.accent,
                              decoration: TextDecoration.underline,
                            )),
                      ],
                    ),
                  ),
                ],
              ],
            ),
          ),
          const SizedBox(height: 14),

          // Action Buttons
          Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: () => _rejectRequest(req),
                  icon: const Icon(Icons.close, size: 16),
                  label: const Text('Reject'),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: AppTheme.danger,
                    side:
                        BorderSide(color: AppTheme.danger.withOpacity(0.3)),
                    padding: const EdgeInsets.symmetric(vertical: 12),
                  ),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: ElevatedButton.icon(
                  onPressed: () => _approveRequest(req),
                  icon: const Icon(Icons.check, size: 16),
                  label: const Text('Approve'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.success,
                    padding: const EdgeInsets.symmetric(vertical: 12),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _detailRow(IconData icon, String label, String value) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 14, color: AppTheme.textMuted),
        const SizedBox(width: 8),
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
                  style: const TextStyle(
                      fontSize: 13, fontWeight: FontWeight.w500)),
            ],
          ),
        ),
      ],
    );
  }
}
