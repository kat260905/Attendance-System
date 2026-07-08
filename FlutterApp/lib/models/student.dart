class Student {
  final int id;
  final String rollNo;
  final String name;
  final String? department;
  final int? year;
  final int? classId;

  Student({
    required this.id,
    required this.rollNo,
    required this.name,
    this.department,
    this.year,
    this.classId,
  });

  factory Student.fromJson(Map<String, dynamic> json) {
    return Student(
      id: json['id'],
      rollNo: json['roll_no'] ?? '',
      name: json['name'] ?? '',
      department: json['department'],
      year: json['year'],
      classId: json['class_id'],
    );
  }
}
