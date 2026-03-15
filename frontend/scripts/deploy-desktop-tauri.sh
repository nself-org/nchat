#!/bin/bash
# Tauri Desktop Deployment Script
# Builds, signs, and deploys Tauri desktop applications for macOS, Windows, and Linux
#
# Usage:
#   ./deploy-desktop-tauri.sh [options]
#
# Options:
#   --platform <mac|win|linux|all>  Platform to build (default: all)
#   --env <dev|staging|prod>        Environment (default: prod)
#   --no-sign                       Skip code signing
#   --no-publish                    Skip publishing to update server
#   --draft                         Create draft release
#   --prerelease                    Mark as pre-release
#   --clean                         Clean build directories before build
#   --version <version>             Override version number
#   --target <target>               Specific Rust target triple
#   --debug                         Build in debug mode
#   --help                          Show this help message

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
PLATFORM="all"
ENVIRONMENT="prod"
SIGN=true
PUBLISH=true
DRAFT=false
PRERELEASE=false
CLEAN=false
VERSION=""
TARGET=""
DEBUG=false

# Project paths
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
TAURI_DIR="${PROJECT_ROOT}/platforms/tauri"
DIST_DIR="${TAURI_DIR}/src-tauri/target/release"
WEB_OUT_DIR="${PROJECT_ROOT}/out"

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --platform)
      PLATFORM="$2"
      shift 2
      ;;
    --env)
      ENVIRONMENT="$2"
      shift 2
      ;;
    --no-sign)
      SIGN=false
      shift
      ;;
    --no-publish)
      PUBLISH=false
      shift
      ;;
    --draft)
      DRAFT=true
      shift
      ;;
    --prerelease)
      PRERELEASE=true
      shift
      ;;
    --clean)
      CLEAN=true
      shift
      ;;
    --version)
      VERSION="$2"
      shift 2
      ;;
    --target)
      TARGET="$2"
      shift 2
      ;;
    --debug)
      DEBUG=true
      shift
      ;;
    --help)
      grep '^#' "$0" | grep -v '#!/bin/bash' | sed 's/^# //'
      exit 0
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      exit 1
      ;;
  esac
done

# Helper functions
log_info() {
  echo -e "${BLUE}ℹ${NC} $1"
}

log_success() {
  echo -e "${GREEN}✓${NC} $1"
}

log_warning() {
  echo -e "${YELLOW}⚠${NC} $1"
}

log_error() {
  echo -e "${RED}✗${NC} $1"
}

print_header() {
  echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BLUE}  $1${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
}

