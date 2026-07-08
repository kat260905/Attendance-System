import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:fl_chart/fl_chart.dart';
import '../../providers/auth_provider.dart';
import '../../services/api_service.dart';
import '../../models/dashboard_data.dart';
import '../../theme/app_theme.dart';
import '../../widgets/stat_card.dart';
import '../../widgets/shimmer_loading.dart';

class FacultyDashboard extends StatefulWidget {
  const FacultyDashboard({super.key});

  @override
  State<FacultyDashboard> createState() => _FacultyDashboardState();
}

class _FacultyDashboardState extends State<FacultyDashboard> {
  FacultyDashboardSummary? _summary;
  List<WeeklyTrend> _trend = [];
  List<CourseComparison> _comparison = [];
  List<CourseAlert> _alerts = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() => _loading = true);
    final user = context.read<AuthProvider>().user;
    final fId = user?.facultyId;
    if (fId == null) return;

    final results = await Future.wait([
      ApiService.getFacultyDashboardSummary(fId),
      ApiService.getFacultyWeeklyTrend(fId),
      ApiService.getFacultyCourseComparison(fId),
      ApiService.getFacultyCourseAlerts(fId),
    ]);

    if (mounted) {
      setState(() {
        _loading = false;
        if (results[0]['success'] == true) {
          _summary = FacultyDashboardSummary.fromJson(results[0]['data']);
        }
        if (results[1]['success'] == true) {
          _trend = (results[1]['data'] as List)
              .map((e) => WeeklyTrend.fromJson(e))
              .toList();
        }
        if (results[2]['success'] == true) {
          _comparison = (results[2]['data'] as List)
              .map((e) => CourseComparison.fromJson(e))
              .toList();
        }
        if (results[3]['success'] == true) {
          _alerts = (results[3]['data'] as List)
              .map((e) => CourseAlert.fromJson(e))
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
          ShimmerCard(height: 200),
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
                  label: "TODAY'S CLASSES",
                  value: '${_summary!.todaysClasses}',
                  icon: Icons.calendar_today,
                  gradientColors: const [Color(0xFF1E3A5F), Color(0xFF2D5F8A)],
                ),
                GradientStatCard(
                  label: 'OVERALL ATT.',
                  value: '${_summary!.overallAttendance.toStringAsFixed(1)}%',
                  icon: Icons.trending_up,
                  gradientColors: const [Color(0xFF166534), Color(0xFF22C55E)],
                ),
                StatCard(
                  label: 'DEFAULTERS',
                  value: '${_summary!.totalDefaulters}',
                  icon: Icons.warning_amber_rounded,
                  color: AppTheme.danger,
                ),
                StatCard(
                  label: 'PENDING',
                  value: '${_summary!.pendingAttendance}',
                  icon: Icons.pending_actions,
                  color: AppTheme.warning,
                ),
              ],
            ),
          const SizedBox(height: 16),

          // Weekly Trend Chart
          if (_trend.isNotEmpty) ...[
            Container(
              decoration: AppTheme.cardDecoration,
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Weekly Attendance Trend',
                      style: Theme.of(context).textTheme.titleMedium),
                  const SizedBox(height: 16),
                  SizedBox(
                    height: 180,
                    child: LineChart(
                      LineChartData(
                        gridData: FlGridData(
                          drawVerticalLine: false,
                          horizontalInterval: 25,
                          getDrawingHorizontalLine: (v) => FlLine(
                            color: AppTheme.border,
                            strokeWidth: 1,
                          ),
                        ),
                        titlesData: FlTitlesData(
                          bottomTitles: AxisTitles(
                            sideTitles: SideTitles(
                              showTitles: true,
                              getTitlesWidget: (v, _) {
                                final idx = v.toInt();
                                if (idx >= _trend.length) {
                                  return const SizedBox.shrink();
                                }
                                return Text(_trend[idx].day,
                                    style: const TextStyle(fontSize: 10));
                              },
                              interval: 1,
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
                        borderData: FlBorderData(show: false),
                        minY: 0,
                        maxY: 100,
                        lineBarsData: [
                          LineChartBarData(
                            spots: List.generate(
                              _trend.length,
                              (i) => FlSpot(i.toDouble(), _trend[i].average),
                            ),
                            isCurved: true,
                            color: AppTheme.accent,
                            barWidth: 3,
                            isStrokeCapRound: true,
                            dotData: FlDotData(
                              show: true,
                              getDotPainter: (_, __, ___, ____) =>
                                  FlDotCirclePainter(
                                radius: 4,
                                color: AppTheme.accent,
                                strokeWidth: 2,
                                strokeColor: Colors.white,
                              ),
                            ),
                            belowBarData: BarAreaData(
                              show: true,
                              color: AppTheme.accent.withOpacity(0.1),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
          ],

          // Course-wise Comparison
          if (_comparison.isNotEmpty) ...[
            Container(
              decoration: AppTheme.cardDecoration,
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Course-wise Attendance',
                      style: Theme.of(context).textTheme.titleMedium),
                  const SizedBox(height: 12),
                  ..._comparison.map((c) => Padding(
                        padding: const EdgeInsets.only(bottom: 10),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Flexible(
                                  child: Text(c.subjectName,
                                      style: const TextStyle(
                                          fontSize: 13,
                                          fontWeight: FontWeight.w600)),
                                ),
                                Text(
                                  '${c.avgAttendance.toStringAsFixed(1)}%',
                                  style: TextStyle(
                                    fontSize: 13,
                                    fontWeight: FontWeight.w700,
                                    color: c.avgAttendance >= 75
                                        ? AppTheme.success
                                        : AppTheme.danger,
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 6),
                            ClipRRect(
                              borderRadius: BorderRadius.circular(4),
                              child: LinearProgressIndicator(
                                value: c.avgAttendance / 100,
                                minHeight: 8,
                                backgroundColor: AppTheme.border,
                                valueColor: AlwaysStoppedAnimation(
                                  c.avgAttendance >= 75
                                      ? AppTheme.success
                                      : c.avgAttendance >= 65
                                          ? AppTheme.warning
                                          : AppTheme.danger,
                                ),
                              ),
                            ),
                          ],
                        ),
                      )),
                ],
              ),
            ),
            const SizedBox(height: 16),
          ],

          // Alerts
          if (_alerts.isNotEmpty) ...[
            Container(
              decoration: BoxDecoration(
                color: AppTheme.dangerLight,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppTheme.danger.withOpacity(0.2)),
              ),
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(Icons.warning_rounded,
                          color: AppTheme.danger, size: 20),
                      const SizedBox(width: 8),
                      const Text('Low Attendance Alerts',
                          style: TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w700,
                            color: Color(0xFF991B1B),
                          )),
                    ],
                  ),
                  const SizedBox(height: 10),
                  ..._alerts.map((a) => Container(
                        margin: const EdgeInsets.only(bottom: 6),
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Flexible(
                              child: Text(
                                '${a.subjectName} — ${a.department ?? ''} Yr${a.year ?? ''}',
                                style: const TextStyle(
                                    fontSize: 13,
                                    fontWeight: FontWeight.w600),
                              ),
                            ),
                            Text(
                              '${a.defaulterCount} defaulters',
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                                color: AppTheme.danger,
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
