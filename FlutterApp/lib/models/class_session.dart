class ClassSession {
  final int id;
  final int subjectId;
  final String subjectName;
  final int? semester;
  final int? facultyId;
  final String? facultyName;
  final int? classId;
  final int? year;
  final String? department;
  final String? section;
  final String date;
  final String? startTime;
  final String? endTime;
  final String? topic;

  ClassSession({
    required this.id,
    required this.subjectId,
    required this.subjectName,
    this.semester,
    this.facultyId,
    this.facultyName,
    this.classId,
    this.year,
    this.department,
    this.section,
    required this.date,
    this.startTime,
    this.endTime,
    this.topic,
  });

  factory ClassSession.fromJson(Map<String, dynamic> json) {
    return ClassSession(
      id: json['id'],
      subjectId: json['subject_id'],
      subjectName: json['subject_name'] ?? '',
      semester: json['semester'],
      facultyId: json['faculty_id'],
      facultyName: json['faculty_name'],
      classId: json['class_id'],
      year: json['year'],
      department: json['department'],
      section: json['section'],
      date: json['date'] ?? '',
      startTime: json['start_time'],
      endTime: json['end_time'],
      topic: json['topic'],
    );
  }

  String get classLabel {
    if (department != null && year != null && section != null) {
      return '$department Yr$year Sec $section';
    }
    return 'Class $classId';
  }

  String get timeRange {
    if (startTime != null && endTime != null) {
      return '${startTime!.substring(0, 5)} - ${endTime!.substring(0, 5)}';
    }
    return 'N/A';
  }
}
