import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/foundation.dart';

class DefaultFirebaseOptions {
  static FirebaseOptions get currentPlatform {
    if (kIsWeb) return web;
    switch (defaultTargetPlatform) {
      case TargetPlatform.android:
        return android;
      case TargetPlatform.iOS:
        return ios;
      default:
        return web;
    }
  }

  static const FirebaseOptions android = FirebaseOptions(
    apiKey: 'AIzaSyCwoUCcGX3WY_aqkQPUI4Sn7kktwP-ftkE',
    appId: '1:884070373693:android:d5cac1fe65a4a242308d54',
    messagingSenderId: '884070373693',
    projectId: 'caproject-b90de',
    storageBucket: 'caproject-b90de.firebasestorage.app',
  );

  static const FirebaseOptions web = FirebaseOptions(
    apiKey: 'AIzaSyDwb3sAf_FsoI6pk2cdw0zVqgn2lHjrmps',
    appId: '1:884070373693:web:52b5a045ba1c8208308d54',
    messagingSenderId: '884070373693',
    projectId: 'caproject-b90de',
    authDomain: 'caproject-b90de.firebaseapp.com',
    storageBucket: 'caproject-b90de.firebasestorage.app',
  );

  static const FirebaseOptions ios = FirebaseOptions(
    apiKey: 'AIzaSyCwoUCcGX3WY_aqkQPUI4Sn7kktwP-ftkE',
    appId: '1:884070373693:android:d5cac1fe65a4a242308d54',
    messagingSenderId: '884070373693',
    projectId: 'caproject-b90de',
    storageBucket: 'caproject-b90de.firebasestorage.app',
    iosBundleId: 'com.example.caAuditPlatform',
  );
}
