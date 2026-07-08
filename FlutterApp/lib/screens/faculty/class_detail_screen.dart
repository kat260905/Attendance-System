import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import 'dart:io';
import 'package:open_filex/open_filex.dart';
import '../../providers/auth_provider.dart';
import '../../services/api_service.dart';
import '../../models/class_session.dart';
import '../../models/attendance_record.dart';
import '../../models/dashboard_data.dart';
import '../../theme/app_theme.dart';
import '../../widgets/attendance_badge.dart';
import '../../widgets/shimmer_loading.dart';

class ClassDetailScreen extends StatefulWidget {
  final FacultyClass facultyClass;

  const ClassDetailScreen({super.key, required this.facultyClass});

  @override
  State<ClassDetailScreen> createState() => _ClassDetailScreenState();
}

class _ClassDetailScreenState extends State<ClassDetailScreen> {
  List<ClassSession> _allSessions = [];
  List<ClassSession> _filteredSessions = [];
  ClassSession? _selectedSession;
  List<AttendanceRecord> _attendance = [];
  bool _loadingSessions = true;
  bool _loadingAttendance = false;
  bool _saving = false;
  bool _exporting = false;
  bool _isEditing = false;
  DateTime _selectedDate = DateTime.now();
  Map<int, String> _editedStatuses = {};
  Map<int, String> _originalStatuses = {};

  // Suffix marking state
  String _suffixInput = '';
  String _suffixMode = 'absent';
  bool _suffixLoading = false;
  final TextEditingController _suffixController = TextEditingController();

  bool get _hasChanges {
    for (final entry in _editedStatuses.entries) {
      if (_originalStatuses[entry.key] != entry.value) return true;
    }
    return false;
  }

  @override
  void initState() {
    super.initState();
    _loadSessions();
  }

  @override
  void dispose() {
    _suffixController.dispose();
    super.dispose();
  }

  Future<void> _loadSessions() async {
    setState(() => _loadingSessions = true);
    final user = context.read<AuthProvider>().user;
    final fId = user?.facultyId;

    final res = await ApiService.getSessionsByClass(
      widget.facultyClass.classId,
      facultyId: fId,
    );

    if (mounted) {
      setState(() {
        _loadingSessions = false;
        if (res['success'] == true) {
          _allSessions = (res['data'] as List)
              .map((e) => ClassSession.fromJson(e))
              .toList();

          // Default: today or latest session date
          if (_allSessions.isNotEmpty) {
            final today = DateFormat('yyyy-MM-dd').format(DateTime.now());
            final hasTodaySessions = _allSessions.any((s) => s.date == today);
            if (!hasTodaySessions) {
              _selectedDate = DateTime.parse(_allSessions.first.date);
            }
          }
          _filterByDate();
        }
      });
    }
  }

