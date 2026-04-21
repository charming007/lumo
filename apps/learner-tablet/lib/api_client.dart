import 'dart:async';
import 'dart:convert';

import 'package:http/http.dart' as http;

import 'models.dart';

const String kDefaultProductionApiBaseUrl =
    'https://lumo-api-production-303a.up.railway.app';

class LumoApiClient {
  LumoApiClient({http.Client? client, String? baseUrl})
      : _client = client ?? http.Client(),
        _hasExplicitBaseUrl =
            baseUrl != null || const bool.hasEnvironment('LUMO_API_BASE_URL'),
        baseUrl = normalizeBaseUrl(
          baseUrl ??
              const String.fromEnvironment(
                'LUMO_API_BASE_URL',
                defaultValue: kDefaultProductionApiBaseUrl,
              ),
        );

  final http.Client _client;
  final bool _hasExplicitBaseUrl;
  final String baseUrl;
  static const Duration _requestTimeout = Duration(seconds: 12);

  static String normalizeBaseUrl(String rawBaseUrl) {
    final trimmed = rawBaseUrl.trim();
    if (trimmed.isEmpty) {
      return kDefaultProductionApiBaseUrl;
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
    return rendered.isEmpty ? kDefaultProductionApiBaseUrl : rendered;
  }

  static String? productionBaseUrlIssue(
    String rawBaseUrl, {
    bool hasExplicitConfig = true,
  }) {
    final normalized = normalizeBaseUrl(rawBaseUrl);
    if (!hasExplicitConfig && normalized != kDefaultProductionApiBaseUrl) {
      return 'LUMO_API_BASE_URL is missing. Set it explicitly for release tablets before shipping.';
    }

    final parsed = Uri.tryParse(normalized);
    if (parsed == null || parsed.host.isEmpty) {
      return 'LUMO_API_BASE_URL is not a valid URL. Current value: $rawBaseUrl';
    }

    final hostname = parsed.host.toLowerCase();
    final scheme = parsed.scheme.toLowerCase();
    final looksPlaceholder =
        hostname == 'example.com' || hostname.endsWith('.example.com');
    final looksLocal = hostname == 'localhost' ||
        hostname == '127.0.0.1' ||
        hostname == '0.0.0.0' ||
        hostname.endsWith('.local');

    if (looksLocal) {
      return 'LUMO_API_BASE_URL points at $hostname, which is only reachable from the local machine. Release tablets would boot into a dead backend.';
    }

    if (scheme != 'https') {
      return 'LUMO_API_BASE_URL must use https in release builds. Current value: $normalized';
    }

    if (looksPlaceholder) {
      return 'LUMO_API_BASE_URL still points at the placeholder host $hostname. Replace it with the real production learner API before shipping tablets.';
    }

    return null;
  }

  String? get invalidProductionBaseUrlReason =>
      productionBaseUrlIssue(baseUrl, hasExplicitConfig: _hasExplicitBaseUrl);

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
    final uri = Uri.parse('$baseUrl/api/v1/learner-app/bootstrap');
    final response = await _send(
      () => _client.get(
        uri,
        headers: _jsonHeaders,
      ),
      action: 'load learner app bootstrap',
      uri: uri,
    );

    _ensureOk(response, 'load learner app bootstrap', uri);

    final decoded = _decodeObject(response.body,
        action: 'load learner app bootstrap', uri: uri);
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

    final uri = Uri.parse('$baseUrl/api/v1/learner-app/learners');
    final response = await _send(
      () => _client.post(
        uri,
        headers: _jsonHeaders,
        body: jsonEncode(payload),
      ),
      action: 'register learner',
      uri: uri,
    );

    _ensureOk(response, 'register learner', uri);
    return LearnerProfile.fromBackend(
      _decodeObject(response.body, action: 'register learner', uri: uri),
    );
  }

