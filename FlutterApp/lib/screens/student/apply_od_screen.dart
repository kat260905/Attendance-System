import 'dart:io';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:file_picker/file_picker.dart';
import 'package:intl/intl.dart';
import '../../providers/auth_provider.dart';
import '../../services/api_service.dart';
import '../../theme/app_theme.dart';

class ApplyODScreen extends StatefulWidget {
  const ApplyODScreen({super.key});

  @override
  State<ApplyODScreen> createState() => _ApplyODScreenState();
}

class _ApplyODScreenState extends State<ApplyODScreen> {
  final _reasonController = TextEditingController();
  DateTime? _fromDate;
  DateTime? _toDate;
  File? _document;
  String? _fileName;
  bool _submitting = false;

  @override
  void dispose() {
    _reasonController.dispose();
    super.dispose();
  }

  Future<void> _pickDate(bool isFrom) async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: now,
      firstDate: now.subtract(const Duration(days: 7)),
      lastDate: now.add(const Duration(days: 30)),
      builder: (context, child) => Theme(
        data: Theme.of(context).copyWith(
          colorScheme: ColorScheme.light(primary: AppTheme.primary),
        ),
        child: child!,
      ),
    );
    if (picked != null) {
      setState(() {
        if (isFrom) {
          _fromDate = picked;
          if (_toDate != null && _toDate!.isBefore(picked)) _toDate = picked;
        } else {
          _toDate = picked;
        }
      });
    }
  }

  Future<void> _pickFile() async {
    final result = await FilePicker.platform.pickFiles(
      type: FileType.custom,
      allowedExtensions: ['pdf', 'png', 'jpg', 'jpeg', 'doc', 'docx'],
    );
    if (result != null && result.files.single.path != null) {
      setState(() {
        _document = File(result.files.single.path!);
        _fileName = result.files.single.name;
      });
    }
  }

  Future<void> _submit() async {
    if (_fromDate == null || _toDate == null) {
      _showSnack('Please select both dates', isError: true);
      return;
    }
    if (_reasonController.text.trim().isEmpty) {
      _showSnack('Please enter a reason', isError: true);
      return;
    }
    if (_document == null) {
      _showSnack('Please attach a supporting document', isError: true);
      return;
    }

    setState(() => _submitting = true);

    final user = context.read<AuthProvider>().user;
    final studentId = user?.studentId ?? user?.id;
    if (studentId == null) return;

    final res = await ApiService.submitODRequest(
      studentId: studentId,
      fromDate: DateFormat('yyyy-MM-dd').format(_fromDate!),
      toDate: DateFormat('yyyy-MM-dd').format(_toDate!),
      reason: _reasonController.text.trim(),
      document: _document,
    );

    if (mounted) {
      setState(() => _submitting = false);
      if (res['success'] == true) {
        _showSnack('OD request submitted successfully!');
        _reasonController.clear();
        setState(() {
          _fromDate = null;
          _toDate = null;
          _document = null;
          _fileName = null;
        });
      } else {
        _showSnack(res['error'] ?? 'Failed to submit', isError: true);
      }
    }
  }

  void _showSnack(String msg, {bool isError = false}) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(msg),
        backgroundColor: isError ? AppTheme.danger : AppTheme.success,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final fmt = DateFormat('dd MMM yyyy');

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        children: [
          Container(
            decoration: AppTheme.cardDecoration,
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('OD Request Form',
                    style: Theme.of(context).textTheme.titleLarge),
                const SizedBox(height: 4),
                Text('Submit your On-Duty request for approval',
                    style: Theme.of(context).textTheme.bodyMedium),
                const SizedBox(height: 24),

                // Date Row
                Row(
                  children: [
                    Expanded(
                      child: _DateField(
                        label: 'From Date *',
                        value: _fromDate != null ? fmt.format(_fromDate!) : null,
                        onTap: () => _pickDate(true),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: _DateField(
                        label: 'To Date *',
                        value: _toDate != null ? fmt.format(_toDate!) : null,
                        onTap: () => _pickDate(false),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 20),

                // Reason
                Text('Reason *',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: AppTheme.textSecondary,
                    )),
                const SizedBox(height: 8),
                TextField(
                  controller: _reasonController,
                  maxLines: 4,
                  maxLength: 1000,
                  decoration: const InputDecoration(
                    hintText: 'Provide a detailed reason for your request...',
                  ),
                ),
                const SizedBox(height: 16),

                // File Upload
                Text('Supporting Document *',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: AppTheme.textSecondary,
                    )),
                const SizedBox(height: 8),
                GestureDetector(
                  onTap: _pickFile,
                  child: Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(24),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF8FAFC),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: AppTheme.border,
                        width: 1.5,
                        style: BorderStyle.solid,
                      ),
                    ),
                    child: Column(
                      children: [
                        Icon(Icons.cloud_upload_outlined,
                            size: 36,
                            color: _document != null
                                ? AppTheme.success
                                : AppTheme.textMuted),
                        const SizedBox(height: 8),
                        Text(
                          _document != null
                              ? _fileName ?? 'File selected'
                              : 'Tap to upload document',
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                            color: _document != null
                                ? AppTheme.success
                                : AppTheme.accent,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'PDF, PNG, JPG, DOC up to 5MB',
                          style: TextStyle(
                            fontSize: 12,
                            color: AppTheme.textMuted,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 20),

                // Info Box
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: AppTheme.infoLight,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: AppTheme.info.withOpacity(0.15)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Icon(Icons.info_outline,
                              size: 16, color: AppTheme.info),
                          const SizedBox(width: 6),
                          Text('Important Notes',
                              style: TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.w700,
                                color: const Color(0xFF1E40AF),
                              )),
                        ],
                      ),
                      const SizedBox(height: 8),
                      _infoBullet('OD can be requested 7 days back or 30 days ahead.'),
                      _infoBullet('Requests go to admin for review.'),
                      _infoBullet('Once approved, faculty marks attendance as OD.'),
                    ],
                  ),
                ),
                const SizedBox(height: 24),

                // Submit
                SizedBox(
                  width: double.infinity,
                  height: 50,
                  child: ElevatedButton(
                    onPressed: _submitting ? null : _submit,
                    child: _submitting
                        ? const SizedBox(
                            height: 20,
                            width: 20,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: Colors.white,
                            ),
                          )
                        : const Text('Submit OD Request',
                            style: TextStyle(
                                fontSize: 15, fontWeight: FontWeight.w700)),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _infoBullet(String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            margin: const EdgeInsets.only(top: 6, right: 8),
            width: 5,
            height: 5,
            decoration: BoxDecoration(
              color: AppTheme.info,
              shape: BoxShape.circle,
            ),
          ),
          Expanded(
            child: Text(text,
                style: const TextStyle(
                  fontSize: 12,
                  color: Color(0xFF1E40AF),
                )),
          ),
        ],
      ),
    );
  }
}

class _DateField extends StatelessWidget {
  final String label;
  final String? value;
  final VoidCallback onTap;

  const _DateField({required this.label, this.value, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label,
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w600,
              color: AppTheme.textSecondary,
            )),
        const SizedBox(height: 8),
        GestureDetector(
          onTap: onTap,
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppTheme.border),
            ),
            child: Row(
              children: [
                Icon(Icons.calendar_today, size: 16, color: AppTheme.textMuted),
                const SizedBox(width: 8),
                Text(
                  value ?? 'Select date',
                  style: TextStyle(
                    fontSize: 14,
                    color: value != null ? AppTheme.textPrimary : AppTheme.textMuted,
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}
