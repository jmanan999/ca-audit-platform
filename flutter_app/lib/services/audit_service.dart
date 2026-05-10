import '../models/audit_model.dart';
import 'api_client.dart';

class AuditService {
  final _api = ApiClient();

  Future<List<Audit>> listAudits() async {
    final res = await _api.get('/audits', params: {'skip': 0, 'limit': 100});
    final items = res.data as List<dynamic>;
    return items.map((j) => Audit.fromJson(j as Map<String, dynamic>)).toList();
  }

  Future<Audit> getAudit(int id) async {
    final res = await _api.get('/audits/$id');
    return Audit.fromJson(res.data as Map<String, dynamic>);
  }
}
