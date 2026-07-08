import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../services/api_service.dart';
import '../../models/class_session.dart';
import '../../models/student.dart';
import '../../theme/app_theme.dart';
import '../../widgets/attendance_badge.dart';
import '../../widgets/shimmer_loading.dart';

class MarkAttendanceScreen extends StatefulWidget {
  const MarkAttendanceScreen({super.key});

  @override
  State<MarkAttendanceScreen> createState() => _MarkAttendanceScreenState();
}

class _MarkAttendanceScreenState extends State<MarkAttendanceScreen> {
  List<ClassSession> _sessions = [];
  ClassSession? _selectedSession;
  List<Student> _students = [];
  Map<int, String> _statuses = {}; // studentId -> status
  bool _loadingSessions = true;
  bool _loadingStudents = false;
  bool _submitting = false;
  String _suffixInput = '';
  bool _useSuffixMode = false;

  @override
  void initState() {
    super.initState();
    _loadSessions();
  }

  Future<void> _loadSessions() async {
    setState(() => _loadingSessions = true);
    final user = context.read<AuthProvider>().user;
    final fId = user?.facultyId;
    if (fId == null) return;

    final res = await ApiService.getFacultySessions(fId, mode: 'today');
    if (mounted) {
      setState(() {
        _loadingSessions = false;
        if (res['success'] == true) {
          _sessions = (res['data'] as List)
              .map((e) => ClassSession.fromJson(e))
              .toList();
        }
      });
    }
  }

  Future<void> _loadStudents(ClassSession session) async {
    setState(() {
      _selectedSession = session;
      _loadingStudents = true;
      _students = [];
      _statuses = {};
    });

    // Load students for the session
    final studentsRes = await ApiService.getSessionStudents(session.id);
    // Load existing attendance
    final attendanceRes = await ApiService.getSessionAttendance(session.id);

    if (mounted) {
      setState(() {
        _loadingStudents = false;
        if (studentsRes['success'] == true) {
          _students = (studentsRes['data'] as List)
              .map((e) => Student.fromJson(e))
              .toList();
          // Default all to absent
          for (var s in _students) {
            _statuses[s.id] = 'absent';
          }
        }
        // Overlay existing attendance
        if (attendanceRes['success'] == true) {
          for (var a in (attendanceRes['data'] as List)) {
            _statuses[a['student_id']] = a['status'] ?? 'absent';
          }
        }
      });
    }
  }

  void _toggleStatus(int studentId) {
    setState(() {
      final current = _statuses[studentId] ?? 'absent';
      // Cycle: absent -> present -> od -> absent
      if (current == 'absent') {
        _statuses[studentId] = 'present';
      } else if (current == 'present') {
        _statuses[studentId] = 'od';
      } else {
        _statuses[studentId] = 'absent';
      }
    });
  }

  void _markAllPresent() {
    setState(() {
      for (var s in _students) {
        _statuses[s.id] = 'present';
      }
    });
  }

  void _markAllAbsent() {
    setState(() {
      for (var s in _students) {
        _statuses[s.id] = 'absent';
      }
    });
  }

