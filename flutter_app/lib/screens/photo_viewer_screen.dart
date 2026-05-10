import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:intl/intl.dart';
import '../core/theme.dart';
import '../models/evidence_model.dart';

class PhotoViewerScreen extends StatefulWidget {
  final List<Evidence> evidenceList;
  final int initialIndex;

  const PhotoViewerScreen({
    super.key,
    required this.evidenceList,
    required this.initialIndex,
  });

  @override
  State<PhotoViewerScreen> createState() => _PhotoViewerScreenState();
}

class _PhotoViewerScreenState extends State<PhotoViewerScreen> {
  late PageController _pageCtrl;
  late int _current;

  @override
  void initState() {
    super.initState();
    _current = widget.initialIndex;
    _pageCtrl = PageController(initialPage: widget.initialIndex);
  }

  @override
  void dispose() {
    _pageCtrl.dispose();
    super.dispose();
  }

  Evidence get _ev => widget.evidenceList[_current];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.black,
        foregroundColor: Colors.white,
        title: Text(
          '${_current + 1} / ${widget.evidenceList.length}',
          style: const TextStyle(fontSize: 15, color: Colors.white),
        ),
      ),
      body: Column(
        children: [
          // Photo pager
          Expanded(
            child: PageView.builder(
              controller: _pageCtrl,
              itemCount: widget.evidenceList.length,
              onPageChanged: (i) => setState(() => _current = i),
              itemBuilder: (_, i) {
                final ev = widget.evidenceList[i];
                return InteractiveViewer(
                  child: Center(
                    child: ev.isImage
                        ? CachedNetworkImage(
                            imageUrl: ev.filePath,
                            fit: BoxFit.contain,
                            placeholder: (_, __) => const CircularProgressIndicator(
                                color: Colors.white),
                            errorWidget: (_, __, ___) => const Icon(
                                Icons.broken_image_outlined,
                                size: 60,
                                color: Colors.white54),
                          )
                        : const Icon(Icons.insert_drive_file_outlined,
                            size: 80, color: Colors.white54),
                  ),
                );
              },
            ),
          ),

          // Metadata panel
          Container(
            width: double.infinity,
            color: const Color(0xFF111111),
            padding: const EdgeInsets.fromLTRB(20, 14, 20, 20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  _ev.fileName,
                  style: const TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: Colors.white),
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 8),
                if (_ev.executiveNotes != null &&
                    _ev.executiveNotes!.isNotEmpty) ...[
                  Row(
                    children: [
                      const Icon(Icons.notes, size: 13, color: Colors.white54),
                      const SizedBox(width: 6),
                      Expanded(
                        child: Text(_ev.executiveNotes!,
                            style: const TextStyle(
                                fontSize: 12, color: Colors.white70)),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                ],
                Row(
                  children: [
                    if (_ev.deviceTimestamp != null) ...[
                      const Icon(Icons.access_time,
                          size: 12, color: Colors.white54),
                      const SizedBox(width: 5),
                      Text(
                        DateFormat('dd MMM yyyy, HH:mm')
                            .format(_ev.deviceTimestamp!.toLocal()),
                        style: const TextStyle(
                            fontSize: 11, color: Colors.white54),
                      ),
                      const SizedBox(width: 14),
                    ],
                    if (_ev.fileSize != null) ...[
                      const Icon(Icons.photo, size: 12, color: Colors.white54),
                      const SizedBox(width: 5),
                      Text(_ev.fileSizeLabel,
                          style: const TextStyle(
                              fontSize: 11, color: Colors.white54)),
                    ],
                  ],
                ),
                if (_ev.hasLocation) ...[
                  const SizedBox(height: 6),
                  Row(
                    children: [
                      const Icon(Icons.location_on,
                          size: 12, color: AppColors.verifiedFg),
                      const SizedBox(width: 5),
                      Expanded(
                        child: Text(
                          '${_ev.latitude!.toStringAsFixed(5)}, ${_ev.longitude!.toStringAsFixed(5)}',
                          style: const TextStyle(
                              fontSize: 11, color: Colors.white70),
                        ),
                      ),
                    ],
                  ),
                ],
              ],
            ),
          ),

          // Thumbnail strip
          if (widget.evidenceList.length > 1)
            SizedBox(
              height: 64,
              child: ListView.builder(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                itemCount: widget.evidenceList.length,
                itemBuilder: (_, i) {
                  final ev = widget.evidenceList[i];
                  final selected = i == _current;
                  return GestureDetector(
                    onTap: () => _pageCtrl.animateToPage(i,
                        duration: const Duration(milliseconds: 250),
                        curve: Curves.easeOut),
                    child: Container(
                      width: 48,
                      height: 48,
                      margin: const EdgeInsets.only(right: 6),
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(
                          color:
                              selected ? AppColors.primary : Colors.transparent,
                          width: 2,
                        ),
                      ),
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(7),
                        child: ev.isImage
                            ? CachedNetworkImage(
                                imageUrl: ev.filePath,
                                fit: BoxFit.cover,
                              )
                            : Container(
                                color: Colors.white12,
                                child: const Icon(Icons.insert_drive_file_outlined,
                                    size: 20, color: Colors.white54),
                              ),
                      ),
                    ),
                  );
                },
              ),
            ),
        ],
      ),
    );
  }
}
