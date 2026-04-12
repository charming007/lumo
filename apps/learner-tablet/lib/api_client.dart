import 'dart:async';
import 'dart:convert';

import 'package:http/http.dart' as http;

import 'models.dart';

class LumoApiClient {
  LumoApiClient({http.Client? client, String? baseUrl})
      : _client = client ?? http.Client(),
        baseUrl = normalizeBaseUrl(
          baseUrl ??
              const String.fromEnvironment(
                'LUMO_API_BASE_URL',
                defaultValue: 'https://lumo-api-production-303a.up.railway.app',
              ),
        );

  final http.Client _client;
  final String baseUrl;
  static const Duration _requestTimeout = Duration(seconds: 12);

  static String normalizeBaseUrl(String rawBaseUrl) {
    final trimmed = rawBaseUrl.trim();
    if (trimmed.isEmpty) {
      return 'https://lumo-api-production-303a.up.railway.app';
    }

    final withScheme = trimmed.contains('://') ? trimmed : 'https://$trimmed';
    final parsed = Uri.tryParse(withScheme);
    if (parsed == null || parsed.host.isEmpty) {
      return withScheme.replaceAll(RegExp(r'/+$'), '');
    }

    final segments =
        parsed.pathSegments.where((segment) => segment.isNotEmpty).toList();
    final normalizedSegments = _stripApiSuffix(segments);
    final normalizedPath =
        normalizedSegments.isEmpty ? '' : '/${normalizedSegments.join('/')}';
    final authority =
        parsed.hasPort ? '${parsed.host}:${parsed.port}' : parsed.host;
    final normalized = '${parsed.scheme}://$authority$normalizedPath';

    final rendered = normalized.replaceAll(RegExp(r'/+$'), '');
    return rendered.isEmpty
        ? 'https://lumo-api-production-303a.up.railway.app'
        : rendered;
  }

  static List<String> _stripApiSuffix(List<String> segments) {
    if (segments.isEmpty) return const [];

    final suffixes = <List<String>>[
      ['api', 'v1', 'learner-app', 'bootstrap'],
      ['api', 'v1', 'learner-app'],
      ['api', 'v1'],
      ['bootstrap'],
    ];

    for (final suffix in suffixes) {
      if (segments.length < suffix.length) continue;
      final tail = segments.sublist(segments.length - suffix.length);
      var matches = true;
      for (var index = 0; index < suffix.length; index++) {
        if (tail[index] != suffix[index]) {
          matches = false;
          break;
        }
      }
      if (matches) {
        return segments.sublist(0, segments.length - suffix.length);
      }
    }

    return segments;
  }

  Map<String, String> get _jsonHeaders => const {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      };

  Future<LumoBootstrap> fetchBootstrap() async {
    final response = await _send(
      () => _client.get(
        Uri.parse('$baseUrl/api/v1/learner-app/bootstrap'),
        headers: _jsonHeaders,
      ),
      action: 'load learner app bootstrap',
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
      assignmentPacks:
          assignmentsJson.map(LearnerAssignmentPack.fromJson).toList(),
      registrationContext: registrationContext is Map
          ? RegistrationContext.fromJson(
              Map<String, dynamic>.from(registrationContext),
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
    RegistrationTarget? registrationTarget,
  }) async {
    final payload = {
      ...draft.backendPayloadPreview,
      if (registrationTarget != null) ...{
        'backendTarget': {
          'cohortId': registrationTarget.cohort.id,
          'cohortName': registrationTarget.cohort.name,
          'podId': registrationTarget.cohort.podId,
          'mallamId': registrationTarget.mallam.id,
          'mallamName': registrationTarget.mallam.name,
        },
      },
    };

    final response = await _send(
      () => _client.post(
        Uri.parse('$baseUrl/api/v1/learner-app/learners'),
        headers: _jsonHeaders,
        body: jsonEncode(payload),
      ),
      action: 'register learner',
    );

    _ensureOk(response, 'register learner');
    return LearnerProfile.fromBackend(_decodeObject(response.body));
  }

  Future<LumoModuleBundle> fetchModuleBundle(String moduleId) async {
    final response = await _send(
      () => _client.get(
        Uri.parse('$baseUrl/api/v1/learner-app/modules/$moduleId'),
        headers: _jsonHeaders,
      ),
      action: 'load module details for $moduleId',
    );

    _ensureOk(response, 'load module details for $moduleId');
    final decoded = _decodeObject(response.body);
    return LumoModuleBundle(
      module: LearningModule.fromBackend(decoded),
      lessons:
          _asList(decoded['lessons']).map(LessonCardModel.fromBackend).toList(),
    );
  }

  Future<List<BackendLessonSession>> fetchRecentSessions({
    required String learnerCode,
    int limit = 5,
  }) async {
    final encodedLearnerCode = Uri.encodeQueryComponent(learnerCode);
    final response = await _send(
      () => _client.get(
        Uri.parse(
          '$baseUrl/api/v1/learner-app/sessions?learnerCode=$encodedLearnerCode&limit=$limit',
        ),
        headers: _jsonHeaders,
      ),
      action: 'load learner runtime sessions',
    );

    _ensureOk(response, 'load learner runtime sessions');
    final decoded = _decodeObject(response.body);
    return _asList(decoded['sessions'])
        .map(BackendLessonSession.fromJson)
        .toList();
  }

  Future<LumoSyncResult> syncEvents(List<SyncEvent> events) async {
    final response = await _send(
      () => _client.post(
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
      ),
      action: 'sync learner events',
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

  Future<http.Response> _send(
    Future<http.Response> Function() request, {
    required String action,
  }) async {
    try {
      return await request().timeout(_requestTimeout);
    } on Exception catch (error) {
      if (error is http.ClientException) {
        throw Exception('Unable to $action: ${error.message}');
      }
      if (error is FormatException) {
        throw Exception('Unable to $action: invalid backend response.');
      }
      if (error is! TimeoutException) rethrow;
      throw Exception(
          'Unable to $action: request timed out after ${_requestTimeout.inSeconds}s.');
    }
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
  final List<LearnerAssignmentPack> assignmentPacks;
  final RegistrationContext registrationContext;
  final String? generatedAt;
  final String? contractVersion;
  final int assignmentCount;

  const LumoBootstrap({
    required this.learners,
    required this.modules,
    required this.lessons,
    this.assignmentPacks = const [],
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
