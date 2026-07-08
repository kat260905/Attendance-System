import 'package:flutter/material.dart';
import 'package:fl_chart/fl_chart.dart';
import '../../services/api_service.dart';
import '../../models/dashboard_data.dart';
import '../../theme/app_theme.dart';
import '../../widgets/stat_card.dart';
import '../../widgets/shimmer_loading.dart';

class AdminDashboard extends StatefulWidget {
  const AdminDashboard({super.key});

  @override
  State<AdminDashboard> createState() => _AdminDashboardState();
}

class _AdminDashboardState extends State<AdminDashboard> {
  AdminDashboardSummary? _summary;
  List<DepartmentAttendance> _deptAttendance = [];
  List<FacultyPerformance> _facultyPerf = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() => _loading = true);

    final results = await Future.wait([
      ApiService.getAdminDashboardSummary(),
      ApiService.getAdminDepartmentAttendance(),
      ApiService.getAdminFacultyPerformance(),
    ]);

    if (mounted) {
      setState(() {
        _loading = false;
        if (results[0]['success'] == true) {
          _summary = AdminDashboardSummary.fromJson(results[0]['data']);
        }
        if (results[1]['success'] == true) {
          _deptAttendance = (results[1]['data'] as List)
              .map((e) => DepartmentAttendance.fromJson(e))
              .toList();
        }
        if (results[2]['success'] == true) {
          _facultyPerf = (results[2]['data'] as List)
              .map((e) => FacultyPerformance.fromJson(e))
              .toList();
        }
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const SingleChildScrollView(
        padding: EdgeInsets.all(16),
        child: Column(children: [
          ShimmerCard(height: 100),
          SizedBox(height: 12),
          ShimmerCard(height: 250),
          SizedBox(height: 12),
          ShimmerCard(height: 200),
        ]),
      );
    }

    return RefreshIndicator(
      onRefresh: _loadData,
      color: AppTheme.primary,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // KPI Cards
          if (_summary != null)
            GridView.count(
              crossAxisCount: 2,
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              mainAxisSpacing: 10,
              crossAxisSpacing: 10,
              childAspectRatio: 1.5,
              children: [
                GradientStatCard(
                  label: 'TOTAL STUDENTS',
                  value: '${_summary!.totalStudents}',
                  icon: Icons.people,
                  gradientColors: const [Color(0xFF1E3A5F), Color(0xFF2D5F8A)],
                ),
                GradientStatCard(
                  label: 'TOTAL FACULTY',
                  value: '${_summary!.totalFaculty}',
                  icon: Icons.school,
                  gradientColors: const [Color(0xFF7C3AED), Color(0xFFA78BFA)],
                ),
                GradientStatCard(
                  label: 'COLLEGE AVG',
                  value: '${_summary!.collegeAvgAttendance.toStringAsFixed(1)}%',
                  icon: Icons.trending_up,
                  gradientColors: _summary!.collegeAvgAttendance >= 75
                      ? const [Color(0xFF166534), Color(0xFF22C55E)]
                      : const [Color(0xFF991B1B), Color(0xFFEF4444)],
                ),
                GradientStatCard(
                  label: 'CLASSES TODAY',
                  value: '${_summary!.classesToday}',
                  icon: Icons.calendar_today,
                  gradientColors: const [Color(0xFFB45309), Color(0xFFF59E0B)],
                ),
              ],
            ),
          const SizedBox(height: 16),

          // Department Attendance Chart
          if (_deptAttendance.isNotEmpty) ...[
            Container(
              decoration: AppTheme.cardDecoration,
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Department-wise Attendance',
                      style: Theme.of(context).textTheme.titleMedium),
                  const SizedBox(height: 16),
                  SizedBox(
                    height: 200,
                    child: BarChart(
                      BarChartData(
                        alignment: BarChartAlignment.spaceAround,
                        maxY: 100,
                        barTouchData: BarTouchData(
                          touchTooltipData: BarTouchTooltipData(
                            getTooltipItem: (group, gi, rod, ri) {
                              final d = _deptAttendance[group.x];
                              return BarTooltipItem(
                                '${d.department}\n${d.avgAttendance}%',
                                const TextStyle(
                                    color: Colors.white, fontSize: 12),
                              );
                            },
                          ),
                        ),
                        titlesData: FlTitlesData(
                          bottomTitles: AxisTitles(
                            sideTitles: SideTitles(
                              showTitles: true,
                              getTitlesWidget: (v, _) {
                                final idx = v.toInt();
                                if (idx >= _deptAttendance.length) {
                                  return const SizedBox.shrink();
                                }
                                final name = _deptAttendance[idx].department;
                                return Padding(
                                  padding: const EdgeInsets.only(top: 6),
                                  child: Text(
                                    name.length > 6
                                        ? '${name.substring(0, 5)}..'
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
                              getTitlesWidget: (v, _) => Text(
                                '${v.toInt()}',
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
                          getDrawingHorizontalLine: (v) => FlLine(
                            color: AppTheme.border,
                            strokeWidth: 1,
                          ),
                        ),
                        borderData: FlBorderData(show: false),
                        barGroups:
                            List.generate(_deptAttendance.length, (i) {
                          final d = _deptAttendance[i];
                          return BarChartGroupData(
                            x: i,
                            barRods: [
                              BarChartRodData(
                                toY: d.avgAttendance,
                                width: 20,
                                color: d.avgAttendance >= 75
                                    ? AppTheme.success
                                    : d.avgAttendance >= 65
                                        ? AppTheme.warning
                                        : AppTheme.danger,
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
                              color: AppTheme.danger.withOpacity(0.4),
                              strokeWidth: 1,
                              dashArray: [6, 4],
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
          ],

          // Faculty Performance Table
          if (_facultyPerf.isNotEmpty) ...[
            Container(
              decoration: AppTheme.cardDecoration,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Padding(
                    padding: const EdgeInsets.all(16),
                    child: Text('Faculty Performance',
                        style: Theme.of(context).textTheme.titleMedium),
                  ),
                  const Divider(height: 1),
                  // Header
                  Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 16, vertical: 10),
                    color: const Color(0xFFF8FAFC),
                    child: Row(
                      children: const [
                        Expanded(
                            flex: 3,
                            child: Text('Faculty',
                                style: TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.w700))),
                        Expanded(
                            child: Text('Classes',
                                textAlign: TextAlign.center,
                                style: TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.w700))),
                        Expanded(
                            child: Text('Att%',
                                textAlign: TextAlign.center,
                                style: TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.w700))),
                        Expanded(
                            child: Text('Missed',
                                textAlign: TextAlign.center,
                                style: TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.w700))),
                      ],
                    ),
                  ),
                  ..._facultyPerf.map((f) => Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 16, vertical: 10),
                        decoration: const BoxDecoration(
                          border: Border(
                            bottom: BorderSide(
                                color: AppTheme.border, width: 0.5),
                          ),
                        ),
                        child: Row(
                          children: [
                            Expanded(
                              flex: 3,
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(f.facultyName,
                                      style: const TextStyle(
                                          fontSize: 13,
                                          fontWeight: FontWeight.w600)),
                                  Text(f.department,
                                      style: TextStyle(
                                          fontSize: 11,
                                          color: AppTheme.textMuted)),
                                ],
                              ),
                            ),
                            Expanded(
                              child: Text('${f.classesTaken}',
                                  textAlign: TextAlign.center,
                                  style: const TextStyle(
                                      fontSize: 13,
                                      fontWeight: FontWeight.w600)),
                            ),
                            Expanded(
                              child: Text(
                                '${f.avgAttendance.toStringAsFixed(0)}%',
                                textAlign: TextAlign.center,
                                style: TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w700,
                                  color: f.avgAttendance >= 75
                                      ? AppTheme.success
                                      : AppTheme.danger,
                                ),
                              ),
                            ),
                            Expanded(
                              child: Text(
                                '${f.missedEntries}',
                                textAlign: TextAlign.center,
                                style: TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w600,
                                  color: f.missedEntries > 0
                                      ? AppTheme.danger
                                      : AppTheme.textMuted,
                                ),
                              ),
                            ),
                          ],
                        ),
                      )),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }
}
