import 'package:flutter/material.dart';
import '../core/theme.dart';
import '../models/audit_model.dart';
import '../services/audit_service.dart';
import '../services/item_service.dart';
import '../widgets/audit_card.dart';
import '../widgets/empty_state.dart';
import 'audit_detail_screen.dart';

class AuditsTab extends StatefulWidget {
  const AuditsTab({super.key});

  @override
  State<AuditsTab> createState() => _AuditsTabState();
}

class _AuditsTabState extends State<AuditsTab> {
  final _auditService = AuditService();
  final _itemService = ItemService();

  List<Audit> _audits = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final audits = await _auditService.listAudits();
      // Fetch item stats for each audit concurrently
      await Future.wait(audits.map((a) => _loadStats(a)));
      if (mounted) setState(() => _audits = audits);
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _loadStats(Audit audit) async {
    try {
      final items = await _itemService.listItems(audit.id);
      audit.totalItems = items.length;
      audit.verifiedItems = items.where((i) => i.isVerified).length;
      audit.pendingItems = items.where((i) => i.isPending).length;
      audit.evidenceItems = items.where((i) => i.isEvidenceSubmitted).length;
      audit.rejectedItems = items.where((i) => i.isRejected).length;
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('My Audits'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loading ? null : _load,
          ),
        ],
      ),
      body: _buildBody(),
    );
  }

  Widget _buildBody() {
    if (_loading) {
      return const Center(
          child: CircularProgressIndicator(color: AppColors.primary));
    }

    if (_error != null) {
      return EmptyState(
        icon: Icons.cloud_off_outlined,
        title: 'Failed to load audits',
        subtitle: 'Check your connection and try again.',
        actionLabel: 'Retry',
        onAction: _load,
      );
    }

    if (_audits.isEmpty) {
      return const EmptyState(
        icon: Icons.assignment_outlined,
        title: 'No audits found',
        subtitle: 'Your CA hasn\'t assigned any audits yet.',
      );
    }

    final active = _audits.where((a) => a.isActive).toList();
    final completed = _audits.where((a) => !a.isActive).toList();

    return RefreshIndicator(
      onRefresh: _load,
      color: AppColors.primary,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          if (active.isNotEmpty) ...[
            _SectionLabel('Active Audits', active.length),
            const SizedBox(height: 8),
            ...active.map((a) => AuditCard(
                  audit: a,
                  onTap: () => _openAudit(a),
                )),
            const SizedBox(height: 16),
          ],
          if (completed.isNotEmpty) ...[
            _SectionLabel('Completed', completed.length),
            const SizedBox(height: 8),
            ...completed.map((a) => AuditCard(
                  audit: a,
                  onTap: () => _openAudit(a),
                )),
          ],
        ],
      ),
    );
  }

  void _openAudit(Audit audit) {
    Navigator.of(context).push(MaterialPageRoute(
      builder: (_) => AuditDetailScreen(audit: audit),
    ));
  }
}

class _SectionLabel extends StatelessWidget {
  final String label;
  final int count;
  const _SectionLabel(this.label, this.count);

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Text(label,
            style: const TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: AppColors.textSecondary,
                letterSpacing: 0.3)),
        const SizedBox(width: 6),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
          decoration: BoxDecoration(
            color: AppColors.border,
            borderRadius: BorderRadius.circular(10),
          ),
          child: Text('$count',
              style: const TextStyle(fontSize: 11, color: AppColors.textSecondary)),
        ),
      ],
    );
  }
}
