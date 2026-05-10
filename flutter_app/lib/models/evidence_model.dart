class Evidence {
  final int id;
  final int auditId;
  final int? verificationItemId;
  final String fileName;
  final String filePath; // presigned S3 URL
  final int? fileSize;
  final String? executiveNotes;
  final double? latitude;
  final double? longitude;
  final DateTime? deviceTimestamp;
  final DateTime createdAt;

  const Evidence({
    required this.id,
    required this.auditId,
    this.verificationItemId,
    required this.fileName,
    required this.filePath,
    this.fileSize,
    this.executiveNotes,
    this.latitude,
    this.longitude,
    this.deviceTimestamp,
    required this.createdAt,
  });

  factory Evidence.fromJson(Map<String, dynamic> j) => Evidence(
        id: j['id'] as int,
        auditId: j['audit_id'] as int,
        verificationItemId: j['verification_item_id'] as int?,
        fileName: j['file_name'] as String,
        filePath: j['file_path'] as String,
        fileSize: j['file_size'] as int?,
        executiveNotes: j['executive_notes'] as String?,
        latitude: (j['latitude'] as num?)?.toDouble(),
        longitude: (j['longitude'] as num?)?.toDouble(),
        deviceTimestamp: j['device_timestamp'] != null
            ? DateTime.tryParse(j['device_timestamp'] as String)
            : null,
        createdAt: DateTime.tryParse(j['created_at'] as String? ?? '') ?? DateTime.now(),
      );

  bool get hasLocation => latitude != null && longitude != null;

  String? get mapsUrl => hasLocation
      ? 'https://maps.google.com/?q=${latitude!.toStringAsFixed(6)},${longitude!.toStringAsFixed(6)}'
      : null;

  bool get isImage {
    final lower = fileName.toLowerCase();
    return lower.endsWith('.jpg') ||
        lower.endsWith('.jpeg') ||
        lower.endsWith('.png') ||
        lower.endsWith('.heic') ||
        lower.endsWith('.webp');
  }

  String get fileSizeLabel {
    if (fileSize == null) return '';
    if (fileSize! < 1024) return '${fileSize}B';
    if (fileSize! < 1024 * 1024) return '${(fileSize! / 1024).toStringAsFixed(1)}KB';
    return '${(fileSize! / (1024 * 1024)).toStringAsFixed(1)}MB';
  }
}