  Future<void> _submitAttendance() async {
    if (_selectedSession == null) return;

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('Confirm Submission'),
        content: Text(
          'Mark attendance for ${_students.length} students?\n'
          'Present: ${_statuses.values.where((s) => s == "present").length}, '
          'Absent: ${_statuses.values.where((s) => s == "absent").length}, '
          'OD: ${_statuses.values.where((s) => s == "od").length}',
        ),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Submit'),
          ),
        ],
      ),
    );

    if (confirmed != true) return;

    setState(() => _submitting = true);
    final user = context.read<AuthProvider>().user;

    final records = _statuses.entries
        .map((e) => {'student_id': e.key, 'status': e.value})
        .toList();

    final res = await ApiService.markAttendance(
      sessionId: _selectedSession!.id,
      records: records,
      markedBy: user!.id,
    );

    if (mounted) {
      setState(() => _submitting = false);
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text(res['success'] == true
            ? 'Attendance marked successfully!'
            : res['error'] ?? 'Failed to mark attendance'),
        backgroundColor:
            res['success'] == true ? AppTheme.success : AppTheme.danger,
        behavior: SnackBarBehavior.floating,
      ));
    }
  }

  Future<void> _submitSuffix() async {
    if (_selectedSession == null || _suffixInput.trim().isEmpty) return;

    setState(() => _submitting = true);
    final user = context.read<AuthProvider>().user;

    final res = await ApiService.markBySuffix(
      sessionId: _selectedSession!.id,
      suffixes: _suffixInput.trim(),
      status: 'present',
      markedBy: user!.id,
    );

    if (mounted) {
      setState(() => _submitting = false);
      if (res['success'] == true) {
        final data = res['data'];
        final marked = (data['marked'] as List?)?.length ?? 0;
        final notFound = (data['not_found'] as List?) ?? [];
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text(
            'Marked $marked students present.'
            '${notFound.isNotEmpty ? ' Not found: ${notFound.join(", ")}' : ''}',
          ),
          backgroundColor: AppTheme.success,
          behavior: SnackBarBehavior.floating,
        ));
        // Reload attendance
        _loadStudents(_selectedSession!);
      } else {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text(res['error'] ?? 'Failed'),
          backgroundColor: AppTheme.danger,
          behavior: SnackBarBehavior.floating,
        ));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loadingSessions) {
      return const Padding(
        padding: EdgeInsets.all(16),
        child: ShimmerLoading(itemCount: 3),
      );
    }

    return Column(
      children: [
        // Session Selector
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.white,
            border: Border(bottom: BorderSide(color: AppTheme.border)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text("Today's Sessions",
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: AppTheme.textSecondary,
                  )),
              const SizedBox(height: 8),
              if (_sessions.isEmpty)
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: AppTheme.warningLight,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Row(
                    children: [
                      Icon(Icons.info_outline, size: 18, color: AppTheme.warning),
                      const SizedBox(width: 8),
                      const Text('No sessions scheduled for today',
                          style: TextStyle(fontSize: 13)),
                    ],
                  ),
                )
              else
                SizedBox(
                  height: 44,
                  child: ListView.separated(
                    scrollDirection: Axis.horizontal,
                    itemCount: _sessions.length,
                    separatorBuilder: (_, __) => const SizedBox(width: 8),
                    itemBuilder: (_, i) {
                      final s = _sessions[i];
                      final selected = _selectedSession?.id == s.id;
                      return GestureDetector(
                        onTap: () => _loadStudents(s),
                        child: AnimatedContainer(
                          duration: const Duration(milliseconds: 200),
                          padding: const EdgeInsets.symmetric(
                              horizontal: 14, vertical: 10),
                          decoration: BoxDecoration(
                            color: selected
                                ? AppTheme.primary
                                : AppTheme.primary.withOpacity(0.06),
                            borderRadius: BorderRadius.circular(10),
                            border: selected
                                ? null
                                : Border.all(color: AppTheme.border),
                          ),
                          child: Text(
                            '${s.subjectName} (${s.timeRange})',
                            style: TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w600,
                              color:
                                  selected ? Colors.white : AppTheme.textPrimary,
                            ),
                          ),
                        ),
                      );
                    },
                  ),
                ),
            ],
          ),
        ),

        // Student List / Suffix Mode
        if (_selectedSession != null)
          Expanded(
            child: _loadingStudents
                ? const ShimmerLoading(itemCount: 8)
                : Column(
                    children: [
                      // Toggle & Bulk Actions
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 16, vertical: 10),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF8FAFC),
                          border: Border(
                            bottom: BorderSide(color: AppTheme.border),
                          ),
                        ),
                        child: Row(
                          children: [
                            // Mode toggle
                            GestureDetector(
                              onTap: () => setState(
                                  () => _useSuffixMode = !_useSuffixMode),
                              child: Container(
                                padding: const EdgeInsets.symmetric(
                                    horizontal: 10, vertical: 6),
                                decoration: BoxDecoration(
                                  color: _useSuffixMode
                                      ? AppTheme.accent.withOpacity(0.1)
                                      : AppTheme.primary.withOpacity(0.1),
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: Text(
                                  _useSuffixMode ? '# Suffix' : '☑ Checklist',
                                  style: TextStyle(
                                    fontSize: 12,
                                    fontWeight: FontWeight.w700,
                                    color: _useSuffixMode
                                        ? AppTheme.accent
                                        : AppTheme.primary,
                                  ),
                                ),
                              ),
                            ),
                            const Spacer(),
                            if (!_useSuffixMode) ...[
                              _actionChip('All P', AppTheme.success, _markAllPresent),
                              const SizedBox(width: 6),
                              _actionChip('All A', AppTheme.danger, _markAllAbsent),
                            ],
                          ],
                        ),
                      ),

                      // Content
                      Expanded(
                        child: _useSuffixMode
                            ? _buildSuffixMode()
                            : _buildChecklistMode(),
                      ),

                      // Submit Button
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withOpacity(0.05),
                              blurRadius: 10,
                              offset: const Offset(0, -2),
                            ),
                          ],
                        ),
                        child: ElevatedButton(
                          onPressed: _submitting
                              ? null
                              : (_useSuffixMode
                                  ? _submitSuffix
                                  : _submitAttendance),
                          style: ElevatedButton.styleFrom(
                            padding: const EdgeInsets.symmetric(vertical: 14),
                          ),
                          child: _submitting
                              ? const SizedBox(
                                  height: 20,
                                  width: 20,
                                  child: CircularProgressIndicator(
                                      strokeWidth: 2, color: Colors.white),
                                )
                              : Text(
                                  _useSuffixMode
                                      ? 'Mark Present by Suffix'
                                      : 'Submit Attendance',
                                  style: const TextStyle(
                                      fontSize: 15, fontWeight: FontWeight.w700),
                                ),
                        ),
                      ),
                    ],
                  ),
          ),

        // No session selected
        if (_selectedSession == null && _sessions.isNotEmpty)
          Expanded(
            child: Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.touch_app_rounded,
                      size: 48, color: AppTheme.textMuted.withOpacity(0.4)),
                  const SizedBox(height: 12),
                  Text('Select a session above to mark attendance',
                      style: TextStyle(color: AppTheme.textSecondary)),
                ],
              ),
            ),
          ),
      ],
    );
  }

  Widget _buildChecklistMode() {
    return ListView.builder(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      itemCount: _students.length,
      itemBuilder: (_, i) {
        final student = _students[i];
        final status = _statuses[student.id] ?? 'absent';
        return Container(
          margin: const EdgeInsets.only(bottom: 6),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(10),
            border: Border.all(
              color: status == 'present'
                  ? AppTheme.success.withOpacity(0.3)
                  : status == 'od'
                      ? AppTheme.info.withOpacity(0.3)
                      : AppTheme.border,
            ),
          ),
          child: ListTile(
            dense: true,
            onTap: () => _toggleStatus(student.id),
            leading: Text(
              student.rollNo.length > 3
                  ? student.rollNo.substring(student.rollNo.length - 3)
                  : student.rollNo,
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w700,
                color: AppTheme.textMuted,
              ),
            ),
            title: Text(student.name,
                style: const TextStyle(
                    fontSize: 14, fontWeight: FontWeight.w600)),
            trailing: AttendanceBadge(status: status),
          ),
        );
      },
    );
  }

  Widget _buildSuffixMode() {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Enter Roll Number Suffixes',
              style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 4),
          Text(
            'Comma or space separated. Ranges supported (e.g. 1-30).',
            style: TextStyle(fontSize: 12, color: AppTheme.textMuted),
          ),
          const SizedBox(height: 12),
          TextField(
            maxLines: 4,
            onChanged: (v) => _suffixInput = v,
            decoration: const InputDecoration(
              hintText: 'e.g. 1, 3, 5-10, 15, 20-25',
            ),
          ),
        ],
      ),
    );
  }

  Widget _actionChip(String label, Color color, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        decoration: BoxDecoration(
          color: color.withOpacity(0.1),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w700,
            color: color,
          ),
        ),
      ),
    );
  }
}
