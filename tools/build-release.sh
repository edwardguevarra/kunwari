#!/usr/bin/env bash
# Cross-compiles the self-contained binaries and packages them for a release.
# Needs a Go toolchain on PATH (or set GO=/path/to/go). Nothing else.
set -euo pipefail
cd "$(dirname "$0")/.."

GO="${GO:-go}"
VERSION="${1:-$(git describe --tags --always 2>/dev/null || echo dev)}"
DIST=dist
rm -rf "$DIST" && mkdir -p "$DIST"

python3 tools/build-single.py "$DIST/kunwari.html"

targets=(
  "darwin arm64   macOS (Apple silicon)"
  "darwin amd64   macOS (Intel)"
  "linux  amd64   Linux (x86-64)"
  "linux  arm64   Linux (arm64)"
  "windows amd64  Windows (x86-64)"
  "windows arm64  Windows (arm64)"
)

for t in "${targets[@]}"; do
  read -r os arch _ <<<"$t"
  name="kunwari"
  [ "$os" = windows ] && name="kunwari.exe"
  out="$DIST/$os-$arch"
  mkdir -p "$out"
  echo "building $os/$arch"
  CGO_ENABLED=0 GOOS="$os" GOARCH="$arch" "$GO" build \
    -trimpath -ldflags "-s -w" -o "$out/$name" .
  cp README.md LICENSE "$out/"
  base="kunwari_${VERSION}_${os}_${arch}"
  if [ "$os" = windows ]; then
    (cd "$out" && zip -q "../$base.zip" ./*)
  else
    tar -czf "$DIST/$base.tar.gz" -C "$out" .
  fi
  rm -rf "$out"
done

(cd "$DIST" && shasum -a 256 ./* > checksums.txt 2>/dev/null || true)
ls -lh "$DIST"
