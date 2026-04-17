#!/bin/bash
# =========================================================
# mdfy QuickLook Extension — Build Script
#
# Builds the host app + QuickLook preview extension using
# xcodebuild. Requires Xcode with a valid signing identity.
# =========================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BUILD_DIR="${SCRIPT_DIR}/build"
DERIVED_DATA="${BUILD_DIR}/DerivedData"

echo ""
echo "  mdfy QuickLook Extension — Build"
echo "  ================================="
echo ""

# ─── Check prerequisites ───

if ! command -v xcodebuild &> /dev/null; then
    echo "  Error: xcodebuild not found."
    echo "  Please install Xcode from the App Store or run:"
    echo "    xcode-select --install"
    exit 1
fi

# ─── Clean previous build ───

echo "  [1/3] Cleaning previous build..."
rm -rf "${BUILD_DIR}"
mkdir -p "${BUILD_DIR}"

# ─── Build with proper code signing ───

echo "  [2/3] Building MdfyQuickLook.app + QuickLook extension..."
cd "${SCRIPT_DIR}"

xcodebuild \
    -project MdfyQuickLook.xcodeproj \
    -scheme MdfyQuickLook \
    -configuration Release \
    -derivedDataPath "${DERIVED_DATA}" \
    -arch "$(uname -m)" \
    ONLY_ACTIVE_ARCH=YES \
    DEVELOPMENT_TEAM=W7NL89YGSD \
    CODE_SIGN_IDENTITY="Apple Development" \
    CODE_SIGN_STYLE=Automatic \
    2>&1 | tail -5

BUILD_APP="${DERIVED_DATA}/Build/Products/Release/MdfyQuickLook.app"

if [ ! -d "${BUILD_APP}" ]; then
    echo ""
    echo "  Build failed. Try opening MdfyQuickLook.xcodeproj in Xcode instead."
    exit 1
fi

# ─── Copy to build output ───

echo "  [3/3] Copying to build directory..."
cp -R "${BUILD_APP}" "${BUILD_DIR}/MdfyQuickLook.app"

echo ""
echo "  Build complete!"
echo ""
echo "  Output: ${BUILD_DIR}/MdfyQuickLook.app"
echo ""
echo "  To install:"
echo "    cp -R '${BUILD_DIR}/MdfyQuickLook.app' ~/Applications/"
echo "    open ~/Applications/MdfyQuickLook.app"
echo ""

# ─── Optional: install directly ───

if [[ "${1:-}" == "--install" ]]; then
    INSTALL_DIR="${HOME}/Applications"
    mkdir -p "${INSTALL_DIR}"
    echo "  Installing to ~/Applications..."
    rm -rf "${INSTALL_DIR}/MdfyQuickLook.app"
    cp -R "${BUILD_DIR}/MdfyQuickLook.app" "${INSTALL_DIR}/"
    echo "  Opening app to register extension..."
    open "${INSTALL_DIR}/MdfyQuickLook.app"
    echo "  Done! Enable the extension in System Settings > Extensions > Quick Look."
fi
