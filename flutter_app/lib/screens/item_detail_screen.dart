import 'dart:io';
import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:image_picker/image_picker.dart';
import 'package:intl/intl.dart';
import '../core/theme.dart';
import '../models/audit_model.dart';
import '../models/evidence_model.dart';
import '../models/verification_item_model.dart';
import '../services/evidence_service.dart';
import '../services/location_service.dart';
import '../widgets/status_badge.dart';
import 'photo_viewer_screen.dart';

class ItemDetailScreen extends StatefulWidget {
  final VerificationItem item;
  final Audit audit;

  const ItemDetailScreen({super.key, required this.item, required this.audit});

  @override
  State<ItemDetailScreen> createState() => _ItemDetailScreenState();
}

class _ItemDetailScreenState extends State<ItemDetailScreen> {
  final _evidenceService = EvidenceService();
  final _locationService = LocationService();
  final _picker = ImagePicker();

  late VerificationItem _item;
  List<Evidence> _evidence = [];
  bool _loadingEvidence = true;
  bool _uploading = false;
  double _uploadProgress = 0;

  @override
  void initState() {
    super.initState();
    _item = widget.item;
    _loadEvidence();
  }

  Future<void> _loadEvidence() async {
    setState(() => _loadingEvidence = true);
    try {
      final ev = await _evidenceService.listEvidence(_item.id);
      if (mounted) setState(() => _evidence = ev);
    } catch (_) {}
    if (mounted) setState(() => _loadingEvidence = false);
  }

  Future<void> _openCamera() async {
    // Start GPS fetch immediately — runs concurrently while user photographs
    final gpsFuture = _locationService.getCurrentLocation();

    final picked = await _picker.pickImage(
      source: ImageSource.camera,
      imageQuality: 55,
      maxWidth: 1280,
      maxHeight: 1280,
    );
    if (picked == null) return;
    if (!mounted) return;

    // By the time the shutter is pressed and we return here, GPS is usually ready
    final gps = await gpsFuture;
    final file = File(picked.path);
    await _showUploadSheet(file, gps: gps);
  }

