import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../core/theme.dart';
import '../models/audit_model.dart';
import '../models/verification_item_model.dart';
import '../services/item_service.dart';
import '../widgets/empty_state.dart';
import '../widgets/item_card.dart';
import '../widgets/status_badge.dart';
import 'item_detail_screen.dart';

class AuditDetailScreen extends StatefulWidget {
  final Audit audit;

  const AuditDetailScreen({super.key, required this.audit});

  @override
  State<AuditDetailScreen> createState() => _AuditDetailScreenState();
}

class _AuditDetailScreenState extends State<AuditDetailScreen>
    with SingleTickerProviderStateMixin {
  final _itemService = ItemService();
  late TabController _tabCtrl;

  List<VerificationItem> _items = [];
  bool _loading = true;
  String? _error;

  static const _tabs = ['All', 'Pending', 'Evidence', 'Verified', 'Rejected'];
  static const _statusFilters = [null, 'pending', 'evidence_submitted', 'verified', 'rejected'];

  @override
  void initState() {
    super.initState();
    _tabCtrl = TabController(length: _tabs.length, vsync: this);
    _load();
  }

  @override
  void dispose() {
    _tabCtrl.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final items = await _itemService.listItems(widget.audit.id);
      if (mounted) setState(() => _items = items);
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  List<VerificationItem> get _filtered {
    final idx = _tabCtrl.index;
    final filter = _statusFilters[idx];
    if (filter == null) return _items;
    return _items.where((i) => i.status == filter).toList();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Text(widget.audit.clientName ?? 'Audit #${widget.audit.id}',
            overflow: TextOverflow.ellipsis),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loading ? null : _load,
          ),
        ],
        bottom: TabBar(
          controller: _tabCtrl,
          onTap: (_) => setState(() {}),
          isScrollable: true,
          tabAlignment: TabAlignment.start,
          indicatorColor: AppColors.primary,
          labelColor: AppColors.primary,
          unselectedLabelColor: AppColors.textSecondary,
          labelStyle:
              const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
          tabs: _tabs.asMap().entries.map((e) {
            final filter = _statusFilters[e.key];
            final count = filter == null
                ? _items.length
                : _items.where((i) => i.status == filter).length;
            return Tab(text: '${e.value} ($count)');
          }).toList(),
        ),
      ),
      body: Column(
        children: [
          _AuditHeader(audit: widget.audit),
          Expanded(child: _buildList()),
        ],
      ),
    );
  }

  Widget _buildList() {
    if (_loading) {
      return const Center(child: CircularProgressIndicator(color: AppColors.primary));
    }
    if (_error != null) {
      return EmptyState(
        icon: Icons.cloud_off_outlined,
        title: 'Failed to load items',
        subtitle: 'Check your connection.',
        actionLabel: 'Retry',
        onAction: _load,
      );
    }

    final items = _filtered;
    if (items.isEmpty) {
      return EmptyState(
        icon: Icons.checklist_outlined,
        title: 'No items here',
        subtitle: _tabCtrl.index == 0
            ? 'The CA hasn\'t added any verification items yet.'
            : 'No items with this status.',
      );
    }

    return AnimatedBuilder(
      animation: _tabCtrl,
      builder: (_, __) => RefreshIndicator(
        onRefresh: _load,
        color: AppColors.primary,
        child: ListView.builder(
          padding: const EdgeInsets.all(14),
          itemCount: items.length,
          itemBuilder: (_, i) => ItemCard(
            item: items[i],
            onTap: () => _openItem(items[i]),
          ),
        ),
      ),
    );
  }

  void _openItem(VerificationItem item) async {
    await Navigator.of(context).push(MaterialPageRoute(
      builder: (_) => ItemDetailScreen(item: item, audit: widget.audit),
    ));
    // Refresh after returning from detail (status may have changed)
    _load();
  }
}

class _AuditHeader extends StatelessWidget {
  final Audit audit;

  const _AuditHeader({required this.audit});

  @override
  Widget build(BuildContext context) {
    return Container(
      color: AppColors.surface,
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              StatusBadge(audit.status),
              const SizedBox(width: 8),
              Text(audit.auditTypeLabel,
                  style: const TextStyle(
                      fontSize: 13, color: AppColors.textSecondary)),
              const Spacer(),
              Text(
                'Due ${DateFormat('dd MMM').format(audit.deadline)}',
                style: TextStyle(
                  fontSize: 12,
                  color: audit.isOverdue ? AppColors.rejectedFg : AppColors.textSecondary,
                  fontWeight: audit.isOverdue ? FontWeight.w600 : FontWeight.normal,
                ),
              ),
            ],
          ),
          if (audit.totalItems > 0) ...[
            const SizedBox(height: 10),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('${audit.verifiedItems}/${audit.totalItems} verified',
                    style: const TextStyle(
                        fontSize: 12, color: AppColors.textSecondary)),
                Text('${(audit.progress * 100).toStringAsFixed(0)}%',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      color: audit.progress >= 1
                          ? AppColors.verifiedFg
                          : audit.progress >= 0.5
                              ? AppColors.evidenceFg
                              : AppColors.pendingFg,
                    )),
              ],
            ),
            const SizedBox(height: 5),
            ClipRRect(
              borderRadius: BorderRadius.circular(4),
              child: LinearProgressIndicator(
                value: audit.progress,
                minHeight: 5,
                backgroundColor: AppColors.border,
                valueColor: AlwaysStoppedAnimation(
                  audit.progress >= 1
                      ? AppColors.verifiedFg
                      : audit.progress >= 0.5
                          ? AppColors.evidenceFg
                          : AppColors.pendingFg,
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}
