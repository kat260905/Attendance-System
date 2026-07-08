class AppUser {
  final int id;
  final String email;
  final String name;
  final String role;
  final int? facultyId;
  final int? studentId;

  AppUser({
    required this.id,
    required this.email,
    required this.name,
    required this.role,
    this.facultyId,
    this.studentId,
  });

  factory AppUser.fromJson(Map<String, dynamic> json) {
    return AppUser(
      id: json['id'] is String ? int.parse(json['id']) : json['id'],
      email: json['email'] ?? '',
      name: json['name'] ?? '',
      role: json['role'] ?? '',
      facultyId: json['faculty_id'],
      studentId: json['student_id'],
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'email': email,
        'name': name,
        'role': role,
        'faculty_id': facultyId,
        'student_id': studentId,
      };

  bool get isAdmin => role == 'ADMIN';
  bool get isFaculty => role == 'FACULTY';
  bool get isStudent => role == 'STUDENT';
}
