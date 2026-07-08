class FacultyDashboardSummary {
  final int todaysClasses;
  final double overallAttendance;
  final int totalDefaulters;
  final int pendingAttendance;

  FacultyDashboardSummary({
    required this.todaysClasses,
    required this.overallAttendance,
    required this.totalDefaulters,
    required this.pendingAttendance,
  });

  factory FacultyDashboardSummary.fromJson(Map<String, dynamic> json) {
    return FacultyDashboardSummary(
      todaysClasses: json['todays_classes'] ?? 0,
      overallAttendance: (json['overall_attendance'] ?? 0).toDouble(),
      totalDefaulters: json['total_defaulters'] ?? 0,
      pendingAttendance: json['pending_attendance'] ?? 0,
    );
  }
}

class WeeklyTrend {
  final String day;
  final double average;

  WeeklyTrend({required this.day, required this.average});

  factory WeeklyTrend.fromJson(Map<String, dynamic> json) {
    return WeeklyTrend(
      day: json['day'] ?? '',
      average: (json['average'] ?? 0).toDouble(),
    );
  }
}

class CourseComparison {
  final int subjectId;
  final String subjectName;
  final double avgAttendance;
  final int presentCount;
  final int totalSessions;

  CourseComparison({
    required this.subjectId,
    required this.subjectName,
    required this.avgAttendance,
    required this.presentCount,
    required this.totalSessions,
  });

  factory CourseComparison.fromJson(Map<String, dynamic> json) {
    return CourseComparison(
      subjectId: json['subject_id'] ?? 0,
      subjectName: json['subject_name'] ?? '',
      avgAttendance: (json['avg_attendance'] ?? 0).toDouble(),
      presentCount: json['present_count'] ?? 0,
      totalSessions: json['total_sessions'] ?? 0,
    );
  }
}

class CourseAlert {
  final int classId;
  final int subjectId;
  final String subjectName;
  final String? department;
  final int? year;
  final String? section;
  final int defaulterCount;

  CourseAlert({
    required this.classId,
    required this.subjectId,
    required this.subjectName,
    this.department,
    this.year,
    this.section,
    required this.defaulterCount,
  });

  factory CourseAlert.fromJson(Map<String, dynamic> json) {
    return CourseAlert(
      classId: json['class_id'] ?? 0,
      subjectId: json['subject_id'] ?? 0,
      subjectName: json['subject_name'] ?? '',
      department: json['department'],
      year: json['year'],
      section: json['section'],
      defaulterCount: json['defaulter_count'] ?? 0,
    );
  }
}

class FacultyClass {
  final int classId;
  final int subjectId;
  final String? department;
  final int? year;
  final String? section;
  final String subjectName;

  FacultyClass({
    required this.classId,
    required this.subjectId,
    this.department,
    this.year,
    this.section,
    required this.subjectName,
  });

  factory FacultyClass.fromJson(Map<String, dynamic> json) {
    return FacultyClass(
      classId: json['class_id'],
      subjectId: json['subject_id'],
      department: json['department'],
      year: json['year'],
      section: json['section'],
      subjectName: json['subject_name'] ?? '',
    );
  }

  String get classLabel {
    if (department != null && year != null && section != null) {
      return '$department Yr$year Sec $section';
    }
    return 'Class $classId';
  }
}

// Admin Dashboard Models
class AdminDashboardSummary {
  final int totalStudents;
  final int totalFaculty;
  final double collegeAvgAttendance;
  final int classesToday;

  AdminDashboardSummary({
    required this.totalStudents,
    required this.totalFaculty,
    required this.collegeAvgAttendance,
    required this.classesToday,
  });

  factory AdminDashboardSummary.fromJson(Map<String, dynamic> json) {
    return AdminDashboardSummary(
      totalStudents: json['total_students'] ?? 0,
      totalFaculty: json['total_faculty'] ?? 0,
      collegeAvgAttendance:
          (json['college_avg_attendance'] ?? 0).toDouble(),
      classesToday: json['classes_today'] ?? 0,
    );
  }
}

class DepartmentAttendance {
  final String department;
  final double avgAttendance;
  final int totalStudents;
  final int totalRecords;

  DepartmentAttendance({
    required this.department,
    required this.avgAttendance,
    required this.totalStudents,
    required this.totalRecords,
  });

  factory DepartmentAttendance.fromJson(Map<String, dynamic> json) {
    return DepartmentAttendance(
      department: json['department'] ?? '',
      avgAttendance: (json['avg_attendance'] ?? 0).toDouble(),
      totalStudents: json['total_students'] ?? 0,
      totalRecords: json['total_records'] ?? 0,
    );
  }
}

class FacultyPerformance {
  final int facultyId;
  final String facultyName;
  final String department;
  final int classesTaken;
  final int totalAssigned;
  final double avgAttendance;
  final int missedEntries;

  FacultyPerformance({
    required this.facultyId,
    required this.facultyName,
    required this.department,
    required this.classesTaken,
    required this.totalAssigned,
    required this.avgAttendance,
    required this.missedEntries,
  });

  factory FacultyPerformance.fromJson(Map<String, dynamic> json) {
    return FacultyPerformance(
      facultyId: json['faculty_id'] ?? 0,
      facultyName: json['faculty_name'] ?? '',
      department: json['department'] ?? 'N/A',
      classesTaken: json['classes_taken'] ?? 0,
      totalAssigned: json['total_assigned'] ?? 0,
      avgAttendance: (json['avg_attendance'] ?? 0).toDouble(),
      missedEntries: json['missed_entries'] ?? 0,
    );
  }
}
