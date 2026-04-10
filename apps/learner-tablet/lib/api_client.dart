import 'dart:convert';

import 'package:http/http.dart' as http;

import 'models.dart';

class LumoApiClient {
  LumoApiClient({http.Client? client, String? baseUrl})
      : _client = client ?? http.Client(),
        baseUrl = (baseUrl ??
                const String.fromEnvironment(
                  'LUMO_API_BASE_URL',
                  defaultValue: 'http://localhost:4000',
                ))
            .replaceAll(RegExp(r'/+$'), '');

  final http.Client _client;
  final String baseUrl;

  Map<String, String> get _jsonHeaders => const {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      };

  Future<LumoBootstrap> fetchBootstrap() async {
    final response = await _client.get(
      Uri.parse('$baseUrl/api/v1/learner-app/bootstrap'),
      headers: _jsonHeaders,
    );

    _ensureOk(response, 'load learner app bootstrap');

    final decoded = _decodeObject(response.body);
    final learnersJson = _asList(decoded['learners']);
    final modulesJson = _asList(decoded['modules']);
    final lessonsJson = _asList(decoded['lessons']);
    final registrationContext = decoded['registrationContext'];
    final meta = decoded['meta'];
    final assignmentsJson = _asList(decoded['assignments']);

    return LumoBootstrap(
      learners: learnersJson.map(LearnerProfile.fromBackend).toList(),
      modules: modulesJson.map(LearningModule.fromBackend).toList(),
      lessons: lessonsJson.map(LessonCardModel.fromBackend).toList(),
      registrationContext: registrationContext is Map
          ? RegistrationContext(
              cohorts: _asList(registrationContext['cohorts'])
                  .map(BackendCohort.fromJson)
                  .toList(),
              mallams: _asList(registrationContext['mallams'])
                  .map(BackendMallam.fromJson)
                  .toList(),
            )
          : const RegistrationContext(),
      generatedAt: meta is Map ? meta['generatedAt']?.toString() : null,
      contractVersion: meta is Map ? meta['contractVersion']?.toString() : null,
      assignmentCount: meta is Map
          ? _asInt(meta['assignmentCount']) ?? assignmentsJson.length
          : assignmentsJson.length,
    );
  }

  Future<LearnerProfile> registerLearner({
    required RegistrationDraft draft,
  }) async {
    final response = await _client.post(
      Uri.parse('$baseUrl/api/v1/learner-app/learners'),
      headers: _jsonHeaders,
      body: jsonEncode(draft.backendPayloadPreview),
    );

    _ensureOk(response, 'register learner');
    return LearnerProfile.fromBackend(_decodeObject(response.body));
  }

  Future<LumoSyncResult> syncEvents(List<SyncEvent> events) async {
    final response = await _client.post(
      Uri.parse('$baseUrl/api/v1/learner-app/sync'),
      headers: _jsonHeaders,
      body: jsonEncode({
        'events': events
            .map(
              (event) => {
                'id': event.id,
                'type': event.type,
                ...event.payload,
              },
            )
            .toList(),
      }),
    );

    _ensureOk(response, 'sync learner events');
    final decoded = _decodeObject(response.body);
    return LumoSyncResult(
      accepted: _asInt(decoded['accepted']) ?? 0,
      ignored: _asInt(decoded['ignored']) ?? 0,
      syncedAt: DateTime.tryParse(decoded['syncedAt']?.toString() ?? ''),
      raw: decoded,
    );
  }

  List<Map<String, dynamic>> _asList(Object? value) {
    if (value is! List) return const <Map<String, dynamic>>[];
    return value.map((item) => Map<String, dynamic>.from(item as Map)).toList();
  }

  Map<String, dynamic> _decodeObject(String body) {
    final decoded = jsonDecode(body);
    if (decoded is! Map) {
      throw Exception('Expected an object response from API.');
    }
    return Map<String, dynamic>.from(decoded);
  }

  void _ensureOk(http.Response response, String action) {
    if (response.statusCode >= 200 && response.statusCode < 300) return;

    String message = 'Failed to $action (${response.statusCode}).';
    try {
      final decoded = jsonDecode(response.body);
      if (decoded is Map && decoded['message'] != null) {
        message = decoded['message'].toString();
      }
    } catch (_) {}
    throw Exception(message);
  }
}

class LumoBootstrap {
  final List<LearnerProfile> learners;
  final List<LearningModule> modules;
  final List<LessonCardModel> lessons;
  final RegistrationContext registrationContext;
  final String? generatedAt;
  final String? contractVersion;
  final int assignmentCount;

  const LumoBootstrap({
    required this.learners,
    required this.modules,
    required this.lessons,
    this.registrationContext = const RegistrationContext(),
    this.generatedAt,
    this.contractVersion,
    this.assignmentCount = 0,
  });
}

class LumoSyncResult {
  final int accepted;
  final int ignored;
  final DateTime? syncedAt;
  final Map<String, dynamic> raw;

  const LumoSyncResult({
    required this.accepted,
    required this.ignored,
    required this.syncedAt,
    required this.raw,
  });
}

int? _asInt(Object? value) {
  if (value is int) return value;
  return int.tryParse(value?.toString() ?? '');
}
