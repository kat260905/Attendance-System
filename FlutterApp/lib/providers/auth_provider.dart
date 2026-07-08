import 'package:flutter/material.dart';
import '../models/user.dart';
import '../services/api_service.dart';

class AuthProvider extends ChangeNotifier {
  AppUser? _user;
  bool _isLoading = true;
  String? _error;

  AppUser? get user => _user;
  bool get isLoading => _isLoading;
  String? get error => _error;
  bool get isAuthenticated => _user != null;
  bool get isAdmin => _user?.isAdmin ?? false;
  bool get isFaculty => _user?.isFaculty ?? false;
  bool get isStudent => _user?.isStudent ?? false;

  AuthProvider() {
    _checkAuthStatus();
  }

  Future<void> _checkAuthStatus() async {
    _isLoading = true;
    notifyListeners();

    try {
      await ApiService.loadTokens();
      if (ApiService.hasToken) {
        final res = await ApiService.getCurrentUser();
        if (res['success'] == true) {
          _user = AppUser.fromJson(res['data']);
        } else {
          await ApiService.clearTokens();
        }
      }
    } catch (e) {
      debugPrint('Auth check failed: $e');
    }

    _isLoading = false;
    notifyListeners();
  }

  Future<bool> login(String email, String password, String role) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final res = await ApiService.login(email, password, role);
      if (res['success'] == true) {
        _user = AppUser.fromJson(res['data']['user']);
        _isLoading = false;
        notifyListeners();
        return true;
      } else {
        _error = res['error'] ?? 'Login failed';
        _isLoading = false;
        notifyListeners();
        return false;
      }
    } catch (e) {
      _error = 'Network error. Please check your connection.';
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  Future<void> logout() async {
    _user = null;
    _error = null;
    await ApiService.clearTokens();
    notifyListeners();
  }

  void clearError() {
    _error = null;
    notifyListeners();
  }
}
