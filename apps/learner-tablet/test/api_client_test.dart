import 'package:flutter_test/flutter_test.dart';
import 'package:lumo_learner_tablet/api_client.dart';

void main() {
  group('LumoApiClient.normalizeBaseUrl', () {
    test('keeps a clean https origin unchanged', () {
      expect(
        LumoApiClient.normalizeBaseUrl(
          'https://lumo-api-production-303a.up.railway.app',
        ),
        'https://lumo-api-production-303a.up.railway.app',
      );
    });

    test('adds https when user passes only the host', () {
      expect(
        LumoApiClient.normalizeBaseUrl(
          'lumo-api-production-303a.up.railway.app',
        ),
        'https://lumo-api-production-303a.up.railway.app',
      );
    });

    test('strips known API suffixes and whitespace', () {
      expect(
        LumoApiClient.normalizeBaseUrl(
          '  https://lumo-api-production-303a.up.railway.app/api/v1/learner-app/bootstrap  ',
        ),
        'https://lumo-api-production-303a.up.railway.app',
      );

      expect(
        LumoApiClient.normalizeBaseUrl(
          'https://lumo-api-production-303a.up.railway.app/api/v1/learner-app',
        ),
        'https://lumo-api-production-303a.up.railway.app',
      );

      expect(
        LumoApiClient.normalizeBaseUrl(
          'https://lumo-api-production-303a.up.railway.app/api/v1',
        ),
        'https://lumo-api-production-303a.up.railway.app',
      );
    });

    test('drops query string and fragment noise from pasted URLs', () {
      expect(
        LumoApiClient.normalizeBaseUrl(
          'https://lumo-api-production-303a.up.railway.app/api/v1/learner-app/bootstrap?x=1#debug',
        ),
        'https://lumo-api-production-303a.up.railway.app',
      );
    });
  });
}