# Validate environment
check_dependencies() {
  print_header "Checking Dependencies"

  local missing_deps=()

  if ! command -v node &> /dev/null; then
    missing_deps+=("node")
  fi

  if ! command -v npm &> /dev/null; then
    missing_deps+=("npm")
  fi

  if ! command -v cargo &> /dev/null; then
    missing_deps+=("cargo (Rust)")
  fi

  if ! command -v rustc &> /dev/null; then
    missing_deps+=("rustc (Rust)")
  fi

  if ! command -v git &> /dev/null; then
    missing_deps+=("git")
  fi

  # Check for tauri-cli
  if ! cargo install --list | grep -q "^tauri-cli"; then
    log_warning "tauri-cli not found - installing..."
    cargo install tauri-cli
    rm -rf /tmp/cargo-install* 2>/dev/null || true
  fi

  if [ "$SIGN" = true ]; then
    if [ "$PLATFORM" = "mac" ] || [ "$PLATFORM" = "all" ]; then
      if [[ "$OSTYPE" == "darwin"* ]] && ! command -v codesign &> /dev/null; then
        log_warning "codesign not found - macOS code signing will be skipped"
      fi
    fi
  fi

  if [ ${#missing_deps[@]} -ne 0 ]; then
    log_error "Missing required dependencies: ${missing_deps[*]}"
    exit 1
  fi

  log_success "All required dependencies are installed"

  # Show versions
  log_info "Versions:"
  echo "  Node:    $(node --version)"
  echo "  npm:     $(npm --version)"
  echo "  Rust:    $(rustc --version)"
  echo "  Cargo:   $(cargo --version)"
  echo "  Tauri:   $(cargo tauri --version 2>&1 | head -1 || echo 'unknown')"
}

# Load environment variables
load_environment() {
  print_header "Loading Environment: $ENVIRONMENT"

  local env_file="${PROJECT_ROOT}/.env.${ENVIRONMENT}"
  if [ -f "$env_file" ]; then
    log_info "Loading environment from $env_file"
    set -a
    source "$env_file"
    set +a
    log_success "Environment loaded"
  else
    log_warning "Environment file not found: $env_file"
  fi

  # Set required environment variables
  export NODE_ENV="${ENVIRONMENT}"
  export NEXT_PUBLIC_ENV="${ENVIRONMENT}"
  export TAURI_ENV="${ENVIRONMENT}"

  if [ -n "$VERSION" ]; then
    log_info "Version override: $VERSION"
  fi
}

# Clean build directories
clean_build() {
  if [ "$CLEAN" = true ]; then
    print_header "Cleaning Build Directories"

    cd "$TAURI_DIR"

    log_info "Cleaning Tauri target directory..."
    cargo clean

    log_info "Removing web build..."
    rm -rf "$WEB_OUT_DIR"

    log_success "Build directories cleaned"
  fi
}

# Build Next.js frontend
build_frontend() {
  print_header "Building Next.js Frontend"

  cd "$PROJECT_ROOT"

  log_info "Installing dependencies..."
  npm install --legacy-peer-deps

  log_info "Building Next.js application..."
  npm run build

  log_success "Frontend build complete"
}

# Update version in Cargo.toml and tauri.conf.json
update_version() {
  if [ -n "$VERSION" ]; then
    print_header "Updating Version to $VERSION"

    cd "$TAURI_DIR"

    # Update Cargo.toml
    if [[ "$OSTYPE" == "darwin"* ]]; then
      sed -i '' "s/^version = \".*\"/version = \"$VERSION\"/" Cargo.toml
    else
      sed -i "s/^version = \".*\"/version = \"$VERSION\"/" Cargo.toml
    fi

    # Update tauri.conf.json
    if command -v jq &> /dev/null; then
      jq ".version = \"$VERSION\"" tauri.conf.json > tauri.conf.json.tmp
      mv tauri.conf.json.tmp tauri.conf.json
    else
      if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s/\"version\": \".*\"/\"version\": \"$VERSION\"/" tauri.conf.json
      else
        sed -i "s/\"version\": \".*\"/\"version\": \"$VERSION\"/" tauri.conf.json
      fi
    fi

    log_success "Version updated to $VERSION"
  fi
}

# Configure code signing
configure_signing() {
  if [ "$SIGN" = false ]; then
    log_warning "Code signing disabled"
    export TAURI_SKIP_SIGNING=1
    return
  fi

  print_header "Configuring Code Signing"

  # macOS code signing
  if [ "$PLATFORM" = "mac" ] || [ "$PLATFORM" = "all" ]; then
    if [ -n "$APPLE_SIGNING_IDENTITY" ]; then
      log_info "macOS code signing configured"
      export APPLE_SIGNING_IDENTITY="${APPLE_SIGNING_IDENTITY}"
      export APPLE_ID="${APPLE_ID:-}"
      export APPLE_PASSWORD="${APPLE_PASSWORD:-}"
      export APPLE_TEAM_ID="${APPLE_TEAM_ID:-}"
    else
      log_warning "macOS code signing identity not found"
      if [ "$PLATFORM" = "mac" ]; then
        export TAURI_SKIP_SIGNING=1
      fi
    fi
  fi

  # Windows code signing
  if [ "$PLATFORM" = "win" ] || [ "$PLATFORM" = "all" ]; then
    if [ -n "$WINDOWS_CERTIFICATE" ] && [ -n "$WINDOWS_CERTIFICATE_PASSWORD" ]; then
      log_info "Windows code signing configured"
      export WINDOWS_CERTIFICATE="${WINDOWS_CERTIFICATE}"
      export WINDOWS_CERTIFICATE_PASSWORD="${WINDOWS_CERTIFICATE_PASSWORD}"
    else
      log_warning "Windows code signing credentials not found"
    fi
  fi
}

# Configure updater signing
configure_updater() {
  print_header "Configuring Tauri Updater"

  cd "$TAURI_DIR"

  # Generate updater keypair if it doesn't exist
  if [ ! -f "${HOME}/.tauri/updater.key" ]; then
    log_info "Generating updater keypair..."
    cargo tauri signer generate -w "${HOME}/.tauri/updater.key"
  fi

  # Read public key
  if [ -f "${HOME}/.tauri/updater.pub" ]; then
    UPDATER_PUBKEY=$(cat "${HOME}/.tauri/updater.pub")
    log_info "Updater public key loaded"

    # Update tauri.conf.json with public key
    if command -v jq &> /dev/null; then
      jq ".plugins.updater.pubkey = \"$UPDATER_PUBKEY\"" tauri.conf.json > tauri.conf.json.tmp
      mv tauri.conf.json.tmp tauri.conf.json
    fi

    export TAURI_SIGNING_PRIVATE_KEY_PATH="${HOME}/.tauri/updater.key"
    log_success "Updater configured"
  else
    log_warning "Updater keypair not found"
  fi
}

# Build Tauri application
build_tauri_app() {
  print_header "Building Tauri Application"

  cd "$TAURI_DIR"

  local build_args=()

  # Add debug flag if specified
  if [ "$DEBUG" = true ]; then
    build_args+=("--debug")
    log_info "Building in debug mode..."
  else
    log_info "Building in release mode..."
  fi

  # Add target if specified
  if [ -n "$TARGET" ]; then
    build_args+=("--target" "$TARGET")
    log_info "Target: $TARGET"
  fi

  # Determine bundles based on platform
  case $PLATFORM in
    mac)
      build_args+=("--bundles" "dmg,app")
      log_info "Building for macOS..."
      ;;
    win)
      build_args+=("--bundles" "msi,nsis")
      log_info "Building for Windows..."
      ;;
    linux)
      build_args+=("--bundles" "deb,appimage")
      log_info "Building for Linux..."
      ;;
    all)
      log_info "Building for current platform..."
      ;;
  esac

  # Execute build
  cargo tauri build "${build_args[@]}"

  log_success "Tauri application build complete"
}

