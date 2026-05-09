import 'package:dio/dio.dart';
import 'package:shared_preferences/shared_preferences.dart';

class ApiService {
  static const String _baseUrl = 'http://localhost:8000/api/v1';
  
  late Dio _dio;

  ApiService() {
    _dio = Dio(BaseOptions(
      baseUrl: _baseUrl,
      connectTimeout: const Duration(seconds: 10),
      receiveTimeout: const Duration(seconds: 10),
    ));

    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          final prefs = await SharedPreferences.getInstance();
          final token = prefs.getString('access_token');
          if (token != null) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          return handler.next(options);
        },
      ),
    );
  }

  Future<List<dynamic>> getAudits({int skip = 0, int limit = 100}) async {
    try {
      final response = await _dio.get(
        '/audits',
        queryParameters: {'skip': skip, 'limit': limit},
      );
      return response.data ?? [];
    } catch (e) {
      print('Error fetching audits: $e');
      return [];
    }
  }

  Future<dynamic> getAudit(int id) async {
    try {
      final response = await _dio.get('/audits/$id');
      return response.data;
    } catch (e) {
      print('Error fetching audit: $e');
      return null;
    }
  }

  Future<List<dynamic>> getTasks({int? auditId, int skip = 0, int limit = 100}) async {
    try {
      final queryParams = {'skip': skip, 'limit': limit};
      if (auditId != null) queryParams['audit_id'] = auditId;
      
      final response = await _dio.get(
        '/tasks',
        queryParameters: queryParams,
      );
      return response.data ?? [];
    } catch (e) {
      print('Error fetching tasks: $e');
      return [];
    }
  }

  Future<List<dynamic>> getDocuments({int? auditId, int skip = 0, int limit = 100}) async {
    try {
      final queryParams = {'skip': skip, 'limit': limit};
      if (auditId != null) queryParams['audit_id'] = auditId;
      
      final response = await _dio.get(
        '/documents',
        queryParameters: queryParams,
      );
      return response.data ?? [];
    } catch (e) {
      print('Error fetching documents: $e');
      return [];
    }
  }

  Future<bool> uploadDocument(int auditId, String filePath) async {
    try {
      final formData = FormData.fromMap({
        'audit_id': auditId,
        'file': await MultipartFile.fromFile(filePath),
      });

      final response = await _dio.post('/documents/upload', data: formData);
      return response.statusCode == 200;
    } catch (e) {
      print('Error uploading document: $e');
      return false;
    }
  }
}
