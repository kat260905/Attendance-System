import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../services/api_service.dart';
import '../../models/dashboard_data.dart';
import '../../models/attendance_record.dart';
import '../../theme/app_theme.dart';
import '../../widgets/shimmer_loading.dart';

class AttendanceReportScreen extends StatefulWidget {
  const AttendanceReportScreen({super.key});

  @override
  State<AttendanceReportScreen> createState() => _AttendanceReportScreenState();
}

class _AttendanceReportScreenState extends State<AttendanceReportScreen> {
  List<FacultyClass> _classes = [];
  FacultyClass? _selectedClass;
  List<StudentReport> _reports = [];
  bool _loadingClasses = true;
  bool _loadingReport = false;

  @override
  void initState() {
    super.initState();
    _loadClasses();
  }

  Future<void> _loadClasses() async {
    setState(() => _loadingClasses = true);
    final user = context.read<AuthProvider>().user;
    final fId = user?.facultyId;
    if (fId == null) return;

    final res = await ApiService.getFacultyClasses(fId);
    if (mounted) {
      setState(() {
        _loadingClasses = false;
        if (res['success'] == true) {
          _classes = (res['data'] as List)
              .map((e) => FacultyClass.fromJson(e))
              .toList();
        }
      });
    }
  }

  Future<void> _loadReport(FacultyClass fc) async {
    setState(() {
      _selectedClass = fc;
      _loadingReport = true;
    });

    final user = context.read<AuthProvider>().user;
    final res = await ApiService.getAttendanceReport(
      facultyId: user?.facultyId,
      classId: fc.classId,
      subjectId: fc.subjectId,
    );

    if (mounted) {
      setState(() {
        _loadingReport = false;
        if (res['success'] == true) {
          _reports = (res['data']['student_reports'] as List? ?? [])
              .map((e) => StudentReport.fromJson(e))
              .toList();
        }
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loadingClasses) {
      return const Padding(
          padding: EdgeInsets.all(16), child: ShimmerLoading(itemCount: 3));
    }

    return Column(
      children: [
        // Class Selector
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
              Text('Select Class',
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: AppTheme.textSecondary,
                  )),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: _classes
                    .map((fc) => GestureDetector(
                          onTap: () => _loadReport(fc),
                          child: AnimatedContainer(
                            duration: const Duration(milliseconds: 200),
                            padding: const EdgeInsets.symmetric(
                                horizontal: 12, vertical: 8),
                            decoration: BoxDecoration(
                              color: _selectedClass?.classId == fc.classId &&
                                      _selectedClass?.subjectId == fc.subjectId
                                  ? AppTheme.primary
                                  : AppTheme.primary.withOpacity(0.06),
                              borderRadius: BorderRadius.circular(10),
                              border: _selectedClass?.classId == fc.classId &&
                                      _selectedClass?.subjectId == fc.subjectId
                                  ? null
                                  : Border.all(color: AppTheme.border),
                            ),
                            child: Text(
                              '${fc.subjectName}\n${fc.classLabel}',
                              textAlign: TextAlign.center,
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                                color: _selectedClass?.classId == fc.classId &&
                                        _selectedClass?.subjectId ==
                                            fc.subjectId
                                    ? Colors.white
                                    : AppTheme.textPrimary,
                              ),
                            ),
                          ),
                        ))
                    .toList(),
              ),
            ],
          ),
        ),

        // Report Table
        Expanded(
          child: _selectedClass == null
              ? Center(
                  child: Text('Select a class to view report',
                      style: TextStyle(color: AppTheme.textMuted)),
                )
              : _loadingReport
                  ? const ShimmerLoading(itemCount: 8)
                  : _reports.isEmpty
                      ? Center(
                          child: Text('No attendance data',
                              style: TextStyle(color: AppTheme.textMuted)),
                        )
                      : ListView.builder(
                          padding: const EdgeInsets.all(16),
                          itemCount: _reports.length + 1,
                          itemBuilder: (_, i) {
                            if (i == 0) return _headerRow();
                            return _reportRow(_reports[i - 1]);
                          },
                        ),
        ),
      ],
    );
  }

  Widget _headerRow() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: const Color(0xFFF1F5F9),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        children: [
          const Expanded(
              flex: 3,
              child: Text('Student',
                  style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      letterSpacing: 0.5))),
          _colHeader('P', 1),
          _colHeader('A', 1),
          _colHeader('OD', 1),
          _colHeader('%', 1),
        ],
      ),
    );
  }

  Widget _colHeader(String text, int flex) {
    return Expanded(
      flex: flex,
      child: Text(
        text,
        textAlign: TextAlign.center,
        style: const TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.w700,
          letterSpacing: 0.5,
        ),
      ),
    );
  }

  Widget _reportRow(StudentReport r) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: const BoxDecoration(
        border:
            Border(bottom: BorderSide(color: AppTheme.border, width: 0.5)),
      ),
      child: Row(
        children: [
          Expanded(
            flex: 3,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(r.studentName,
                    style: const TextStyle(
                        fontSize: 13, fontWeight: FontWeight.w600)),
                Text(r.rollNo,
                    style:
                        TextStyle(fontSize: 11, color: AppTheme.textMuted)),
              ],
            ),
          ),
          _colValue('${r.present}', AppTheme.success),
          _colValue('${r.absent}', AppTheme.danger),
          _colValue('${r.od}', AppTheme.info),
          Expanded(
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
              decoration: BoxDecoration(
                color: r.presentPercentage >= 75
                    ? AppTheme.successLight
                    : r.presentPercentage >= 65
                        ? AppTheme.warningLight
                        : AppTheme.dangerLight,
                borderRadius: BorderRadius.circular(6),
              ),
              child: Text(
                '${r.presentPercentage.toStringAsFixed(0)}%',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                  color: r.presentPercentage >= 75
                      ? AppTheme.success
                      : r.presentPercentage >= 65
                          ? AppTheme.warning
                          : AppTheme.danger,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _colValue(String text, Color color) {
    return Expanded(
      child: Text(
        text,
        textAlign: TextAlign.center,
        style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: color),
      ),
    );
  }
}
