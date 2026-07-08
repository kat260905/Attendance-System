class AttendanceOverall {
  final int total;
  final int present;
  final int absent;
  final int od;
  final double percentage;

  AttendanceOverall({
    required this.total,
    required this.present,
    required this.absent,
    required this.od,
    required this.percentage,
  });

  factory AttendanceOverall.fromJson(Map<String, dynamic> json) {
    return AttendanceOverall(
      total: json['total'] ?? 0,
      present: json['present'] ?? 0,
      absent: json['absent'] ?? 0,
      od: json['od'] ?? 0,
      percentage: (json['percentage'] ?? 0).toDouble(),
    );
  }
}

class SubjectAttendance {
  final int subjectId;
  final String subjectName;
  final int total;
  final int present;
  final int absent;
  final int od;
  final double percentage;

  SubjectAttendance({
    required this.subjectId,
    required this.subjectName,
    required this.total,
    required this.present,
    required this.absent,
    required this.od,
    required this.percentage,
  });

  factory SubjectAttendance.fromJson(Map<String, dynamic> json) {
    return SubjectAttendance(
      subjectId: json['subject_id'] ?? 0,
      subjectName: json['subject_name'] ?? '',
      total: json['total'] ?? 0,
      present: json['present'] ?? 0,
      absent: json['absent'] ?? 0,
      od: json['od'] ?? 0,
      percentage: (json['percentage'] ?? 0).toDouble(),
    );
  }
}

class AttendanceSummary {
  final int studentId;
  final String studentName;
  final String rollNo;
  final AttendanceOverall overall;
  final List<SubjectAttendance> bySubject;

  AttendanceSummary({
    required this.studentId,
    required this.studentName,
    required this.rollNo,
    required this.overall,
    required this.bySubject,
  });

  factory AttendanceSummary.fromJson(Map<String, dynamic> json) {
    return AttendanceSummary(
      studentId: json['student_id'] ?? 0,
      studentName: json['student_name'] ?? '',
      rollNo: json['roll_no'] ?? '',
      overall: AttendanceOverall.fromJson(json['overall'] ?? {}),
      bySubject: (json['by_subject'] as List? ?? [])
          .map((s) => SubjectAttendance.fromJson(s))
          .toList(),
    );
  }
}
