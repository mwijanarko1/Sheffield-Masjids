#!/usr/bin/env bash
set -euo pipefail

#
# publish-masjidly-release.sh
# ============================
# Publishes a new Masjidly Android APK release.
#
# Workflow:
#   1. Takes a built APK from the Masjidly Expo project
#   2. Copies it to public/masjidly/masjidly-latest.apk
#   3. Updates public/masjidly/latest.json with new version info
#   4. Commits and pushes to deploy
#
# Usage:
#   ./scripts/publish-masjidly-release.sh <path-to-apk> <version> <version_code>
#
# Example:
#   ./scripts/publish-masjidly-release.sh \
#     ../masjidly/apps/expo/android/app/build/outputs/apk/release/app-release.apk \
#     1.2.0 \
#     7
#
# The SHA-256 hash is computed automatically.
#

if [[ $# -lt 3 ]]; then
  echo "Usage: $0 <path-to-apk> <version> <version_code>"
  echo ""
  echo "Example:"
  echo "  $0 ../masjidly/apps/expo/android/app/build/outputs/apk/release/app-release.apk 1.2.0 7"
  exit 1
fi

SRC_APK="$1"
VERSION="$2"
VERSION_CODE="$3"
LATEST_JSON="public/masjidly/latest.json"
DEST_APK="public/masjidly/masjidly-latest.apk"

cd "$(dirname "$0")/.."
ROOT="$(pwd)"

# Validate source APK exists
if [[ ! -f "$SRC_APK" ]]; then
  echo "❌ APK not found: $SRC_APK"
  exit 1
fi

echo "📦 Masjidly Release Publisher"
echo "=============================="
echo "Source:      $SRC_APK"
echo "Version:     $VERSION"
echo "VersionCode: $VERSION_CODE"
echo ""

# Compute SHA-256
SHA256=$(shasum -a 256 "$SRC_APK" | awk '{print $1}')
echo "🔐 SHA256: $SHA256"

# Copy APK to public directory
echo ""
echo "📋 Copying APK to $DEST_APK ..."
cp "$SRC_APK" "$DEST_APK"
echo "✅ APK copied ($(du -h "$DEST_APK" | cut -f1))"

# Update latest.json
echo ""
echo "📝 Updating $LATEST_JSON ..."
PUB_DATE=$(date -u +%Y-%m-%dT%H:%M:%SZ)

jq \
  --arg v "$VERSION" \
  --argjson vc "$VERSION_CODE" \
  --arg sha "$SHA256" \
  --arg pub "$PUB_DATE" \
  '.android.version = $v
   | .android.versionCode = $vc
   | .android.sha256 = $sha
   | .pub_date = $pub' \
  "$LATEST_JSON" > "${LATEST_JSON}.tmp" \
  && mv "${LATEST_JSON}.tmp" "$LATEST_JSON"

echo "✅ $LATEST_JSON updated."

# Stage changes
echo ""
echo "📤 Staging and committing..."
git add "$DEST_APK" "$LATEST_JSON"
git diff --cached --quiet || git commit -m "chore(release): publish Masjidly v${VERSION} (${VERSION_CODE})"

# Push
echo ""
echo "☁️  Pushing to origin..."
git push origin main

echo ""
echo "🎉 Done! Published Masjidly v${VERSION}"
echo "   APK: https://sheffieldmasjids.com/masjidly/masjidly-latest.apk"
echo "   JSON: https://sheffieldmasjids.com/masjidly/latest.json"
echo "   SHA256: $SHA256"