  Future<LumoModuleBundle> fetchModuleBundle(String moduleId) async {
    final uri = Uri.parse('$baseUrl/api/v1/learner-app/modules/$moduleId');
    final response = await _send(
      () => _client.get(
        uri,
        headers: _jsonHeaders,
      ),
      action: 'load module details for $moduleId',
      uri: uri,
    );

    _ensureOk(response, 'load module details for $moduleId', uri);
    final decoded = _decodeObject(response.body,
        action: 'load module details for $moduleId', uri: uri);
    final moduleJson = decoded['module'] is Map
        ? Map<String, dynamic>.from(decoded['module'] as Map)
        : decoded;
    return LumoModuleBundle(
      module: LearningModule.fromBackend(moduleJson),
      lessons:
          _asList(decoded['lessons']).map(LessonCardModel.fromBackend).toList(),
    );
  }

  Future<List<BackendLessonSession>> fetchRecentSessions({
    required String learnerCode,
    int limit = 5,
  }) async {
    final encodedLearnerCode = Uri.encodeQueryComponent(learnerCode);
    final uri = Uri.parse(
      '$baseUrl/api/v1/learner-app/sessions?learnerCode=$encodedLearnerCode&limit=$limit',
    );
    final response = await _send(
      () => _client.get(
        uri,
        headers: _jsonHeaders,
      ),
      action: 'load learner runtime sessions',
      uri: uri,
    );

    _ensureOk(response, 'load learner runtime sessions', uri);
    final decoded = _decodeObject(response.body,
        action: 'load learner runtime sessions', uri: uri);
    return _asList(decoded['sessions'])
        .map(BackendLessonSession.fromJson)
        .toList();
  }

  Future<LumoSyncResult> syncEvents(List<SyncEvent> events) async {
    final uri = Uri.parse('$baseUrl/api/v1/learner-app/sync');
    final response = await _send(
      () => _client.post(
        uri,
        headers: _jsonHeaders,
        body: jsonEncode({
          'events': events
              .map(
                (event) => {
                  'id': event.id,
                  'type': _canonicalSyncEventType(event.type),
                  ...event.payload,
                },
              )
              .toList(),
        }),
      ),
      action: 'sync learner events',
      uri: uri,
    );

    _ensureOk(response, 'sync learner events', uri);
    final decoded =
        _decodeObject(response.body, action: 'sync learner events', uri: uri);
    return LumoSyncResult(
      accepted: _asInt(decoded['accepted']) ?? 0,
      ignored: _asInt(decoded['ignored']) ?? 0,
      syncedAt: DateTime.tryParse(decoded['syncedAt']?.toString() ?? ''),
      raw: decoded,
    );
  }

  Future<RewardSnapshot> fetchLearnerRewards({
    String? learnerId,
    String? learnerCode,
  }) async {
    final query = <String, String>{};
    if (learnerId != null && learnerId.trim().isNotEmpty) {
      query['learnerId'] = learnerId.trim();
    }
    if (learnerCode != null && learnerCode.trim().isNotEmpty) {
      query['learnerCode'] = learnerCode.trim();
    }

    final uri = Uri.parse('$baseUrl/api/v1/learner-app/rewards')
        .replace(queryParameters: query.isEmpty ? null : query);
    final response = await _send(
      () => _client.get(uri, headers: _jsonHeaders),
      action: 'load learner rewards',
      uri: uri,
    );

    _ensureOk(response, 'load learner rewards', uri);
    return RewardSnapshot.fromJson(
      _decodeObject(response.body, action: 'load learner rewards', uri: uri),
    );
  }

  String _canonicalSyncEventType(String type) {
    switch (type) {
      case 'learner_registered_local_fallback':
        return 'learner_registered';
      default:
        return type;
    }
  }

  List<Map<String, dynamic>> _asList(Object? value) {
    if (value is! List) return const <Map<String, dynamic>>[];
    return value.map((item) => Map<String, dynamic>.from(item as Map)).toList();
  }

