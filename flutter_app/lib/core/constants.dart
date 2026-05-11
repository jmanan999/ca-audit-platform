// For BlueStacks / Android emulator: host machine is reachable at 10.0.2.2.
// For a real device on the same WiFi: replace with your machine's local IP (e.g. 192.168.1.x).
const String kApiBaseUrl = 'http://192.168.1.11:8000';
const String kApiPath = '/api/v1';
const int kConnectTimeoutMs = 15000;
const int kReceiveTimeoutMs = 120000;
const String kTokenKey = 'access_token';
