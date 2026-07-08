import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class ApiService {
  // Change this to your Flask server's address
  // Android emulator → host: 10.0.2.2
  // Physical device → your actual IP
  static const String baseUrl = 'http://10.234.226.239:5000/api';

  static final FlutterSecureStorage _storage = const FlutterSecureStorage();
  static String? _accessToken;
  static String? _refreshToken;

  // ── Token Management ──────────────────────────────────────────────

  static Future<void> setTokens(String access, String refresh) async {
    _accessToken = access;
    _refreshToken = refresh;
    await _storage.write(key: 'access_token', value: access);
    await _storage.write(key: 'refresh_token', value: refresh);
  }

  static Future<void> loadTokens() async {
    _accessToken = await _storage.read(key: 'access_token');
    _refreshToken = await _storage.read(key: 'refresh_token');
  }

  static Future<void> clearTokens() async {
    _accessToken = null;
    _refreshToken = null;
    await _storage.deleteAll();
  }

  static bool get hasToken => _accessToken != null;

  // ── HTTP Helpers ──────────────────────────────────────────────────

  static Map<String, String> _headers({bool withAuth = true}) {
    final headers = <String, String>{
      'Content-Type': 'application/json',
    };
    if (withAuth && _accessToken != null) {
      headers['Authorization'] = 'Bearer $_accessToken';
    }
    return headers;
  }

  static Future<http.Response> _handleResponse(http.Response response) async {
    if (response.statusCode == 401 && _refreshToken != null) {
      // Attempt token refresh
      final refreshRes = await http.post(
        Uri.parse('$baseUrl/auth/refresh'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $_refreshToken',
        },
      );
      if (refreshRes.statusCode == 200) {
        final data = jsonDecode(refreshRes.body);
        final newToken = data['access_token'];
        if (newToken != null) {
          await _storage.write(key: 'access_token', value: newToken);
          _accessToken = newToken;
          // Retry the original request isn't easily done here, so
          // we just return the 401 and let the caller handle it.
        }
      }
    }
    return response;
  }

  // ── Core HTTP Methods ─────────────────────────────────────────────

  static Future<Map<String, dynamic>> get(String endpoint,
      {Map<String, String>? queryParams}) async {
    var uri = Uri.parse('$baseUrl$endpoint');
    if (queryParams != null && queryParams.isNotEmpty) {
      uri = uri.replace(queryParameters: queryParams);
    }
    final response = await http.get(uri, headers: _headers())
        .timeout(const Duration(seconds: 15));
    final handled = await _handleResponse(response);

    if (handled.statusCode >= 200 && handled.statusCode < 300) {
      return {'success': true, 'data': jsonDecode(handled.body)};
    }
    final errorBody = _tryDecodeError(handled.body);
    return {'success': false, 'error': errorBody, 'statusCode': handled.statusCode};
  }

  static Future<Map<String, dynamic>> post(String endpoint,
      {Map<String, dynamic>? body}) async {
    final response = await http.post(
      Uri.parse('$baseUrl$endpoint'),
      headers: _headers(),
      body: body != null ? jsonEncode(body) : null,
    ).timeout(const Duration(seconds: 15));
    final handled = await _handleResponse(response);

    if (handled.statusCode >= 200 && handled.statusCode < 300) {
      return {'success': true, 'data': jsonDecode(handled.body)};
    }
    final errorBody = _tryDecodeError(handled.body);
    return {'success': false, 'error': errorBody, 'statusCode': handled.statusCode};
  }

  static Future<Map<String, dynamic>> put(String endpoint,
      {Map<String, dynamic>? body}) async {
    final response = await http.put(
      Uri.parse('$baseUrl$endpoint'),
      headers: _headers(),
      body: body != null ? jsonEncode(body) : null,
    ).timeout(const Duration(seconds: 15));
    final handled = await _handleResponse(response);

    if (handled.statusCode >= 200 && handled.statusCode < 300) {
      return {'success': true, 'data': jsonDecode(handled.body)};
    }
    final errorBody = _tryDecodeError(handled.body);
    return {'success': false, 'error': errorBody, 'statusCode': handled.statusCode};
  }

  static Future<Map<String, dynamic>> postMultipart(
    String endpoint, {
    required Map<String, String> fields,
    File? file,
    String fileField = 'supporting_document',
  }) async {
    final uri = Uri.parse('$baseUrl$endpoint');
    final request = http.MultipartRequest('POST', uri);
    if (_accessToken != null) {
      request.headers['Authorization'] = 'Bearer $_accessToken';
    }
    request.fields.addAll(fields);
    if (file != null) {
      request.files.add(await http.MultipartFile.fromPath(fileField, file.path));
    }
    final streamed = await request.send();
    final response = await http.Response.fromStream(streamed);

    if (response.statusCode >= 200 && response.statusCode < 300) {
      return {'success': true, 'data': jsonDecode(response.body)};
    }
    final errorBody = _tryDecodeError(response.body);
    return {'success': false, 'error': errorBody, 'statusCode': response.statusCode};
  }

  static String _tryDecodeError(String body) {
    try {
      final decoded = jsonDecode(body);
      return decoded['error'] ?? decoded['message'] ?? body;
    } catch (_) {
      return body;
    }
  }

  // ── Auth Endpoints ────────────────────────────────────────────────

  static Future<Map<String, dynamic>> login(
      String email, String password, String role) async {
    final response = await http.post(
      Uri.parse('$baseUrl/auth/login'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'email': email, 'password': password, 'role': role}),
    );
    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      await setTokens(data['access_token'], data['refresh_token']);
      return {'success': true, 'data': data};
    }
    final errorBody = _tryDecodeError(response.body);
    return {'success': false, 'error': errorBody};
  }

  static Future<Map<String, dynamic>> getCurrentUser() async {
    return get('/auth/me');
  }

  // ── Student Endpoints ─────────────────────────────────────────────

  static Future<Map<String, dynamic>> getStudentAttendanceSummary(
      int studentId) async {
    return get('/student/attendance/summary',
        queryParams: {'student_id': '$studentId'});
  }

  static Future<Map<String, dynamic>> getStudentODRequests(
      int studentId) async {
    return get('/student/od/my-requests',
        queryParams: {'student_id': '$studentId'});
  }

  static Future<Map<String, dynamic>> submitODRequest({
    required int studentId,
    required String fromDate,
    required String toDate,
    required String reason,
    File? document,
  }) async {
    return postMultipart(
      '/student/od/submit',
      fields: {
        'student_id': '$studentId',
        'from_date': fromDate,
        'to_date': toDate,
        'reason': reason,
      },
      file: document,
    );
  }

  static Future<Map<String, dynamic>> cancelODRequest(
      int requestId, int studentId) async {
    return put('/student/od/cancel/$requestId',
        body: {'student_id': studentId});
  }

  // ── Faculty Endpoints ─────────────────────────────────────────────

  static Future<Map<String, dynamic>> getFacultyClasses(int facultyId) async {
    return get('/faculty/$facultyId/classes');
  }

  static Future<Map<String, dynamic>> getFacultySessions(int facultyId,
      {String mode = 'week'}) async {
    return get('/class-sessions/faculty/$facultyId',
        queryParams: {'mode': mode});
  }

  static Future<Map<String, dynamic>> getSessionsByClass(int classId,
      {int? facultyId}) async {
    final params = <String, String>{};
    if (facultyId != null) params['faculty_id'] = '$facultyId';
    return get('/class-sessions/class/$classId', queryParams: params);
  }

  static Future<Map<String, dynamic>> getSessionStudents(
      int sessionId) async {
    return get('/sessions/$sessionId/students');
  }

  static Future<Map<String, dynamic>> getSessionAttendance(
      int sessionId) async {
    return get('/attendance/session/$sessionId');
  }

  static Future<Map<String, dynamic>> markAttendance({
    required int sessionId,
    required List<Map<String, dynamic>> records,
    required int markedBy,
  }) async {
    return post('/attendance/mark', body: {
      'session_id': sessionId,
      'records': records,
      'marked_by': markedBy,
    });
  }

  static Future<http.Response> exportAttendance(int sessionId) async {
    final token = await _storage.read(key: 'access_token');
    final uri = Uri.parse('$baseUrl/attendance/export?session_id=$sessionId');
    final response = await http.get(
      uri,
      headers: {
        'Authorization': 'Bearer $token',
      },
    );
    return response;
  }

  static Future<Map<String, dynamic>> markBySuffix({
    required int sessionId,
    required String suffixes,
    required String status,
    required int markedBy,
  }) async {
    return post('/attendance/mark-by-suffix', body: {
      'session_id': sessionId,
      'suffixes': suffixes,
      'status': status,
      'marked_by': markedBy,
    });
  }

  static Future<Map<String, dynamic>> getPendingOD(int facultyId) async {
    return get('/od/pending', queryParams: {'faculty_id': '$facultyId'});
  }

  static Future<Map<String, dynamic>> applyOD(
      int odId, int facultyId) async {
    return put('/od/apply/$odId', body: {'faculty_id': facultyId});
  }

  static Future<Map<String, dynamic>> getAttendanceReport({
    int? studentId,
    int? facultyId,
    int? classId,
    int? subjectId,
    String? fromDate,
    String? toDate,
  }) async {
    final params = <String, String>{};
    if (studentId != null) params['student_id'] = '$studentId';
    if (facultyId != null) params['faculty_id'] = '$facultyId';
    if (classId != null) params['class_id'] = '$classId';
    if (subjectId != null) params['subject_id'] = '$subjectId';
    if (fromDate != null) params['from'] = fromDate;
    if (toDate != null) params['to'] = toDate;
    return get('/attendance/report', queryParams: params);
  }

  // Faculty Dashboard
  static Future<Map<String, dynamic>> getFacultyDashboardSummary(
      int facultyId) async {
    return get('/faculty/$facultyId/dashboard/summary');
  }

  static Future<Map<String, dynamic>> getFacultyCourseAlerts(
      int facultyId) async {
    return get('/faculty/$facultyId/dashboard/alerts');
  }

  static Future<Map<String, dynamic>> getFacultyWeeklyTrend(
      int facultyId) async {
    return get('/faculty/$facultyId/dashboard/weekly-trend');
  }

  static Future<Map<String, dynamic>> getFacultyCourseComparison(
      int facultyId) async {
    return get('/faculty/$facultyId/dashboard/course-comparison');
  }

  // ── Admin Endpoints ───────────────────────────────────────────────

  static Future<Map<String, dynamic>> getAdminDashboardSummary() async {
    return get('/admin/dashboard/summary');
  }

  static Future<Map<String, dynamic>> getAdminDepartmentAttendance() async {
    return get('/admin/dashboard/department-attendance');
  }

  static Future<Map<String, dynamic>> getAdminYearWiseTrend() async {
    return get('/admin/dashboard/year-wise-trend');
  }

  static Future<Map<String, dynamic>> getAdminFacultyPerformance() async {
    return get('/admin/dashboard/faculty-performance');
  }

  static Future<Map<String, dynamic>> getAdminAlerts() async {
    return get('/admin/dashboard/alerts');
  }

  static Future<Map<String, dynamic>> getAdminPendingODRequests() async {
    return get('/admin/od/pending-requests');
  }

  static Future<Map<String, dynamic>> adminApproveOD(
      int requestId, int approvedBy, {String? remarks}) async {
    return post('/admin/od/approve-request/$requestId', body: {
      'approved_by': approvedBy,
      if (remarks != null) 'remarks': remarks,
    });
  }

  static Future<Map<String, dynamic>> adminRejectOD(
      int requestId, int rejectedBy, {String? remarks}) async {
    return post('/admin/od/reject-request/$requestId', body: {
      'rejected_by': rejectedBy,
      if (remarks != null) 'remarks': remarks,
    });
  }

  /// Returns the full URL for downloading an OD document
  static String getDocumentUrl(int requestId) {
    return '$baseUrl/student/od/document/$requestId';
  }

  /// Downloads an OD document as bytes
  static Future<http.Response?> downloadDocument(int requestId) async {
    try {
      final response = await http.get(
        Uri.parse(getDocumentUrl(requestId)),
        headers: _headers(),
      );
      if (response.statusCode == 200) return response;
      return null;
    } catch (_) {
      return null;
    }
  }
}