  Future<void> _showUploadSheet(File file, {LocationResult? gps}) async {
    final notesCtrl = TextEditingController();

    await showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (sheetCtx) => StatefulBuilder(
        builder: (ctx, setSheetState) => Padding(
          padding: EdgeInsets.only(
            left: 20,
            right: 20,
            top: 20,
            bottom: MediaQuery.of(ctx).viewInsets.bottom + 24,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Handle
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: AppColors.border,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 16),

              const Text('Add Evidence Photo',
                  style: TextStyle(
                      fontSize: 17,
                      fontWeight: FontWeight.w700,
                      color: AppColors.textPrimary)),
              const SizedBox(height: 14),

              // Image preview
              ClipRRect(
                borderRadius: BorderRadius.circular(12),
                child: Image.file(
                  file,
                  height: 200,
                  width: double.infinity,
                  fit: BoxFit.cover,
                ),
              ),
              const SizedBox(height: 14),

              // Notes
              TextField(
                controller: notesCtrl,
                maxLines: 3,
                decoration: const InputDecoration(
                  labelText: 'Field notes (optional)',
                  hintText: 'e.g. Vehicle found at warehouse, engine number visible',
                  alignLabelWithHint: true,
                ),
              ),
              const SizedBox(height: 12),

              // GPS tag (pre-fetched before sheet opened)
              if (gps != null && gps!.hasLocation)
                Row(children: [
                  const Icon(Icons.location_on, size: 14, color: AppColors.verifiedFg),
                  const SizedBox(width: 6),
                  Text(
                    'GPS: ${gps!.latitude!.toStringAsFixed(5)}, ${gps!.longitude!.toStringAsFixed(5)}',
                    style: const TextStyle(fontSize: 12, color: AppColors.verifiedFg),
                  ),
                ])
              else
                Row(children: [
                  const Icon(Icons.location_off, size: 14, color: AppColors.textSecondary),
                  const SizedBox(width: 6),
                  Text(
                    gps?.errorMessage ?? 'GPS unavailable — photo will upload without location',
                    style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
                  ),
                ]),
              const SizedBox(height: 20),

              if (_uploading)
                Column(
                  children: [
                    ClipRRect(
                      borderRadius: BorderRadius.circular(4),
                      child: LinearProgressIndicator(
                        value: _uploadProgress,
                        minHeight: 6,
                        color: AppColors.primary,
                        backgroundColor: AppColors.border,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Uploading… ${(_uploadProgress * 100).toStringAsFixed(0)}%',
                      style: const TextStyle(
                          fontSize: 12, color: AppColors.textSecondary),
                    ),
                    const SizedBox(height: 12),
                  ],
                ),

              ElevatedButton.icon(
                onPressed: _uploading
                    ? null
                    : () async {
                        setSheetState(() {
                          _uploading = true;
                          _uploadProgress = 0;
                        });
                        setState(() {
                          _uploading = true;
                          _uploadProgress = 0;
                        });

                        try {
                          final ev = await _evidenceService.uploadEvidence(
                            file: file,
                            auditId: widget.audit.id,
                            itemId: _item.id,
                            executiveNotes: notesCtrl.text.isNotEmpty
                                ? notesCtrl.text
                                : null,
                            latitude: gps?.latitude,
                            longitude: gps?.longitude,
                            deviceTimestamp: DateTime.now(),
                            onProgress: (sent, total) {
                              setSheetState(() =>
                                  _uploadProgress = total > 0 ? sent / total : 0);
                              setState(() =>
                                  _uploadProgress = total > 0 ? sent / total : 0);
                            },
                          );

                          if (mounted) {
                            Navigator.of(sheetCtx).pop();
                            setState(() {
                              _evidence.add(ev);
                              _uploading = false;
                              _uploadProgress = 0;
                              // Optimistically update status
                              if (_item.isPending) {
                                _item = _item.copyWith(status: 'evidence_submitted');
                              }
                            });
                            _showSnack('Evidence uploaded successfully!',
                                color: AppColors.verifiedFg);
                          }
                        } catch (e) {
                          if (mounted) {
                            setSheetState(() {
                              _uploading = false;
                              _uploadProgress = 0;
                            });
                            setState(() {
                              _uploading = false;
                              _uploadProgress = 0;
                            });
                            _showSnack(
                              e.toString().contains('detail')
                                  ? e.toString()
                                  : 'Upload failed — check connection and retry',
                              color: AppColors.rejectedFg,
                            );
                          }
                        }
                      },
                icon: const Icon(Icons.upload, size: 18),
                label: const Text('Upload Evidence'),
              ),
            ],
          ),
        ),
      ),
    );

    notesCtrl.dispose();
  }

  void _showSnack(String msg, {Color color = AppColors.primary}) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
      content: Text(msg),
      backgroundColor: color,
      behavior: SnackBarBehavior.floating,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
    ));
  }

  @override
  Widget build(BuildContext context) {
    final canAddEvidence = _item.isPending || _item.isRejected;

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Text(_item.title, overflow: TextOverflow.ellipsis),
        actions: [
          IconButton(icon: const Icon(Icons.refresh), onPressed: _loadEvidence),
        ],
      ),
      floatingActionButton: canAddEvidence
          ? FloatingActionButton.extended(
              onPressed: _openCamera,
              backgroundColor: AppColors.primary,
              foregroundColor: Colors.white,
              icon: const Icon(Icons.add_a_photo),
              label: const Text('Add Evidence'),
            )
          : null,
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Item info card
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: AppColors.border),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    ItemTypeBadge(_item.itemType),
                    const SizedBox(width: 8),
                    if (_item.isAiParsed)
                      Container(
                        padding:
                            const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                        decoration: BoxDecoration(
                          color: const Color(0xFFFEF3C7),
                          borderRadius: BorderRadius.circular(6),
                          border: Border.all(color: const Color(0xFFFDE68A)),
                        ),
                        child: const Text('AI parsed',
                            style: TextStyle(
                                fontSize: 10,
                                color: Color(0xFF92400E),
                                fontWeight: FontWeight.w600)),
                      ),
                    const Spacer(),
                    StatusBadge(_item.status),
                  ],
                ),
                const SizedBox(height: 12),
                Text(_item.title,
                    style: const TextStyle(
                        fontSize: 17,
                        fontWeight: FontWeight.w700,
                        color: AppColors.textPrimary)),
                if (_item.referenceValue != null &&
                    _item.referenceValue!.isNotEmpty) ...[
                  const SizedBox(height: 8),
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: AppColors.background,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.info_outline,
                            size: 14, color: AppColors.textSecondary),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            'Client claims: ${_item.referenceValue}',
                            style: const TextStyle(
                                fontSize: 12, color: AppColors.textSecondary),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
                if (_item.description != null && _item.description!.isNotEmpty) ...[
                  const SizedBox(height: 8),
                  Text(_item.description!,
                      style: const TextStyle(
                          fontSize: 13, color: AppColors.textSecondary, height: 1.4)),
                ],
                if (_item.isRejected && _item.rejectionReason != null) ...[
                  const SizedBox(height: 10),
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: AppColors.rejectedBg,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.cancel_outlined,
                            size: 14, color: AppColors.rejectedFg),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text('CA Rejection Reason',
                                  style: TextStyle(
                                      fontSize: 11,
                                      fontWeight: FontWeight.w700,
                                      color: AppColors.rejectedFg)),
                              Text(_item.rejectionReason!,
                                  style: const TextStyle(
                                      fontSize: 12, color: AppColors.rejectedFg)),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
                if (_item.caNotes != null && _item.caNotes!.isNotEmpty) ...[
                  const SizedBox(height: 10),
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: AppColors.verifiedBg,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.check_circle_outline,
                            size: 14, color: AppColors.verifiedFg),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text('CA Notes',
                                  style: TextStyle(
                                      fontSize: 11,
                                      fontWeight: FontWeight.w700,
                                      color: AppColors.verifiedFg)),
                              Text(_item.caNotes!,
                                  style: const TextStyle(
                                      fontSize: 12, color: AppColors.verifiedFg)),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ],
            ),
          ),

          const SizedBox(height: 20),

          // Evidence section
          Row(
            children: [
              const Text('Evidence Photos',
                  style: TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w700,
                      color: AppColors.textPrimary)),
              const SizedBox(width: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                decoration: BoxDecoration(
                  color: AppColors.border,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Text('${_evidence.length}',
                    style: const TextStyle(
                        fontSize: 12, color: AppColors.textSecondary)),
              ),
            ],
          ),
          const SizedBox(height: 10),

          if (_loadingEvidence)
            const Center(
                child: Padding(
              padding: EdgeInsets.all(24),
              child: CircularProgressIndicator(color: AppColors.primary),
            ))
          else if (_evidence.isEmpty)
            Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: AppColors.surface,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppColors.border),
              ),
              child: Center(
                child: Column(
                  children: [
                    const Icon(Icons.photo_camera_outlined,
                        size: 36, color: AppColors.textSecondary),
                    const SizedBox(height: 8),
                    const Text('No evidence uploaded yet',
                        style: TextStyle(
                            fontSize: 13, color: AppColors.textSecondary)),
                    if (canAddEvidence) ...[
                      const SizedBox(height: 12),
                      GestureDetector(
                        onTap: _openCamera,
                        child: const Text('Tap the button below to add a photo',
                            style: TextStyle(
                                fontSize: 12, color: AppColors.primary)),
                      ),
                    ],
                  ],
                ),
              ),
            )
          else
            GridView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 2,
                crossAxisSpacing: 10,
                mainAxisSpacing: 10,
                childAspectRatio: 1,
              ),
              itemCount: _evidence.length,
              itemBuilder: (_, i) => _EvidenceTile(
                evidence: _evidence[i],
                onTap: () => Navigator.of(context).push(MaterialPageRoute(
                  builder: (_) => PhotoViewerScreen(
                    evidenceList: _evidence,
                    initialIndex: i,
                  ),
                )),
              ),
            ),

          const SizedBox(height: 100), // FAB clearance
        ],
      ),
    );
  }
}

