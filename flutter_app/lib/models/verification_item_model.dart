class VerificationItem {
  final int id;
  final int auditId;
  final String title;
  final String? description;
  final String itemType;
  final String? referenceValue;
  final String status;
  final String? caNotes;
  final String? rejectionReason;
  final bool isAiParsed;
  final DateTime createdAt;
  final DateTime updatedAt;

  const VerificationItem({
    required this.id,
    required this.auditId,
    required this.title,
    this.description,
    required this.itemType,
    this.referenceValue,
    required this.status,
    this.caNotes,
    this.rejectionReason,
    required this.isAiParsed,
    required this.createdAt,
    required this.updatedAt,
  });

  factory VerificationItem.fromJson(Map<String, dynamic> j) => VerificationItem(
        id: j['id'] as int,
        auditId: j['audit_id'] as int,
        title: j['title'] as String,
        description: j['description'] as String?,
        itemType: j['item_type'] as String? ?? 'other',
        referenceValue: j['reference_value'] as String?,
        status: j['status'] as String? ?? 'pending',
        caNotes: j['ca_notes'] as String?,
        rejectionReason: j['rejection_reason'] as String?,
        isAiParsed: j['is_ai_parsed'] as bool? ?? false,
        createdAt: DateTime.tryParse(j['created_at'] as String? ?? '') ?? DateTime.now(),
        updatedAt: DateTime.tryParse(j['updated_at'] as String? ?? '') ?? DateTime.now(),
      );

  VerificationItem copyWith({String? status}) => VerificationItem(
        id: id,
        auditId: auditId,
        title: title,
        description: description,
        itemType: itemType,
        referenceValue: referenceValue,
        status: status ?? this.status,
        caNotes: caNotes,
        rejectionReason: rejectionReason,
        isAiParsed: isAiParsed,
        createdAt: createdAt,
        updatedAt: updatedAt,
      );

  String get itemTypeLabel {
    switch (itemType) {
      case 'vehicle':
        return 'Vehicle';
      case 'property':
        return 'Property';
      case 'equipment':
        return 'Equipment';
      case 'inventory':
        return 'Inventory';
      case 'bank_account':
        return 'Bank Account';
      case 'financial_record':
        return 'Financial Record';
      default:
        return 'Other';
    }
  }

  String get statusLabel {
    switch (status) {
      case 'pending':
        return 'Pending';
      case 'evidence_submitted':
        return 'Evidence Submitted';
      case 'verified':
        return 'Verified';
      case 'rejected':
        return 'Rejected';
      default:
        return status;
    }
  }

  bool get isPending => status == 'pending';
  bool get isEvidenceSubmitted => status == 'evidence_submitted';
  bool get isVerified => status == 'verified';
  bool get isRejected => status == 'rejected';
  bool get needsEvidence => isPending;
  bool get isReviewed => isVerified || isRejected;
}
