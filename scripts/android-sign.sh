#!/usr/bin/env bash
# Prepare a signed release APK for FinTrack.
#
# Usage:
#   ./scripts/android-sign.sh
#
# 1. Prompts for (or reads from env) the release keystore details.
# 2. Writes android/fintrack-release.properties (gitignored, never committed).
# 3. Syncs Capacitor web assets and builds a signed release APK.
#
# Env overrides (use these in CI, with secrets from your provider):
#   FINTRACK_KEYSTORE_PATH      - absolute path to the .jks/.keystore file
#   FINTRACK_KEYSTORE_PASSWORD  - store password
#   FINTRACK_KEY_ALIAS          - key alias
#   FINTRACK_KEY_PASSWORD       - key password
#
# To generate a keystore manually:
#   keytool -genkey -v -keystore fintrack-release.jks \
#     -alias fintrack -keyalg RSA -keysize 2048 -validity 10000

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROPS="$ROOT/android/fintrack-release.properties"

KEYSTORE_PATH="${FINTRACK_KEYSTORE_PATH:-}"
KEYSTORE_PASSWORD="${FINTRACK_KEYSTORE_PASSWORD:-}"
KEY_ALIAS="${FINTRACK_KEY_ALIAS:-}"
KEY_PASSWORD="${FINTRACK_KEY_PASSWORD:-}"

if [[ -z "$KEYSTORE_PATH" ]]; then
  read -rp "Path to release keystore (.jks): " KEYSTORE_PATH
fi
if [[ -z "$KEYSTORE_PASSWORD" ]]; then
  read -rsp "Keystore password: " KEYSTORE_PASSWORD; echo
fi
if [[ -z "$KEY_ALIAS" ]]; then
  read -rp "Key alias: " KEY_ALIAS
fi
if [[ -z "$KEY_PASSWORD" ]]; then
  read -rsp "Key password: " KEY_PASSWORD; echo
fi

if [[ ! -f "$KEYSTORE_PATH" ]]; then
  echo "error: keystore not found at $KEYSTORE_PATH" >&2
  exit 1
fi

# Local-only properties consumed by android/app/build.gradle.
umask 077
cat > "$PROPS" <<EOF
FINTRACK_RELEASE_STORE_FILE=$KEYSTORE_PATH
FINTRACK_RELEASE_STORE_PASSWORD=$KEYSTORE_PASSWORD
FINTRACK_RELEASE_KEY_ALIAS=$KEY_ALIAS
FINTRACK_RELEASE_KEY_PASSWORD=$KEY_PASSWORD
EOF

echo "Signing config written to $PROPS (gitignored)"

echo "Syncing Capacitor..."
"$ROOT/node_modules/.bin/cap" sync android

echo "Building signed release APK..."
cd "$ROOT/android"
./gradlew assembleRelease

APK="$(find app/build/outputs/apk/release -name '*.apk' | head -1)"
echo ""
echo "Signed APK: $APK"
