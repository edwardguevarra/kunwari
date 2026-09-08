#!/usr/bin/env bash
# Re-downloads the brand marks used in js/icons.js and prints where they came from.
# The generator that turns these into js/icons.js lives in tools/build-icons.py.
set -e
cd "$(dirname "$0")"
mkdir -p logos && cd logos
G=https://cdn.jsdelivr.net/gh/gilbarbara/logos/logos
for n in chrome visual-studio-code linear-icon figma google-gmail; do
  curl -sfL "$G/$n.svg" -o "$n.svg" && echo "ok  $n.svg"
done
curl -sfL "https://cdn.jsdelivr.net/npm/simple-icons@13/icons/posthog.svg" -o posthog-mono.svg && echo "ok  posthog-mono.svg"
curl -sfL "https://ro.am/website/apple-touch-icon-180x180.png" -o roam-180.png && echo "ok  roam-180.png"
echo
echo "Now run: python3 ../build-icons.py"