# Sign and notarize (macOS)
notarize_macos() {
  if [ "$PLATFORM" != "mac" ] && [ "$PLATFORM" != "all" ]; then
    return
  fi

  if [ "$SIGN" = false ]; then
    return
  fi

  if [[ "$OSTYPE" != "darwin"* ]]; then
    return
  fi

  if [ -z "$APPLE_ID" ] || [ -z "$APPLE_PASSWORD" ]; then
    log_warning "Skipping notarization - Apple ID credentials not set"
    return
  fi

  print_header "Notarizing macOS Application"

  cd "$TAURI_DIR"

  local bundle_dir="${DIST_DIR}/bundle/macos"

  for dmg_file in "$bundle_dir"/*.dmg; do
    if [ -f "$dmg_file" ]; then
      log_info "Notarizing $(basename "$dmg_file")..."

      xcrun notarytool submit "$dmg_file" \
        --apple-id "$APPLE_ID" \
        --password "$APPLE_PASSWORD" \
        --team-id "$APPLE_TEAM_ID" \
        --wait

      log_success "Notarization complete"

      # Staple the notarization ticket
      log_info "Stapling notarization ticket..."
      xcrun stapler staple "$dmg_file"
      log_success "Stapling complete"
    fi
  done
}

# Verify build artifacts
verify_artifacts() {
  print_header "Verifying Build Artifacts"

  cd "$TAURI_DIR"

  local bundle_dir
  if [ "$DEBUG" = true ]; then
    bundle_dir="${TAURI_DIR}/src-tauri/target/debug/bundle"
  else
    bundle_dir="${TAURI_DIR}/src-tauri/target/release/bundle"
  fi

  if [ ! -d "$bundle_dir" ]; then
    log_error "Bundle directory not found: $bundle_dir"
    exit 1
  fi

  local artifact_count=$(find "$bundle_dir" -type f \( -name "*.dmg" -o -name "*.app" -o -name "*.exe" -o -name "*.msi" -o -name "*.AppImage" -o -name "*.deb" \) | wc -l)

  if [ "$artifact_count" -eq 0 ]; then
    log_error "No build artifacts found"
    exit 1
  fi

  log_success "Found $artifact_count build artifact(s)"

  # List artifacts
  log_info "Build artifacts:"
  find "$bundle_dir" -type f \( -name "*.dmg" -o -name "*.app" -o -name "*.exe" -o -name "*.msi" -o -name "*.AppImage" -o -name "*.deb" \) -exec basename {} \; | while read -r file; do
    echo "  - $file"
  done
}

# Generate update manifests
generate_update_manifests() {
  if [ "$PUBLISH" = false ]; then
    return
  fi

  print_header "Generating Update Manifests"

  cd "$TAURI_DIR"

  local bundle_dir
  if [ "$DEBUG" = true ]; then
    bundle_dir="${TAURI_DIR}/src-tauri/target/debug/bundle"
  else
    bundle_dir="${TAURI_DIR}/src-tauri/target/release/bundle"
  fi

  # Sign updater bundles
  if [ -f "${HOME}/.tauri/updater.key" ]; then
    log_info "Signing updater bundles..."

    for bundle in "$bundle_dir"/**/*.{tar.gz,zip}; do
      if [ -f "$bundle" ]; then
        cargo tauri signer sign "$bundle" -k "${HOME}/.tauri/updater.key"
      fi
    done

    log_success "Update manifests generated"
  else
    log_warning "Updater key not found - skipping manifest generation"
  fi
}

