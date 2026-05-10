import 'package:dio/dio.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../core/constants.dart';

class ApiClient {
  static final ApiClient _instance = ApiClient._internal();
  factory ApiClient() => _instance;

  late final Dio dio;

  ApiClient._internal() {
    dio = Dio(BaseOptions(
      baseUrl: '$kApiBaseUrl$kApiPath',
      connectTimeout: const Duration(milliseconds: kConnectTimeoutMs),
      receiveTimeout: const Duration(milliseconds: kReceiveTimeoutMs),
      headers: {'Content-Type': 'application/json'},
    ));

    dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          final prefs = await SharedPreferences.getInstance();
          final token = prefs.getString(kTokenKey);
          if (token != null) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          return handler.next(options);
        },
        onError: (DioException e, handler) {
          // Surface as-is; individual callers decide how to handle 401/403/etc.
          return handler.next(e);
        },
      ),
    );
  }

  // Convenience accessors
  Future<Response<T>> get<T>(String path, {Map<String, dynamic>? params}) =>
      dio.get<T>(path, queryParameters: params);

  Future<Response<T>> post<T>(String path, {dynamic data}) =>
      dio.post<T>(path, data: data);

  Future<Response<T>> put<T>(String path, {dynamic data}) =>
      dio.put<T>(path, data: data);

  Future<Response<T>> delete<T>(String path) => dio.delete<T>(path);

  Future<Response<T>> postMultipart<T>(
    String path,
    FormData formData, {
    void Function(int, int)? onSendProgress,
  }) =>
      dio.post<T>(
        path,
        data: formData,
        options: Options(contentType: 'multipart/form-data'),
        onSendProgress: onSendProgress,
      );
}
