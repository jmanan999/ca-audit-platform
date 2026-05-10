import 'package:firebase_auth/firebase_auth.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:dio/dio.dart';
import '../core/constants.dart';
import '../models/user_model.dart';
import 'api_client.dart';

class AuthService {
  final _firebaseAuth = FirebaseAuth.instance;
  final _api = ApiClient();

  Future<AppUser> login(String email, String password) async {
    final cred = await _firebaseAuth.signInWithEmailAndPassword(
      email: email.trim(),
      password: password,
    );
    final idToken = await cred.user!.getIdToken();

    final res = await _api.post('/auth/login', data: {'firebase_token': idToken});
    final body = res.data as Map<String, dynamic>;
    final token = body['access_token'] as String;
    final user = AppUser.fromJson(body['user'] as Map<String, dynamic>);

    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(kTokenKey, token);

    return user;
  }

  Future<AppUser> register({
    required String name,
    required String email,
    required String password,
    String? phone,
    String role = 'auditor',
  }) async {
    final cred = await _firebaseAuth.createUserWithEmailAndPassword(
      email: email.trim(),
      password: password,
    );

    await _api.post('/auth/register', data: {
      'name': name.trim(),
      'email': email.trim(),
      if (phone != null && phone.isNotEmpty) 'phone': phone.trim(),
      'role': role,
    });

    final idToken = await cred.user!.getIdToken();
    final res = await _api.post('/auth/login', data: {'firebase_token': idToken});
    final body = res.data as Map<String, dynamic>;
    final token = body['access_token'] as String;
    final user = AppUser.fromJson(body['user'] as Map<String, dynamic>);

    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(kTokenKey, token);

    return user;
  }

  Future<AppUser?> tryRestoreSession() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString(kTokenKey);
    if (token == null) return null;

    try {
      final res = await _api.get('/auth/me');
      return AppUser.fromJson(res.data as Map<String, dynamic>);
    } on DioException catch (e) {
      if (e.response?.statusCode == 401) await _clearSession();
      return null;
    }
  }

  Future<void> logout() async {
    await _firebaseAuth.signOut();
    await _clearSession();
  }

  Future<void> _clearSession() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(kTokenKey);
  }
}
