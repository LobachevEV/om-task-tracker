#!/bin/sh
set -e

cat > /usr/share/nginx/html/config.js <<EOF
window.__APP_CONFIG__ = { apiBaseUrl: "${API_BASE_URL:-}" };
EOF

exec nginx -g 'daemon off;'