class _EvidenceTile extends StatelessWidget {
  final Evidence evidence;
  final VoidCallback onTap;

  const _EvidenceTile({required this.evidence, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: ClipRRect(
        borderRadius: BorderRadius.circular(12),
        child: Stack(
          fit: StackFit.expand,
          children: [
            evidence.isImage
                ? CachedNetworkImage(
                    imageUrl: evidence.filePath,
                    fit: BoxFit.cover,
                    placeholder: (_, __) => Container(
                      color: AppColors.border,
                      child: const Center(
                        child: CircularProgressIndicator(strokeWidth: 2),
                      ),
                    ),
                    errorWidget: (_, __, ___) => Container(
                      color: AppColors.border,
                      child: const Icon(Icons.broken_image_outlined,
                          color: AppColors.textSecondary),
                    ),
                  )
                : Container(
                    color: AppColors.border,
                    child: const Icon(Icons.insert_drive_file_outlined,
                        size: 40, color: AppColors.textSecondary),
                  ),
            // Gradient overlay
            Positioned(
              bottom: 0,
              left: 0,
              right: 0,
              child: Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: [Colors.transparent, Colors.black.withOpacity(0.55)],
                  ),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    if (evidence.hasLocation)
                      const Row(children: [
                        Icon(Icons.location_on, size: 10, color: Colors.white70),
                        SizedBox(width: 2),
                        Text('GPS', style: TextStyle(fontSize: 9, color: Colors.white70)),
                      ]),
                    if (evidence.deviceTimestamp != null)
                      Text(
                        DateFormat('HH:mm').format(evidence.deviceTimestamp!),
                        style: const TextStyle(fontSize: 9, color: Colors.white70),
                      ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

