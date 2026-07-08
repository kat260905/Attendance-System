class AttendanceRecord {
  final int? attendanceId;
  final int studentId;
  final String studentName;
  final String rollNo;
  final String? department;
  final String status;
  final int? markedBy;
  final String? markedAt;
  final String? reason;

  AttendanceRecord({
    this.attendanceId,
    required this.studentId,
    required this.studentName,
    required this.rollNo,
    this.department,
    required this.status,
    this.markedBy,
    this.markedAt,
    this.reason,
  });

  factory AttendanceRecord.fromJson(Map<String, dynamic> json) {
    return AttendanceRecord(
      attendanceId: json['attendance_id'],
      studentId: json['student_id'],
      studentName: json['student_name'] ?? json['name'] ?? '',
      rollNo: json['roll_no'] ?? '',
      department: json['department'],
      status: json['status'] ?? 'absent',
      markedBy: json['marked_by'],
      markedAt: json['marked_at'],
      reason: json['reason'],
    );
  }
}

class StudentReport {
  final int studentId;
  final String studentName;
  final String rollNo;
  final int total;
  final int present;
  final int absent;
  final int od;
  final double presentPercentage;

  StudentReport({
    required this.studentId,
    required this.studentName,
    required this.rollNo,
    required this.total,
    required this.present,
    required this.absent,
    required this.od,
    required this.presentPercentage,
  });

  factory StudentReport.fromJson(Map<String, dynamic> json) {
    return StudentReport(
      studentId: json['student_id'] ?? 0,
      studentName: json['student_name'] ?? '',
      rollNo: json['roll_no'] ?? '',
      total: json['total'] ?? 0,
      present: json['present'] ?? 0,
      absent: json['absent'] ?? 0,
      od: json['od'] ?? 0,
      presentPercentage: (json['present_percentage'] ?? 0).toDouble(),
    );
  }
}
