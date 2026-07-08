class ODRequest {
  final int id;
  final int studentId;
  final String? studentName;
  final String? rollNo;
  final String? date;
  final String fromDate;
  final String toDate;
  final String reason;
  final String? supportingDocument;
  final String status;
  final String? createdAt;
  final int? reviewedBy;
  final String? reviewedAt;
  final String? adminNotes;
  final int? classId;
  final String? classInfo;

  ODRequest({
    required this.id,
    required this.studentId,
    this.studentName,
    this.rollNo,
    this.date,
    required this.fromDate,
    required this.toDate,
    required this.reason,
    this.supportingDocument,
    required this.status,
    this.createdAt,
    this.reviewedBy,
    this.reviewedAt,
    this.adminNotes,
    this.classId,
    this.classInfo,
  });

  factory ODRequest.fromJson(Map<String, dynamic> json) {
    return ODRequest(
      id: json['id'],
      studentId: json['student_id'],
      studentName: json['student_name'],
      rollNo: json['roll_no'],
      date: json['date'],
      fromDate: json['from_date'] ?? json['date'] ?? '',
      toDate: json['to_date'] ?? json['date'] ?? '',
      reason: json['reason'] ?? '',
      supportingDocument: json['supporting_document'],
      status: json['status'] ?? 'pending',
      createdAt: json['created_at'] ?? json['requested_at'],
      reviewedBy: json['reviewed_by'],
      reviewedAt: json['reviewed_at'],
      adminNotes: json['admin_notes'],
      classId: json['class_id'],
      classInfo: json['class_info'],
    );
  }
}

class PendingOD {
  final int id;
  final int studentId;
  final String? studentName;
  final int classId;
  final int? sessionId;
  final String date;
  final String? reason;
  final String? supportingDocument;
  final int? approvedBy;
  final String? approvedAt;
  final int? studentRequestId;

  PendingOD({
    required this.id,
    required this.studentId,
    this.studentName,
    required this.classId,
    this.sessionId,
    required this.date,
    this.reason,
    this.supportingDocument,
    this.approvedBy,
    this.approvedAt,
    this.studentRequestId,
  });

  factory PendingOD.fromJson(Map<String, dynamic> json) {
    return PendingOD(
      id: json['id'],
      studentId: json['student_id'],
      studentName: json['student_name'],
      classId: json['class_id'],
      sessionId: json['session_id'],
      date: json['date'] ?? '',
      reason: json['reason'],
      supportingDocument: json['supporting_document'],
      approvedBy: json['approved_by'],
      approvedAt: json['approved_at'],
      studentRequestId: json['student_request_id'],
    );
  }
}
