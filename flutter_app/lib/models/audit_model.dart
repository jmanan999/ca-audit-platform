class Audit {
  final int id;
  final int clientId;
  final String? clientName;
  final String auditType;
  final String status;
  final String riskLevel;
  final String? scope;
  final String? description;
  final DateTime? startDate;
  final DateTime deadline;
  final DateTime? completionDate;

  // Populated separately from the items API
  int totalItems;
  int verifiedItems;
  int pendingItems;
  int evidenceItems;
  int rejectedItems;

  Audit({
    required this.id,
    required this.clientId,
    this.clientName,
    required this.auditType,
    required this.status,
    this.riskLevel = 'medium',
    this.scope,
    this.description,
    this.startDate,
    required this.deadline,
    this.completionDate,
    this.totalItems = 0,
    this.verifiedItems = 0,
    this.pendingItems = 0,
    this.evidenceItems = 0,
    this.rejectedItems = 0,
  });

  factory Audit.fromJson(Map<String, dynamic> j) => Audit(
        id: j['id'] as int,
        clientId: j['client_id'] as int,
        clientName: j['client_name'] as String?,
        auditType: j['audit_type'] as String,
        status: j['status'] as String? ?? 'planned',
        riskLevel: j['risk_level'] as String? ?? 'medium',
        scope: j['scope'] as String?,
        description: j['description'] as String?,
        startDate: j['start_date'] != null ? DateTime.tryParse(j['start_date'] as String) : null,
        deadline: DateTime.tryParse(j['deadline'] as String? ?? '') ?? DateTime.now(),
        completionDate: j['completion_date'] != null ? DateTime.tryParse(j['completion_date'] as String) : null,
      );

  double get progress => totalItems > 0 ? verifiedItems / totalItems : 0;

  String get statusLabel {
    switch (status) {
      case 'planned':
        return 'Planned';
      case 'in_progress':
        return 'In Progress';
      case 'under_review':
        return 'Under Review';
      case 'completed':
        return 'Completed';
      case 'on_hold':
        return 'On Hold';
      default:
        return status;
    }
  }

  String get auditTypeLabel {
    return auditType
        .split('_')
        .map((w) => w.isEmpty ? '' : '${w[0].toUpperCase()}${w.substring(1)}')
        .join(' ');
  }

  bool get isActive => status == 'planned' || status == 'in_progress' || status == 'under_review';

  bool get isOverdue => deadline.isBefore(DateTime.now()) && status != 'completed';
}
