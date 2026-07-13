#!/usr/bin/env bash
set -euo pipefail

#
# publish-masjidly-release.sh
# ============================
# Updates public/masjidly/latest.json for a store-distributed Masjidly release.
# Android is on Google Play; iOS is on the App Store. No APK is hosted.
#
# Usage:
#   ./scripts/publish-masjidly-release.sh \
#     --android-version 1.3 --android-version-code 10 \
#     [--ios-version 1.3.1] [--ios-build 5]
#
# Example:
#   ./scripts/publish-masjidly-release.sh \
#     --android-version 1.3 --android-version-code 10
#

ANDROID_VERSION=""
ANDROID_VERSION_CODE=""
IOS_VERSION=""
IOS_BUILD=""

usage() {
  echo "Usage: $0 --android-version <x.y[.z]> --android-version-code <n> [--ios-version <x.y.z>] [--ios-build <n>]"
  exit 1
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --android-version) ANDROID_VERSION="${2:-}"; shift 2 ;;
    --android-version-code) ANDROID_VERSION_CODE="${2:-}"; shift 2 ;;
    --ios-version) IOS_VERSION="${2:-}"; shift 2 ;;
    --ios-build) IOS_BUILD="${2:-}"; shift 2 ;;
    -h|--help) usage ;;
    *) echo "Unknown arg: $1"; usage ;;
  esac
done

if [[ -z "$ANDROID_VERSION" || -z "$ANDROID_VERSION_CODE" ]]; then
  usage
fi

LATEST_JSON="public/masjidly/latest.json"
PLAY_STORE_URL="https://play.google.com/store/apps/details?id=com.mikhailspeaks.masjidly&hl=en"

cd "$(dirname "$0")/.."

if [[ ! -f "$LATEST_JSON" ]]; then
  echo "❌ Missing $LATEST_JSON"
  exit 1
fi

echo "📦 Masjidly Release Publisher (store)"
echo "====================================="
echo "Android: $ANDROID_VERSION ($ANDROID_VERSION_CODE)"
[[ -n "$IOS_VERSION" ]] && echo "iOS:     $IOS_VERSION${IOS_BUILD:+ ($IOS_BUILD)}"
echo ""

PUB_DATE=$(date -u +%Y-%m-%dT%H:%M:%SZ)

JQ_ARGS=(
  --arg v "$ANDROID_VERSION"
  --argjson vc "$ANDROID_VERSION_CODE"
  --arg url "$PLAY_STORE_URL"
  --arg pub "$PUB_DATE"
)
JQ_PROG='.android.version = $v
  | .android.versionCode = $vc
  | .android.url = $url
  | .android.sha256 = ""
  | .pub_date = $pub'

if [[ -n "$IOS_VERSION" ]]; then
  JQ_ARGS+=(--arg iv "$IOS_VERSION")
  JQ_PROG+=' | .ios.version = $iv'
fi
if [[ -n "$IOS_BUILD" ]]; then
  JQ_ARGS+=(--argjson ib "$IOS_BUILD")
  JQ_PROG+=' | .ios.build = $ib'
fi

jq "${JQ_ARGS[@]}" "$JQ_PROG" "$LATEST_JSON" > "${LATEST_JSON}.tmp" \
  && mv "${LATEST_JSON}.tmp" "$LATEST_JSON"

echo "✅ $LATEST_JSON updated."
echo ""
echo "📤 Staging and committing..."
git add "$LATEST_JSON"
git diff --cached --quiet || git commit -m "chore(release): Masjidly Android v${ANDROID_VERSION} (${ANDROID_VERSION_CODE})"

echo ""
echo "☁️  Pushing to origin..."
git push origin main

echo ""
echo "🎉 Done! Published Masjidly Android v${ANDROID_VERSION}"
echo "   JSON: https://sheffieldmasjids.com/masjidly/latest.json"
echo "   Play: $PLAY_STORE_URL"