  void _filterByDate() {
    final dateStr = DateFormat('yyyy-MM-dd').format(_selectedDate);
    _filteredSessions = _allSessions.where((s) => s.date == dateStr).toList();
    _isEditing = false;
    _editedStatuses = {};
    _originalStatuses = {};

    if (_filteredSessions.isNotEmpty) {
      _loadAttendance(_filteredSessions.first);
    } else {
      _selectedSession = null;
      _attendance = [];
    }
  }

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _selectedDate,
      firstDate: DateTime.now().subtract(const Duration(days: 365)),
      lastDate: DateTime.now().add(const Duration(days: 30)),
      builder: (context, child) => Theme(
        data: Theme.of(context).copyWith(
          colorScheme: ColorScheme.light(primary: AppTheme.primary),
        ),
        child: child!,
      ),
    );
    if (picked != null) {
      setState(() {
        _selectedDate = picked;
        _filterByDate();
      });
    }
  }

  void _goToPreviousDay() {
    setState(() {
      _selectedDate = _selectedDate.subtract(const Duration(days: 1));
      _filterByDate();
    });
  }

  void _goToNextDay() {
    setState(() {
      _selectedDate = _selectedDate.add(const Duration(days: 1));
      _filterByDate();
    });
  }

  Future<void> _loadAttendance(ClassSession session) async {
    setState(() {
      _selectedSession = session;
      _loadingAttendance = true;
      _isEditing = false;
      _editedStatuses = {};
      _originalStatuses = {};
    });

    final res = await ApiService.getSessionAttendance(session.id);
    if (mounted) {
      setState(() {
        _loadingAttendance = false;
        if (res['success'] == true) {
          _attendance = (res['data'] as List)
              .map((e) => AttendanceRecord.fromJson(e))
              .toList();
          for (final r in _attendance) {
            _originalStatuses[r.studentId] = r.status;
            _editedStatuses[r.studentId] = r.status;
          }
        }
      });
    }
  }

  void _toggleStatus(int studentId) {
    if (!_isEditing) return;
    setState(() {
      final cur = _editedStatuses[studentId] ?? 'absent';
      _editedStatuses[studentId] =
          cur == 'absent' ? 'present' : (cur == 'present' ? 'od' : 'absent');
    });
  }

  Future<void> _handleSuffixMark() async {
    if (_selectedSession == null) return;
    if (_suffixInput.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
        content: Text('Please enter at least one suffix'),
        backgroundColor: AppTheme.danger,
      ));
      return;
    }

    setState(() => _suffixLoading = true);
    final user = context.read<AuthProvider>().user;
    
    final res = await ApiService.markBySuffix(
      sessionId: _selectedSession!.id,
      suffixes: _suffixInput,
      status: _suffixMode,
      markedBy: user!.id,
    );

    if (mounted) {
      setState(() => _suffixLoading = false);
      if (res['success'] == true) {
        final data = res['data'];
        final markedCount = (data['marked'] as List).length;
        final notFound = data['not_found'] as List;
        
        String msg = 'Marked $markedCount student(s) $_suffixMode.';
        if (notFound.isNotEmpty) {
          msg += ' Not found: ${notFound.join(", ")}';
        }
        
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text(msg),
          backgroundColor: notFound.isEmpty ? AppTheme.success : AppTheme.warning,
          behavior: SnackBarBehavior.floating,
        ));
        
        _suffixController.clear();
        setState(() => _suffixInput = '');
        _loadAttendance(_selectedSession!);
      } else {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text(res['error'] ?? 'Failed to mark by suffix'),
          backgroundColor: AppTheme.danger,
          behavior: SnackBarBehavior.floating,
        ));
      }
    }
  }

  Future<void> _saveChanges() async {
    if (_selectedSession == null || !_hasChanges) return;
    setState(() => _saving = true);
    final user = context.read<AuthProvider>().user;
    final records = _editedStatuses.entries
        .map((e) => {'student_id': e.key, 'status': e.value})
        .toList();
    final res = await ApiService.markAttendance(
      sessionId: _selectedSession!.id,
      records: records,
      markedBy: user!.id,
    );
    if (mounted) {
      setState(() => _saving = false);
      if (res['success'] == true) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
          content: Text('Attendance updated!'),
          backgroundColor: AppTheme.success,
          behavior: SnackBarBehavior.floating,
        ));
        _loadAttendance(_selectedSession!);
      } else {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text(res['error'] ?? 'Failed to update attendance'),
          backgroundColor: AppTheme.danger,
          behavior: SnackBarBehavior.floating,
        ));
      }
    }
  }

  Future<void> _exportCsv() async {
    if (_selectedSession == null) return;
    setState(() => _exporting = true);
    try {
      final res = await ApiService.exportAttendance(_selectedSession!.id);
      if (res.statusCode == 200) {
        final dir = Directory.systemTemp;
        final file = File('${dir.path}/attendance_${_selectedSession!.id}.csv');
        await file.writeAsBytes(res.bodyBytes);
        await OpenFilex.open(file.path);
      } else {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Failed to export CSV')),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _exporting = false);
    }
  }

  Widget _buildQuickMarkSection() {
    if (!_isEditing) return const SizedBox.shrink();
    return Container(
      padding: const EdgeInsets.all(16),
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppTheme.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.numbers, size: 18, color: AppTheme.primary),
              const SizedBox(width: 8),
              const Text('Quick Mark by Suffix',
                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            'Enter the last digits of register numbers (e.g. 135, 7, 45-102)',
            style: TextStyle(fontSize: 12, color: AppTheme.textSecondary),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                flex: 3,
                child: TextField(
                  controller: _suffixController,
                  onChanged: (val) => setState(() => _suffixInput = val),
                  decoration: InputDecoration(
                    isDense: true,
                    contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                    hintText: 'e.g., 135, 42',
                    hintStyle: TextStyle(fontSize: 13, color: AppTheme.textMuted),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                flex: 2,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8),
                  decoration: BoxDecoration(
                    border: Border.all(color: AppTheme.border),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: DropdownButtonHideUnderline(
                    child: DropdownButton<String>(
                      value: _suffixMode,
                      isExpanded: true,
                      style: const TextStyle(fontSize: 13, color: Colors.black87),
                      items: const [
                        DropdownMenuItem(value: 'absent', child: Text('Absent')),
                        DropdownMenuItem(value: 'present', child: Text('Present')),
                      ],
                      onChanged: (val) {
                        if (val != null) setState(() => _suffixMode = val);
                      },
                    ),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              onPressed: _suffixLoading || _suffixInput.trim().isEmpty ? null : _handleSuffixMark,
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.primary,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 10),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              ),
              icon: _suffixLoading
                  ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : Icon(_suffixMode == 'present' ? Icons.check : Icons.close, size: 16),
              label: Text(_suffixLoading ? 'Marking...' : 'Mark $_suffixMode'),
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final fc = widget.facultyClass;
    final dateFmt = DateFormat('dd MMM yyyy');
    final isToday = DateFormat('yyyy-MM-dd').format(_selectedDate) ==
        DateFormat('yyyy-MM-dd').format(DateTime.now());

    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(fc.subjectName, style: const TextStyle(fontSize: 16)),
            Text(fc.classLabel,
                style: TextStyle(fontSize: 12, color: AppTheme.textMuted)),
          ],
        ),
        actions: [
          if (_attendance.isNotEmpty && !_isEditing) ...[
            if (_exporting)
              const Padding(
                padding: EdgeInsets.symmetric(horizontal: 16),
                child: SizedBox(
                  width: 20,
                  height: 20,
                  child: CircularProgressIndicator(strokeWidth: 2),
                ),
              )
            else
              IconButton(
                onPressed: _exportCsv,
                icon: const Icon(Icons.download_rounded, size: 20),
                tooltip: 'Export CSV',
              ),
            IconButton(
              onPressed: () => setState(() => _isEditing = true),
              icon: const Icon(Icons.edit_rounded, size: 20),
              tooltip: 'Edit Attendance',
            ),
          ],
          if (_isEditing)
            IconButton(
              onPressed: () => setState(() {
                _isEditing = false;
                _editedStatuses = Map.from(_originalStatuses);
              }),
              icon: const Icon(Icons.close, size: 22),
              tooltip: 'Cancel',
            ),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            child: CustomScrollView(
              slivers: [
                SliverToBoxAdapter(
                  child: Column(
                    children: [
                      // ── DATE PICKER BAR ──────────────────────────────
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 10),
            decoration: BoxDecoration(
              color: Colors.white,
              border: Border(bottom: BorderSide(color: AppTheme.border)),
            ),
            child: Row(
              children: [
                // Previous day
                IconButton(
                  onPressed: _goToPreviousDay,
                  icon: const Icon(Icons.chevron_left),
                  iconSize: 24,
                  color: AppTheme.primary,
                  padding: EdgeInsets.zero,
                  constraints:
                      const BoxConstraints(minWidth: 36, minHeight: 36),
                ),

                // Date button
                Expanded(
                  child: GestureDetector(
                    onTap: _pickDate,
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 12, vertical: 8),
                      decoration: BoxDecoration(
                        color: AppTheme.primary.withOpacity(0.06),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(
                            color: AppTheme.primary.withOpacity(0.15)),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.calendar_today,
                              size: 16, color: AppTheme.primary),
                          const SizedBox(width: 8),
                          Text(
                            isToday
                                ? 'Today, ${dateFmt.format(_selectedDate)}'
                                : dateFmt.format(_selectedDate),
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w600,
                              color: AppTheme.primary,
                            ),
                          ),
                          const SizedBox(width: 4),
                          Icon(Icons.arrow_drop_down,
                              color: AppTheme.primary, size: 20),
                        ],
                      ),
                    ),
                  ),
                ),

                // Next day
                IconButton(
                  onPressed: _goToNextDay,
                  icon: const Icon(Icons.chevron_right),
                  iconSize: 24,
                  color: AppTheme.primary,
                  padding: EdgeInsets.zero,
                  constraints:
                      const BoxConstraints(minWidth: 36, minHeight: 36),
                ),
              ],
            ),
          ),

          // ── EDIT MODE BANNER ──────────────────────────────
          if (_isEditing)
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              color: AppTheme.warningLight,
              child: Row(
                children: [
                  Icon(Icons.edit, size: 16, color: AppTheme.warning),
                  const SizedBox(width: 8),
                  const Expanded(
                    child: Text(
                      'Tap a student to cycle: Absent → Present → OD',
                      style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF854D0E)),
                    ),
                  ),
                ],
              ),
            ),

          // ── SESSION CHIPS ─────────────────────────────────
          if (_loadingSessions)
            const Padding(
              padding: EdgeInsets.all(16),
              child: Center(child: CircularProgressIndicator(strokeWidth: 2)),
            )
          else if (_filteredSessions.isNotEmpty)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              decoration: BoxDecoration(
                color: const Color(0xFFF8FAFC),
                border: Border(bottom: BorderSide(color: AppTheme.border)),
              ),
              child: SizedBox(
                height: 38,
                child: ListView.separated(
                  scrollDirection: Axis.horizontal,
                  itemCount: _filteredSessions.length,
                  separatorBuilder: (_, __) => const SizedBox(width: 8),
                  itemBuilder: (_, i) {
                    final s = _filteredSessions[i];
                    final selected = _selectedSession?.id == s.id;
                    return GestureDetector(
                      onTap: () => _loadAttendance(s),
                      child: AnimatedContainer(
                        duration: const Duration(milliseconds: 200),
                        padding: const EdgeInsets.symmetric(
                            horizontal: 14, vertical: 8),
                        decoration: BoxDecoration(
                          color: selected ? AppTheme.primary : Colors.white,
                          borderRadius: BorderRadius.circular(10),
                          border: selected
                              ? null
                              : Border.all(color: AppTheme.border),
                        ),
                        child: Text(
                          s.timeRange,
                          style: TextStyle(
                            fontSize: 12,
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
            )
          else if (!_loadingSessions)
            Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                children: [
                  Icon(Icons.event_busy,
                      size: 36, color: AppTheme.textMuted.withOpacity(0.4)),
                  const SizedBox(height: 6),
                  Text(
                    'No sessions on ${dateFmt.format(_selectedDate)}',
                    style:
                        TextStyle(color: AppTheme.textSecondary, fontSize: 13),
                  ),
                  const SizedBox(height: 2),
                  Text('Use arrows to navigate days',
                      style:
                          TextStyle(color: AppTheme.textMuted, fontSize: 11)),
                ],
              ),
            ),

          // ── QUICK MARK BY SUFFIX ────────────────────────
          if (_selectedSession != null && !_loadingAttendance && _attendance.isNotEmpty)
            _buildQuickMarkSection(),

          // ── ATTENDANCE SUMMARY ────────────────────────────
          if (_selectedSession != null &&
              !_loadingAttendance &&
              _attendance.isNotEmpty)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
              color: const Color(0xFFF8FAFC),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceAround,
                children: [
                  _summaryPill(
                      'Present',
                      _attendance.where((a) => a.status == 'present').length,
                      AppTheme.success),
                  _summaryPill(
                      'Absent',
                      _attendance.where((a) => a.status == 'absent').length,
                      AppTheme.danger),
                  _summaryPill(
                      'OD',
                      _attendance.where((a) => a.status == 'od').length,
                      AppTheme.info),
                  _summaryPill(
                      'Total', _attendance.length, AppTheme.textSecondary),
                ],
              ),
            ),

                    ],
                  ),
                ),

          // ── ATTENDANCE LIST ───────────────────────────────
          if (_selectedSession != null)
            if (_loadingAttendance)
              const SliverFillRemaining(hasScrollBody: false, child: ShimmerLoading(itemCount: 8))
            else if (_attendance.isEmpty)
              SliverFillRemaining(
                hasScrollBody: false,
                child: Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.people_outline,
                          size: 48,
                          color: AppTheme.textMuted.withOpacity(0.4)),
                      const SizedBox(height: 8),
                      Text('No attendance records',
                          style: TextStyle(
                              color: AppTheme.textSecondary)),
                    ],
                  ),
                ),
              )
            else
              SliverPadding(
                padding: const EdgeInsets.all(12),
                sliver: SliverList(
                  delegate: SliverChildBuilderDelegate(
                    (_, i) => _buildStudentRow(_attendance[i]),
                    childCount: _attendance.length,
                  ),
                ),
              ),
              ],
            ),
          ),

          // ── SAVE BUTTON ───────────────────────────────────
          if (_isEditing && _hasChanges)
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
              child: ElevatedButton.icon(
                onPressed: _saving ? null : _saveChanges,
                icon: _saving
                    ? const SizedBox(height: 18, width: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : const Icon(Icons.save, size: 18),
                label: Text(_saving ? 'Saving...' : 'Save Changes', style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
                style: ElevatedButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 14), backgroundColor: AppTheme.success),
              ),
            ),
        ],
      ),
    );
  }

  Widget _summaryPill(String label, int count, Color color) {
    return Column(
      children: [
        Text('$count',
            style: TextStyle(
                fontSize: 18, fontWeight: FontWeight.w800, color: color)),
        Text(label,
            style: TextStyle(
                fontSize: 11, fontWeight: FontWeight.w600, color: color)),
      ],
    );
  }

  Widget _buildStudentRow(AttendanceRecord record) {
    final status = _editedStatuses[record.studentId] ?? record.status;
    final isChanged = _isEditing && _originalStatuses[record.studentId] != status;

    return GestureDetector(
      onTap: () => _toggleStatus(record.studentId),
      child: Container(
        margin: const EdgeInsets.only(bottom: 6),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        decoration: BoxDecoration(
          color: isChanged ? AppTheme.warningLight : Colors.white,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: isChanged ? AppTheme.warning.withOpacity(0.3) : AppTheme.border),
        ),
        child: Row(
          children: [
            SizedBox(
              width: 40,
              child: Text(
                record.rollNo.length > 3
                    ? record.rollNo.substring(record.rollNo.length - 3)
                    : record.rollNo,
                style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppTheme.textMuted),
              ),
            ),
            Expanded(
              child: Text(record.studentName,
                  style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
            ),
            AttendanceBadge(status: status, small: true),
            if (_isEditing)
              Padding(
                padding: const EdgeInsets.only(left: 6),
                child: Icon(Icons.swap_vert, size: 16, color: AppTheme.textMuted),
              ),
          ],
        ),
      ),
    );
  }
}
