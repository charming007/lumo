import 'package:audioplayers/audioplayers.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:lumo_learner_tablet/api_client.dart';
import 'package:lumo_learner_tablet/learner_audio_playback_service.dart';

void main() {
  test('treats file:// recording URIs as device file playback sources', () {
    final source = learnerAudioPlaybackSourceForPath(
      'file:///tmp/lumo-recordings/learner-response.m4a',
    );

    expect(source, isA<DeviceFileSource>());
    expect(
      (source as DeviceFileSource).path,
      '/tmp/lumo-recordings/learner-response.m4a',
    );
  });

  test('keeps remote audio review URLs as network playback sources', () {
    final source = learnerAudioPlaybackSourceForPath(
      'https://example.com/audio/fallback-review.m4a',
    );

    expect(source, isA<UrlSource>());
    expect(
      (source as UrlSource).url,
      'https://example.com/audio/fallback-review.m4a',
    );
  });

  test('upgrades backend-relative media review paths to absolute network sources', () {
    final source = learnerAudioPlaybackSourceForPath(
      '/media/takes/review-1.m4a',
      apiClient: LumoApiClient(
        baseUrl: 'https://lumo-api-production-303a.up.railway.app/api/v1/learner-app/bootstrap',
      ),
    );

    expect(source, isA<UrlSource>());
    expect(
      (source as UrlSource).url,
      'https://lumo-api-production-303a.up.railway.app/media/takes/review-1.m4a',
    );
  });
}
