# Kiro App - Android WebView

Aplikasi Android yang membungkus **Kiro Web** (https://kiro.dev) dalam WebView supaya bisa diakses langsung dari home screen tanpa perlu buka browser.

## Features

- Fullscreen WebView (tanpa address bar)
- Loading progress bar
- Back button navigation (bisa kembali ke halaman sebelumnya)
- Dark theme
- Minimal & ringan

## Cara Build APK

### Prasyarat
- **Android Studio** (versi terbaru) — [Download](https://developer.android.com/studio)
- Atau **Gradle + Android SDK** command line

### Cara 1: Pakai Android Studio (Recommended)

1. Clone repo ini:
   ```bash
   git clone https://github.com/cloudmail280/kiro_creator.git
   ```

2. Buka Android Studio → **Open** → pilih folder `kiro_creator`

3. Tunggu Gradle sync selesai

4. Klik **Build** → **Build Bundle(s) / APK(s)** → **Build APK(s)**

5. APK ada di: `app/build/outputs/apk/debug/app-debug.apk`

6. Transfer APK ke HP dan install

### Cara 2: Command Line

```bash
# Clone
git clone https://github.com/cloudmail280/kiro_creator.git
cd kiro_creator

# Build debug APK
./gradlew assembleDebug

# APK output:
# app/build/outputs/apk/debug/app-debug.apk
```

### Cara 3: Build Online (Tanpa Install Apapun)

Gunakan [ApkBuilder Online](https://www.appsgeyser.com/) atau layanan serupa:
1. Pilih "Website App"
2. Masukkan URL: `https://kiro.dev`
3. Download APK

## Install di HP

1. Copy file `.apk` ke HP
2. Buka file manager, tap file APK
3. Izinkan "Install from Unknown Sources" jika diminta
4. Install & selesai!

## Struktur Project

```
kiro_creator/
├── app/
│   ├── build.gradle
│   ├── proguard-rules.pro
│   └── src/main/
│       ├── AndroidManifest.xml
│       ├── java/com/kiro/webapp/
│       │   └── MainActivity.java
│       └── res/
│           ├── layout/activity_main.xml
│           ├── drawable/
│           ├── mipmap-hdpi/
│           └── values/
├── build.gradle
├── settings.gradle
├── gradle.properties
└── gradle/wrapper/
    └── gradle-wrapper.properties
```

## Kustomisasi

- Ubah URL di `MainActivity.java` → variabel `KIRO_URL`
- Ubah warna di `res/values/colors.xml`
- Ubah nama app di `res/values/strings.xml`
- Ubah icon di `res/drawable/ic_launcher_foreground.xml`

## Minimum Requirements

- Android 7.0 (API 24) ke atas
- Koneksi internet

## License

MIT