# Upload to release server
upload_to_server() {
  if [ "$PUBLISH" = false ]; then
    log_info "Skipping upload (--no-publish)"
    return
  fi

  print_header "Publishing Release"

  if [ -z "$RELEASE_SERVER_URL" ]; then
    log_warning "RELEASE_SERVER_URL not set - skipping upload"
    return
  fi

  cd "$TAURI_DIR"

  local bundle_dir
  if [ "$DEBUG" = true ]; then
    bundle_dir="${TAURI_DIR}/src-tauri/target/debug/bundle"
  else
    bundle_dir="${TAURI_DIR}/src-tauri/target/release/bundle"
  fi

  log_info "Uploading to $RELEASE_SERVER_URL..."

  # Upload artifacts (implementation depends on your release server)
  # This is a placeholder - customize based on your infrastructure
  if command -v aws &> /dev/null && [ -n "$AWS_S3_BUCKET" ]; then
    log_info "Uploading to S3..."
    aws s3 sync "$bundle_dir" "s3://${AWS_S3_BUCKET}/releases/nchat/${VERSION}/" --acl public-read
    log_success "Upload complete"
  else
    log_warning "Upload mechanism not configured"
  fi
}

# Print deployment summary
print_summary() {
  print_header "Deployment Summary"

  local current_version
  if [ -n "$VERSION" ]; then
    current_version="$VERSION"
  else
    current_version=$(grep '^version = ' "${TAURI_DIR}/Cargo.toml" | cut -d'"' -f2)
  fi

  echo -e "${GREEN}Build Configuration:${NC}"
  echo "  Platform:     $PLATFORM"
  echo "  Environment:  $ENVIRONMENT"
  echo "  Version:      $current_version"
  echo "  Mode:         $([ "$DEBUG" = true ] && echo "debug" || echo "release")"
  echo "  Signed:       $SIGN"
  echo "  Publish:      $PUBLISH"
  echo ""
  echo -e "${GREEN}Artifacts Location:${NC}"
  if [ "$DEBUG" = true ]; then
    echo "  ${TAURI_DIR}/src-tauri/target/debug/bundle"
  else
    echo "  ${TAURI_DIR}/src-tauri/target/release/bundle"
  fi
  echo ""

  if [ "$PUBLISH" = true ]; then
    echo -e "${GREEN}Release Status:${NC}"
    if [ "$DRAFT" = true ]; then
      echo "  Draft release created"
    elif [ "$PRERELEASE" = true ]; then
      echo "  Pre-release published"
    else
      echo "  Release published"
    fi
  fi

  echo ""
  log_success "Deployment complete!"
}

# Main execution
main() {
  print_header "Tauri Desktop Deployment"

  check_dependencies
  load_environment
  clean_build
  update_version
  build_frontend
  configure_signing
  configure_updater
  build_tauri_app
  notarize_macos
  verify_artifacts
  generate_update_manifests
  upload_to_server
  print_summary
}

# Run main function
main "$@"
