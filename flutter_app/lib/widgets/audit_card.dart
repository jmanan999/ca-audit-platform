import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../core/theme.dart';
import '../models/audit_model.dart';
import 'status_badge.dart';

class AuditCard extends StatelessWidget {
  final Audit audit;
  final VoidCallback onTap;

  const AuditCard({super.key, required this.audit, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final progress = audit.progress;
    final isOverdue = audit.isOverdue;

    return GestureDetector(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
              color: isOverdue ? AppColors.rejectedFg.withOpacity(0.4) : AppColors.border),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.04),
              blurRadius: 8,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(
                      audit.clientName ?? 'Audit #${audit.id}',
                      style: const TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w600,
                        color: AppColors.textPrimary,
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  StatusBadge(audit.status),
                ],
              ),
              const SizedBox(height: 4),
              Text(
                audit.auditTypeLabel,
                style: const TextStyle(fontSize: 13, color: AppColors.textSecondary),
              ),
              const SizedBox(height: 12),
              if (audit.totalItems > 0) ...[
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      '${audit.verifiedItems} / ${audit.totalItems} items verified',
                      style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
                    ),
                    Text(
                      '${(progress * 100).toStringAsFixed(0)}%',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: _progressColor(progress),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                ClipRRect(
                  borderRadius: BorderRadius.circular(4),
                  child: LinearProgressIndicator(
                    value: progress,
                    minHeight: 5,
                    backgroundColor: AppColors.border,
                    valueColor: AlwaysStoppedAnimation(_progressColor(progress)),
                  ),
                ),
                const SizedBox(height: 10),
              ],
              Row(
                children: [
                  Icon(
                    isOverdue ? Icons.warning_amber_rounded : Icons.calendar_today_outlined,
                    size: 13,
                    color: isOverdue ? AppColors.rejectedFg : AppColors.textSecondary,
                  ),
                  const SizedBox(width: 4),
                  Text(
                    'Deadline: ${DateFormat('dd MMM yyyy').format(audit.deadline)}',
                    style: TextStyle(
                      fontSize: 12,
                      color: isOverdue ? AppColors.rejectedFg : AppColors.textSecondary,
                      fontWeight: isOverdue ? FontWeight.w600 : FontWeight.normal,
                    ),
                  ),
                  const Spacer(),
                  if (audit.pendingItems > 0)
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                      decoration: BoxDecoration(
                        color: AppColors.pendingBg,
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Text(
                        '${audit.pendingItems} pending',
                        style: const TextStyle(
                          fontSize: 11,
                          color: AppColors.pendingFg,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Color _progressColor(double p) {
    if (p >= 1.0) return AppColors.verifiedFg;
    if (p >= 0.5) return AppColors.evidenceFg;
    return AppColors.pendingFg;
  }
}
