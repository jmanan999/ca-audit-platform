import 'dart:io';
import 'package:dio/dio.dart';
import '../models/evidence_model.dart';
import 'api_client.dart';

class EvidenceService {
  final _api = ApiClient();

  Future<List<Evidence>> listEvidence(int itemId) async {
    final res = await _api.get('/verification-items/$itemId/evidence');
    final items = res.data as List<dynamic>;
    return items.map((j) => Evidence.fromJson(j as Map<String, dynamic>)).toList();
  }

  Future<Evidence> uploadEvidence({
    required File file,
    required int auditId,
    required int itemId,
    String? executiveNotes,
    double? latitude,
    double? longitude,
    DateTime? deviceTimestamp,
    void Function(int sent, int total)? onProgress,
  }) async {
    final fileName = file.path.split('/').last;
    final formData = FormData.fromMap({
      'file': await MultipartFile.fromFile(
        file.path,
        filename: fileName,
      ),
      'verification_item_id': itemId.toString(),
      'document_category': 'evidence',
      if (executiveNotes != null && executiveNotes.isNotEmpty)
        'executive_notes': executiveNotes,
      if (latitude != null) 'latitude': latitude.toString(),
      if (longitude != null) 'longitude': longitude.toString(),
      if (deviceTimestamp != null)
        'device_timestamp': deviceTimestamp.toUtc().toIso8601String(),
    });

    final res = await _api.postMultipart(
      '/documents/upload?audit_id=$auditId',
      formData,
      onSendProgress: onProgress,
    );

    return Evidence.fromJson(res.data as Map<String, dynamic>);
  }
}
