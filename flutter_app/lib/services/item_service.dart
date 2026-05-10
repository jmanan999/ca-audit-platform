import '../models/verification_item_model.dart';
import 'api_client.dart';

class ItemService {
  final _api = ApiClient();

  Future<List<VerificationItem>> listItems(
    int auditId, {
    String? status,
    int skip = 0,
    int limit = 200,
  }) async {
    final res = await _api.get(
      '/audits/$auditId/verification-items',
      params: {
        'skip': skip,
        'limit': limit,
        if (status != null) 'status': status,
      },
    );
    final items = res.data as List<dynamic>;
    return items
        .map((j) => VerificationItem.fromJson(j as Map<String, dynamic>))
        .toList();
  }
}
