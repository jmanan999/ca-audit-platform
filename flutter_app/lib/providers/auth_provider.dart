import 'package:flutter/foundation.dart';
import '../models/user_model.dart';
import '../services/auth_service.dart';

enum AuthState { loading, authenticated, unauthenticated, pendingApproval }

class AuthProvider extends ChangeNotifier {
  final _authService = AuthService();

  AppUser? _user;
  AuthState _state = AuthState.loading;
  String? _errorMessage;

  AppUser? get user => _user;
  AuthState get state => _state;
  String? get errorMessage => _errorMessage;

  bool get isLoading => _state == AuthState.loading;
  bool get isAuthenticated => _state == AuthState.authenticated;

  Future<void> tryRestoreSession() async {
    _state = AuthState.loading;
    notifyListeners();

    final user = await _authService.tryRestoreSession();
    _setUser(user);
  }

  Future<bool> login(String email, String password) async {
    _errorMessage = null;
    _state = AuthState.loading;
    notifyListeners();

    try {
      final user = await _authService.login(email, password);
      _setUser(user);
      return true;
    } catch (e) {
      _errorMessage = _friendlyError(e);
      _state = AuthState.unauthenticated;
      notifyListeners();
      return false;
    }
  }

  Future<bool> register({
    required String name,
    required String email,
    required String password,
    String? phone,
    String role = 'auditor',
  }) async {
    _errorMessage = null;
    _state = AuthState.loading;
    notifyListeners();

    try {
      final user = await _authService.register(
        name: name,
        email: email,
        password: password,
        phone: phone,
        role: role,
      );
      _setUser(user);
      return true;
    } catch (e) {
      _errorMessage = _friendlyError(e);
      _state = AuthState.unauthenticated;
      notifyListeners();
      return false;
    }
  }

  Future<void> logout() async {
    await _authService.logout();
    _user = null;
    _state = AuthState.unauthenticated;
    notifyListeners();
  }

  void clearError() {
    _errorMessage = null;
    notifyListeners();
  }

  void _setUser(AppUser? user) {
    _user = user;
    if (user == null) {
      _state = AuthState.unauthenticated;
    } else if (!user.isApproved) {
      _state = AuthState.pendingApproval;
    } else {
      _state = AuthState.authenticated;
    }
    notifyListeners();
  }

  String _friendlyError(dynamic e) {
    final msg = e.toString();
    if (msg.contains('user-not-found') ||
        msg.contains('wrong-password') ||
        msg.contains('invalid-credential') ||
        msg.contains('INVALID_LOGIN_CREDENTIALS')) {
      return 'Incorrect email or password.';
    }
    if (msg.contains('too-many-requests')) return 'Too many attempts. Try again later.';
    if (msg.contains('email-already-in-use')) return 'This email is already registered.';
    if (msg.contains('weak-password')) return 'Password must be at least 6 characters.';
    if (msg.contains('network-request-failed') || msg.contains('network')) {
      return 'Network error. Check your connection.';
    }
    if (msg.contains('SocketException') ||
        msg.contains('Connection refused') ||
        msg.contains('connection timed out') ||
        msg.contains('connection timeout') ||
        msg.contains('ECONNREFUSED') ||
        msg.contains('App Transport Security')) {
      return 'Cannot reach server. Check that your phone and server are on the same WiFi (server: 192.168.1.11:8000).';
    }
    if (msg.contains('channel-error')) {
      return 'Firebase configuration error. Please reinstall the app.';
    }
    // Strip DioException wrapper for cleaner display
    final detail = RegExp(r'"detail"\s*:\s*"([^"]+)"').firstMatch(msg)?.group(1);
    if (detail != null) return detail;
    // Show truncated raw error so we can diagnose unknown failures
    final short = msg.length > 120 ? '${msg.substring(0, 120)}…' : msg;
    return 'Login error: $short';
  }
}
