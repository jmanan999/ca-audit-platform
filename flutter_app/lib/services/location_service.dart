import 'package:geolocator/geolocator.dart';

class LocationResult {
  final double? latitude;
  final double? longitude;
  final String? errorMessage;

  const LocationResult({this.latitude, this.longitude, this.errorMessage});

  bool get hasLocation => latitude != null && longitude != null;
}

class LocationService {
  Future<LocationResult> getCurrentLocation() async {
    try {
      bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) {
        return const LocationResult(errorMessage: 'Location services are disabled');
      }

      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
        if (permission == LocationPermission.denied) {
          return const LocationResult(errorMessage: 'Location permission denied');
        }
      }

      if (permission == LocationPermission.deniedForever) {
        return const LocationResult(errorMessage: 'Location permission permanently denied');
      }

      final pos = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.high,
          timeLimit: Duration(seconds: 15),
        ),
      );

      return LocationResult(latitude: pos.latitude, longitude: pos.longitude);
    } catch (e) {
      return LocationResult(errorMessage: e.toString());
    }
  }
}
