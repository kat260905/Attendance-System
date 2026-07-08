import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:fl_chart/fl_chart.dart';
import '../../providers/auth_provider.dart';
import '../../services/api_service.dart';
import '../../models/attendance_summary.dart';
import '../../theme/app_theme.dart';
import '../../widgets/circular_progress.dart';
import '../../widgets/stat_card.dart';
import '../../widgets/shimmer_loading.dart';

class StudentDashboard extends StatefulWidget {
  const StudentDashboard({super.key});

  @override
  State<StudentDashboard> createState() => _StudentDashboardState();
}

class _StudentDashboardState extends State<StudentDashboard> {
  AttendanceSummary? _summary;
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    final user = context.read<AuthProvider>().user;
    final studentId = user?.studentId ?? user?.id;
    if (studentId == null) return;

    final res = await ApiService.getStudentAttendanceSummary(studentId);
    if (mounted) {
      setState(() {
        _loading = false;
        if (res['success'] == true) {
          _summary = AttendanceSummary.fromJson(res['data']);
        } else {
          _error = res['error'] ?? 'Failed to load data';
        }
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const SingleChildScrollView(
        padding: EdgeInsets.all(16),
        child: Column(
          children: [
            ShimmerCard(height: 220),
            SizedBox(height: 16),
            ShimmerCard(height: 100),
            SizedBox(height: 16),
            ShimmerCard(height: 200),
          ],
        ),
      );
    }

    if (_error != null) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.error_outline, size: 48, color: AppTheme.danger),
            const SizedBox(height: 12),
            Text(_error!, style: TextStyle(color: AppTheme.textSecondary)),
            const SizedBox(height: 16),
            ElevatedButton.icon(
              onPressed: _loadData,
              icon: const Icon(Icons.refresh, size: 18),
              label: const Text('Retry'),
            ),
          ],
        ),
      );
    }

    final overall = _summary!.overall;
    final subjects = _summary!.bySubject;
    final criticalSubjects = subjects.where((s) => s.percentage < 75).toList();
    final borderlineSubjects =
        subjects.where((s) => s.percentage >= 75 && s.percentage < 80).toList();

    return RefreshIndicator(
      onRefresh: _loadData,
      color: AppTheme.primary,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // ── Circular Progress + Alert ──────────────────────────
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Percentage Ring
              Expanded(
                flex: 2,
                child: Container(
                  decoration: AppTheme.cardDecoration,
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    children: [
                      Text(
                        'OVERALL',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                          color: AppTheme.textMuted,
                          letterSpacing: 1.2,
                        ),
                      ),
                      const SizedBox(height: 12),
                      AnimatedCircularProgress(
                        percentage: overall.percentage,
                        size: 140,
                        strokeWidth: 10,
                        centerLabel:
                            '${overall.present + overall.od} / ${overall.total}',
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(width: 12),
              // Quick Stats
              Expanded(
                flex: 2,
                child: Column(
                  children: [
                    StatCard(
                      label: 'PRESENT',
                      value: '${overall.present}',
                      icon: Icons.check_circle_outline,
                      color: AppTheme.success,
                    ),
                    const SizedBox(height: 8),
                    StatCard(
                      label: 'ABSENT',
                      value: '${overall.absent}',
                      icon: Icons.cancel_outlined,
                      color: AppTheme.danger,
                    ),
                    const SizedBox(height: 8),
                    StatCard(
                      label: 'ON DUTY',
                      value: '${overall.od}',
                      icon: Icons.access_time,
                      color: AppTheme.info,
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),

          // ── Alert Box ─────────────────────────────────────────
          _buildAlertBox(criticalSubjects, borderlineSubjects),
          const SizedBox(height: 16),

          // ── Subject Breakdown ─────────────────────────────────
          if (subjects.isNotEmpty) ...[
            Container(
              decoration: AppTheme.cardDecoration,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Padding(
                    padding: const EdgeInsets.all(16),
                    child: Text(
                      'Subject-wise Breakdown',
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                  ),
                  const Divider(height: 1),
                  // Bar Chart
                  SizedBox(
                    height: 200,
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
                      child: BarChart(
                        BarChartData(
                          alignment: BarChartAlignment.spaceAround,
                          maxY: 100,
                          barTouchData: BarTouchData(
                            touchTooltipData: BarTouchTooltipData(
                              getTooltipItem: (group, gi, rod, ri) {
                                final s = subjects[group.x];
                                return BarTooltipItem(
                                  '${s.subjectName}\n${s.percentage}%',
                                  const TextStyle(
                                    color: Colors.white,
                                    fontSize: 12,
                                    fontWeight: FontWeight.w600,
                                  ),
                                );
                              },
                            ),
                          ),
                          titlesData: FlTitlesData(
                            bottomTitles: AxisTitles(
                              sideTitles: SideTitles(
                                showTitles: true,
                                getTitlesWidget: (value, _) {
                                  final idx = value.toInt();
                                  if (idx >= subjects.length) {
                                    return const SizedBox.shrink();
                                  }
                                  final name = subjects[idx].subjectName;
                                  return Padding(
                                    padding: const EdgeInsets.only(top: 6),
                                    child: Text(
                                      name.length > 8
                                          ? '${name.substring(0, 7)}..'
                                          : name,
                                      style: const TextStyle(fontSize: 9),
                                    ),
                                  );
                                },
                              ),
                            ),
                            leftTitles: AxisTitles(
                              sideTitles: SideTitles(
                                showTitles: true,
                                reservedSize: 30,
                                interval: 25,
                                getTitlesWidget: (value, _) => Text(
                                  '${value.toInt()}',
                                  style: const TextStyle(fontSize: 10),
                                ),
                              ),
                            ),
                            topTitles: const AxisTitles(
                                sideTitles: SideTitles(showTitles: false)),
                            rightTitles: const AxisTitles(
                                sideTitles: SideTitles(showTitles: false)),
                          ),
                          gridData: FlGridData(
                            horizontalInterval: 25,
                            drawVerticalLine: false,
                            getDrawingHorizontalLine: (value) => FlLine(
                              color: AppTheme.border,
                              strokeWidth: 1,
                            ),
                          ),
                          borderData: FlBorderData(show: false),
                          barGroups: List.generate(subjects.length, (i) {
                            final s = subjects[i];
                            return BarChartGroupData(
                              x: i,
                              barRods: [
                                BarChartRodData(
                                  toY: s.percentage,
                                  color: s.percentage >= 75
                                      ? AppTheme.success
                                      : s.percentage >= 65
                                          ? AppTheme.warning
                                          : AppTheme.danger,
                                  width: 18,
                                  borderRadius: const BorderRadius.vertical(
                                      top: Radius.circular(6)),
                                ),
                              ],
                            );
                          }),
                          extraLinesData: ExtraLinesData(
                            horizontalLines: [
                              HorizontalLine(
                                y: 75,
                                color: AppTheme.danger.withOpacity(0.5),
                                strokeWidth: 1,
                                dashArray: [6, 4],
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ),
                  const Divider(height: 1),
                  // Table
                  ...subjects.map((s) => _subjectRow(s)),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildAlertBox(
    List<SubjectAttendance> critical,
    List<SubjectAttendance> borderline,
  ) {
    if (critical.isNotEmpty) {
      return Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppTheme.dangerLight,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppTheme.danger.withOpacity(0.2)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.warning_rounded, color: AppTheme.danger, size: 22),
                const SizedBox(width: 8),
                Text(
                  'Shortage Warning',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                    color: const Color(0xFF991B1B),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),
            ...critical.map((s) {
              final totalPresent = s.present + s.od;
              final classesNeeded =
                  ((0.75 * s.total - totalPresent) / 0.25).ceil();
              return Container(
                margin: const EdgeInsets.only(bottom: 6),
                padding:
                    const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(10),
                  border:
                      Border.all(color: AppTheme.danger.withOpacity(0.15)),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Flexible(
                      child: Text(
                        '${s.subjectName} (${s.percentage}%)',
                        style: const TextStyle(
                          fontWeight: FontWeight.w600,
                          fontSize: 13,
                        ),
                      ),
                    ),
                    Text(
                      'Needs $classesNeeded more',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: AppTheme.danger,
                      ),
                    ),
                  ],
                ),
              );
            }),
          ],
        ),
      );
    } else if (borderline.isNotEmpty) {
      return Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppTheme.warningLight,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppTheme.warning.withOpacity(0.2)),
        ),
        child: Row(
          children: [
            Icon(Icons.warning_rounded, color: AppTheme.warning, size: 22),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                'Caution: ${borderline.map((s) => '${s.subjectName} (${s.percentage}%)').join(', ')} are borderline.',
                style: const TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w500,
                  color: Color(0xFF854D0E),
                ),
              ),
            ),
          ],
        ),
      );
    } else {
      return Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppTheme.successLight,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppTheme.success.withOpacity(0.2)),
        ),
        child: Row(
          children: [
            Icon(Icons.check_circle_rounded,
                color: AppTheme.success, size: 22),
            const SizedBox(width: 10),
            const Expanded(
              child: Text(
                'Great job! Your attendance is above the required threshold.',
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w500,
                  color: Color(0xFF166534),
                ),
              ),
            ),
          ],
        ),
      );
    }
  }

  Widget _subjectRow(SubjectAttendance s) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: const BoxDecoration(
        border: Border(bottom: BorderSide(color: AppTheme.border, width: 0.5)),
      ),
      child: Row(
        children: [
          Expanded(
            flex: 3,
            child: Text(
              s.subjectName,
              style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
            ),
          ),
          Expanded(
            child: Text(
              '${s.total}',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 13, color: AppTheme.textSecondary),
            ),
          ),
          Expanded(
            child: Text(
              '${s.present + s.od}',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 13, color: AppTheme.textSecondary),
            ),
          ),
          SizedBox(
            width: 60,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
              decoration: BoxDecoration(
                color: s.percentage >= 75
                    ? AppTheme.successLight
                    : s.percentage >= 65
                        ? AppTheme.warningLight
                        : AppTheme.dangerLight,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                '${s.percentage}%',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                  color: s.percentage >= 75
                      ? AppTheme.success
                      : s.percentage >= 65
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
}
