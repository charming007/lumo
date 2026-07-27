import 'package:flutter_test/flutter_test.dart';

import 'package:lumo_learner_tablet/api_client.dart';
import 'package:lumo_learner_tablet/voice_replay_service.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  test('voice replay reuses the default client when the base URL is unchanged', () {
    final defaultClient = LumoApiClient(baseUrl: 'https://api.default.example');
    final service = VoiceReplayService(
      apiClient: defaultClient,
      enablePlatformAudio: false,
    );

    final resolved = service.apiClientForBaseUrl('https://api.default.example');

    expect(identical(resolved, defaultClient), isTrue);
  });

  test('voice replay switches to the live backend target when it changes', () {
    final defaultClient = LumoApiClient(baseUrl: 'https://api.default.example');
    var createdBaseUrl = '';
    final service = VoiceReplayService(
      apiClient: defaultClient,
      enablePlatformAudio: false,
      apiClientFactory: (baseUrl) {
        createdBaseUrl = baseUrl;
        return LumoApiClient(baseUrl: baseUrl);
      },
    );

    final resolved = service.apiClientForBaseUrl('https://api.live.example');

    expect(createdBaseUrl, 'https://api.live.example');
    expect(resolved.baseUrl, 'https://api.live.example');
    expect(identical(resolved, defaultClient), isFalse);
  });
}
