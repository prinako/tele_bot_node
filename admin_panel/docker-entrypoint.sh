#!/bin/sh

cat > /usr/share/nginx/html/config.js <<EOF
window.APP_CONFIG = {
  BACKEND_URL: "${VITE_BACKEND_URL:-}"
};
EOF

exec nginx -g "daemon off;"