import 'package:flutter/material.dart';
import '../core/theme.dart';
import '../models/verification_item_model.dart';
import 'status_badge.dart';

class ItemCard extends StatelessWidget {
  final VerificationItem item;
  final VoidCallback onTap;

  const ItemCard({super.key, required this.item, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.only(bottom: 10),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: _borderColor()),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.03),
              blurRadius: 6,
              offset: const Offset(0, 1),
            ),
          ],
        ),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  ItemTypeBadge(item.itemType),
                  const SizedBox(width: 8),
                  if (item.isAiParsed)
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: const Color(0xFFFEF3C7),
                        borderRadius: BorderRadius.circular(6),
                        border: Border.all(color: const Color(0xFFFDE68A)),
                      ),
                      child: const Text(
                        'AI parsed',
                        style: TextStyle(
                          fontSize: 9,
                          color: Color(0xFF92400E),
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  const Spacer(),
                  StatusBadge(item.status),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                item.title,
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: AppColors.textPrimary,
                ),
              ),
              if (item.referenceValue != null && item.referenceValue!.isNotEmpty) ...[
                const SizedBox(height: 4),
                Text(
                  'Client claims: ${item.referenceValue}',
                  style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
              if (item.description != null && item.description!.isNotEmpty) ...[
                const SizedBox(height: 4),
                Text(
                  item.description!,
                  style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
              if (item.isRejected && item.rejectionReason != null) ...[
                const SizedBox(height: 8),
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: AppColors.rejectedBg,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.info_outline, size: 13, color: AppColors.rejectedFg),
                      const SizedBox(width: 6),
                      Expanded(
                        child: Text(
                          item.rejectionReason!,
                          style: const TextStyle(fontSize: 11, color: AppColors.rejectedFg),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
              const SizedBox(height: 10),
              Row(
                children: [
                  _actionChip(),
                  const Spacer(),
                  const Icon(Icons.chevron_right, color: AppColors.textSecondary, size: 20),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Color _borderColor() {
    switch (item.status) {
      case 'pending':
        return AppColors.pendingFg.withOpacity(0.3);
      case 'evidence_submitted':
        return AppColors.evidenceFg.withOpacity(0.3);
      case 'verified':
        return AppColors.verifiedFg.withOpacity(0.3);
      case 'rejected':
        return AppColors.rejectedFg.withOpacity(0.3);
      default:
        return AppColors.border;
    }
  }

  Widget _actionChip() {
    if (item.isPending) {
      return const Row(
        children: [
          Icon(Icons.camera_alt_outlined, size: 13, color: AppColors.pendingFg),
          SizedBox(width: 4),
          Text('Upload evidence',
              style: TextStyle(
                  fontSize: 12, color: AppColors.pendingFg, fontWeight: FontWeight.w500)),
        ],
      );
    }
    if (item.isEvidenceSubmitted) {
      return const Row(
        children: [
          Icon(Icons.hourglass_top, size: 13, color: AppColors.evidenceFg),
          SizedBox(width: 4),
          Text('Awaiting CA review',
              style: TextStyle(
                  fontSize: 12, color: AppColors.evidenceFg, fontWeight: FontWeight.w500)),
        ],
      );
    }
    if (item.isVerified) {
      return const Row(
        children: [
          Icon(Icons.check_circle_outline, size: 13, color: AppColors.verifiedFg),
          SizedBox(width: 4),
          Text('Verified', style: TextStyle(fontSize: 12, color: AppColors.verifiedFg)),
        ],
      );
    }
    if (item.isRejected) {
      return const Row(
        children: [
          Icon(Icons.refresh, size: 13, color: AppColors.rejectedFg),
          SizedBox(width: 4),
          Text('Re-upload evidence',
              style: TextStyle(
                  fontSize: 12, color: AppColors.rejectedFg, fontWeight: FontWeight.w600)),
        ],
      );
    }
    return const SizedBox.shrink();
  }
}
