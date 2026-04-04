#!/bin/bash
# =========================================================
# mdfy QuickLook Extension — Build Script
#
# Builds the host app + QuickLook preview extension using
# xcodebuild (requires Xcode or Command Line Tools).
# =========================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BUILD_DIR="${SCRIPT_DIR}/build"
DERIVED_DATA="${BUILD_DIR}/DerivedData"
INSTALL_DIR="/Applications"

echo ""
echo "  mdfy QuickLook Extension — Build"
echo "  ================================="
echo ""

# ─── Check prerequisites ───

if ! command -v xcodebuild &> /dev/null; then
    echo "  Error: xcodebuild not found."
    echo "  Please install Xcode from the App Store or run:"
    echo "    xcode-select --install"
    echo ""
    echo "  Alternatively, open MdfyQuickLook.xcodeproj in Xcode"
    echo "  and build from there (Product > Build)."
    exit 1
fi

# ─── Clean previous build ───

echo "  [1/4] Cleaning previous build..."
rm -rf "${BUILD_DIR}"
mkdir -p "${BUILD_DIR}"

# ─── Build ───

echo "  [2/4] Building MdfyQuickLook.app + QuickLook extension..."
cd "${SCRIPT_DIR}"

xcodebuild \
    -project MdfyQuickLook.xcodeproj \
    -scheme MdfyQuickLook \
    -configuration Release \
    -derivedDataPath "${DERIVED_DATA}" \
    -arch "$(uname -m)" \
    ONLY_ACTIVE_ARCH=YES \
    CODE_SIGN_IDENTITY="-" \
    CODE_SIGNING_REQUIRED=NO \
    CODE_SIGNING_ALLOWED=NO \
    2>&1 | tail -5

BUILD_APP="${DERIVED_DATA}/Build/Products/Release/MdfyQuickLook.app"

if [ ! -d "${BUILD_APP}" ]; then
    echo ""
    echo "  Build failed. Try opening MdfyQuickLook.xcodeproj in Xcode instead."
    echo ""
    echo "  Common fixes:"
    echo "    1. Open Xcode at least once to accept the license"
    echo "    2. Run: sudo xcodebuild -license accept"
    echo "    3. Run: xcode-select --install"
    exit 1
fi

# ─── Copy to build output ───

echo "  [3/4] Copying to build directory..."
cp -R "${BUILD_APP}" "${BUILD_DIR}/MdfyQuickLook.app"

# ─── Ad-hoc sign ───

echo "  [4/4] Ad-hoc signing..."
codesign --force --deep --sign - "${BUILD_DIR}/MdfyQuickLook.app" 2>/dev/null || true

echo ""
echo "  Build complete!"
echo ""
echo "  Output: ${BUILD_DIR}/MdfyQuickLook.app"
echo ""
echo "  To install:"
echo "    1. Copy MdfyQuickLook.app to /Applications"
echo "    2. Open it once (this registers the QuickLook extension)"
echo "    3. Press Space on any .md file in Finder"
echo ""
echo "  Quick install:"
echo "    cp -R '${BUILD_DIR}/MdfyQuickLook.app' /Applications/"
echo "    open /Applications/MdfyQuickLook.app"
echo ""

# ─── Optional: install directly ───

if [[ "${1:-}" == "--install" ]]; then
    echo "  Installing to /Applications..."
    cp -R "${BUILD_DIR}/MdfyQuickLook.app" "${INSTALL_DIR}/"
    echo "  Opening app to register extension..."
    open "${INSTALL_DIR}/MdfyQuickLook.app"
    echo "  Done! Try pressing Space on a .md file in Finder."
fi