  Map<String, dynamic> _decodeObject(
    String body, {
    required String action,
    required Uri uri,
  }) {
    final trimmed = body.trim();
    if (_looksLikeHtml(trimmed)) {
      throw Exception(
        'Unable to $action: expected JSON from ${uri.toString()}, but got HTML instead. This usually means the tablet is pointed at the wrong backend target or a proxy is serving a web page instead of /api/v1/learner-app. API base: $baseUrl. Response evidence: ${_bodySnippet(trimmed)}',
      );
    }

    final decoded = jsonDecode(body);
    if (decoded is! Map) {
      throw Exception(
        'Unable to $action: expected an object response from ${uri.toString()}, but got ${decoded.runtimeType}. API base: $baseUrl.',
      );
    }
    return Map<String, dynamic>.from(decoded);
  }

  Future<http.Response> _send(
    Future<http.Response> Function() request, {
    required String action,
    required Uri uri,
  }) async {
    try {
      return await request().timeout(_requestTimeout);
    } on Exception catch (error) {
      if (error is http.ClientException) {
        throw Exception(
          'Unable to $action from ${uri.toString()} (API base: $baseUrl): ${error.message}',
        );
      }
      if (error is FormatException) {
        throw Exception(
          'Unable to $action from ${uri.toString()}: invalid backend response. API base: $baseUrl.',
        );
      }
      if (error is! TimeoutException) rethrow;
      throw Exception(
          'Unable to $action from ${uri.toString()}: request timed out after ${_requestTimeout.inSeconds}s. API base: $baseUrl.');
    }
  }

  void _ensureOk(http.Response response, String action, Uri uri) {
    if (response.statusCode >= 200 && response.statusCode < 300) return;

    final responseBody = response.body.trim();
    final contentType = response.headers['content-type'] ?? '';
    final looksLikeHtml = _looksLikeHtml(responseBody) ||
        contentType.toLowerCase().contains('text/html');
    final routeMismatchLikely = response.statusCode == 404 &&
        (looksLikeHtml ||
            RegExp(r'Cannot (GET|POST|PATCH|DELETE|PUT|OPTIONS)\b',
                    caseSensitive: false)
                .hasMatch(responseBody));

    String message =
        'Failed to $action (${response.statusCode}) from ${uri.toString()}. API base: $baseUrl.';
    try {
      final decoded = jsonDecode(response.body);
      if (decoded is Map && decoded['message'] != null) {
        message =
            '${decoded['message']} (while trying to $action via ${uri.toString()}, API base: $baseUrl).';
      }
    } catch (_) {}

    if (routeMismatchLikely) {
      message =
          'Failed to $action: ${uri.toString()} returned ${response.statusCode} with what looks like a route-level backend miss, not learner JSON. This usually means the tablet is pointed at the wrong backend, the deployed API is stale, or a proxy stripped /api/v1/learner-app. API base: $baseUrl. Response evidence: ${_bodySnippet(responseBody)}';
    } else if (looksLikeHtml) {
      message =
          'Failed to $action: ${uri.toString()} returned HTML instead of learner JSON. This usually means the tablet is hitting the wrong backend target or a proxy/web app shell. API base: $baseUrl. Response evidence: ${_bodySnippet(responseBody)}';
    }

    throw Exception(message);
  }

  bool _looksLikeHtml(String body) {
    final trimmed = body.trimLeft();
    return trimmed.startsWith('<!DOCTYPE html') ||
        trimmed.startsWith('<!doctype html') ||
        trimmed.startsWith('<html');
  }

  String _bodySnippet(String body, {int maxLength = 180}) {
    final compact = body.replaceAll(RegExp(r'\s+'), ' ').trim();
    if (compact.isEmpty) return 'empty response body';
    return compact.length <= maxLength
        ? compact
        : '${compact.substring(0, maxLength)}…';
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
