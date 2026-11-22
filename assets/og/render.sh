#!/bin/sh
# Renders the link preview images into static/ with headless Chrome.
#   CHROME=/path/to/chrome assets/og/render.sh
set -e
cd "$(dirname "$0")"
CHROME="${CHROME:-$(ls -d ~/Library/Caches/ms-playwright/chromium_headless_shell-*/chrome-mac/headless_shell 2>/dev/null | tail -1)}"
[ -x "$CHROME" ] || { echo "Set CHROME to a Chrome or chrome-headless-shell binary"; exit 1; }

render() { # html, width, height, output
	"$CHROME" --headless --hide-scrollbars --force-device-scale-factor=1 \
		--allow-file-access-from-files --virtual-time-budget=3000 \
		--window-size="$2,$3" --screenshot="$4" "file://$PWD/$1" 2>/dev/null
}
# WhatsApp ignores preview images over about 300 KB, so the big one is saved as a JPEG.
tmp="$(mktemp -d)"
render og-image.html 1200 630 "$tmp/og.png"
sips -s format jpeg -s formatOptions 85 "$tmp/og.png" --out ../../static/og.jpg >/dev/null
rm -r "$tmp"
render apple-touch-icon.html 180 180 ../../static/apple-touch-icon.png
ls -l ../../static/og.jpg ../../static/apple-touch-icon.png
