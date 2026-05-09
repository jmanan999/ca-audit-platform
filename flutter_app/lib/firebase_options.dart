import 'package:firebase_core/firebase_core.dart';

class DefaultFirebaseOptions {
  static FirebaseOptions get currentPlatform {
    return web;
  }

  static const FirebaseOptions web = FirebaseOptions(
    apiKey: 'your_firebase_api_key',
    appId: 'your_firebase_app_id',
    messagingSenderId: 'your_firebase_messaging_sender_id',
    projectId: 'your_firebase_project_id',
    authDomain: 'your_firebase_auth_domain',
    storageBucket: 'your_firebase_storage_bucket',
  );

  static const FirebaseOptions android = FirebaseOptions(
    apiKey: 'your_firebase_api_key',
    appId: 'your_firebase_app_id',
    messagingSenderId: 'your_firebase_messaging_sender_id',
    projectId: 'your_firebase_project_id',
  );

  static const FirebaseOptions ios = FirebaseOptions(
    apiKey: 'your_firebase_api_key',
    appId: 'your_firebase_app_id',
    messagingSenderId: 'your_firebase_messaging_sender_id',
    projectId: 'your_firebase_project_id',
    iosBundleId: 'com.ca-audit-platform.ios',
  );
}
