class AppUser {
  final int id;
  final String firebaseUid;
  final String email;
  final String name;
  final String? phone;
  final String role;
  final bool isActive;
  final bool isApproved;
  final DateTime createdAt;

  const AppUser({
    required this.id,
    required this.firebaseUid,
    required this.email,
    required this.name,
    this.phone,
    required this.role,
    required this.isActive,
    required this.isApproved,
    required this.createdAt,
  });

  factory AppUser.fromJson(Map<String, dynamic> j) => AppUser(
        id: j['id'] as int,
        firebaseUid: j['firebase_uid'] as String? ?? '',
        email: j['email'] as String,
        name: j['name'] as String,
        phone: j['phone'] as String?,
        role: j['role'] as String,
        isActive: j['is_active'] as bool? ?? true,
        isApproved: j['is_approved'] as bool? ?? false,
        createdAt: DateTime.tryParse(j['created_at'] as String? ?? '') ?? DateTime.now(),
      );

  bool get isCA => role == 'admin' || role == 'ca_partner';
  bool get isExecutive => role == 'auditor' || role == 'article_trainee';

  String get roleLabel {
    switch (role) {
      case 'admin':
        return 'Admin';
      case 'ca_partner':
        return 'CA Partner';
      case 'auditor':
        return 'Field Executive';
      case 'article_trainee':
        return 'Article Trainee';
      default:
        return role;
    }
  }

  String get initials {
    final parts = name.trim().split(' ');
    if (parts.length >= 2) return '${parts[0][0]}${parts[1][0]}'.toUpperCase();
    return name.isNotEmpty ? name[0].toUpperCase() : '?';
  }
}
