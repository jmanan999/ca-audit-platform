import 'package:flutter/material.dart';
import '../core/theme.dart';

class StatusBadge extends StatelessWidget {
  final String status;
  final double fontSize;

  const StatusBadge(this.status, {super.key, this.fontSize = 11});

  @override
  Widget build(BuildContext context) {
    final (label, fg, bg) = _resolve(status);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(20)),
      child: Text(label,
          style: TextStyle(
              fontSize: fontSize, fontWeight: FontWeight.w600, color: fg)),
    );
  }

  static (String, Color, Color) _resolve(String status) {
    switch (status) {
      case 'pending':
        return ('Pending', AppColors.pendingFg, AppColors.pendingBg);
      case 'evidence_submitted':
        return ('Evidence Submitted', AppColors.evidenceFg, AppColors.evidenceBg);
      case 'verified':
        return ('Verified ✓', AppColors.verifiedFg, AppColors.verifiedBg);
      case 'rejected':
        return ('Rejected', AppColors.rejectedFg, AppColors.rejectedBg);
      case 'planned':
        return ('Planned', AppColors.pendingFg, AppColors.pendingBg);
      case 'in_progress':
        return ('In Progress', AppColors.evidenceFg, AppColors.evidenceBg);
      case 'under_review':
        return ('Under Review', const Color(0xFF7C3AED), const Color(0xFFEDE9FE));
      case 'completed':
        return ('Completed', AppColors.verifiedFg, AppColors.verifiedBg);
      case 'on_hold':
        return ('On Hold', AppColors.textSecondary, AppColors.border);
      default:
        return (status, AppColors.textSecondary, AppColors.border);
    }
  }
}

class ItemTypeBadge extends StatelessWidget {
  final String itemType;

  const ItemTypeBadge(this.itemType, {super.key});

  @override
  Widget build(BuildContext context) {
    final (label, fg, bg) = _resolve(itemType);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
      decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(6)),
      child: Text(label,
          style: TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: fg)),
    );
  }

  static (String, Color, Color) _resolve(String type) {
    switch (type) {
      case 'vehicle':
        return ('Vehicle', AppColors.vehicleFg, AppColors.vehicleBg);
      case 'property':
        return ('Property', AppColors.propertyFg, AppColors.propertyBg);
      case 'equipment':
        return ('Equipment', AppColors.equipmentFg, AppColors.equipmentBg);
      case 'inventory':
        return ('Inventory', AppColors.verifiedFg, AppColors.verifiedBg);
      case 'bank_account':
        return ('Bank Account', AppColors.evidenceFg, AppColors.evidenceBg);
      case 'financial_record':
        return ('Financial', const Color(0xFF7C3AED), const Color(0xFFEDE9FE));
      default:
        return ('Other', AppColors.textSecondary, AppColors.border);
    }
  }
}
