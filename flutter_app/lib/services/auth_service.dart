import 'package:firebase_auth/firebase_auth.dart';
import 'package:dio/dio.dart';
import 'package:shared_preferences/shared_preferences.dart';

class AuthService {
  static const String _apiUrl = 'http://localhost:8000/api/v1';
  final FirebaseAuth _firebaseAuth = FirebaseAuth.instance;
  final Dio _dio = Dio();

  Stream<User?> authStateChanges() => _firebaseAuth.authStateChanges();

  Future<bool> loginWithEmail(String email, String password) async {
    try {
      // Sign in with Firebase
      final userCredential = await _firebaseAuth.signInWithEmailAndPassword(
        email: email,
        password: password,
      );

      // Get Firebase token
      final token = await userCredential.user?.getIdToken();

      // Login with backend
      final response = await _dio.post(
        '$_apiUrl/auth/login',
        data: {'firebase_token': token},
      );

      if (response.statusCode == 200) {
        // Save access token
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('access_token', response.data['access_token']);
        return true;
      }
      return false;
    } catch (e) {
      print('Login error: $e');
      return false;
    }
  }

  Future<bool> registerWithEmail(String email, String password, String name) async {
    try {
      // Create Firebase user
      final userCredential = await _firebaseAuth.createUserWithEmailAndPassword(
        email: email,
        password: password,
      );

      // Register with backend
      final response = await _dio.post(
        '$_apiUrl/auth/register',
        data: {
          'email': email,
          'name': name,
          'role': 'auditor',
        },
      );

      return response.statusCode == 200;
    } catch (e) {
      print('Register error: $e');
      return false;
    }
  }

  Future<void> logout() async {
    await _firebaseAuth.signOut();
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('access_token');
  }

  User? getCurrentUser() => _firebaseAuth.currentUser;
}
