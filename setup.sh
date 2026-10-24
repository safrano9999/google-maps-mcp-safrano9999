#!/usr/bin/env bash
set -euo pipefail
cd -- "$(dirname -- "$(readlink -f -- "$0")")"
umask 077
sot=../SCRIPTS/safrano9999/config/config.sh
if [[ -f "$sot" && ! config.sh -ef "$sot" ]]; then ln -f -- "$sot" config.sh; fi
export CONFIG_CONTAINER_IMAGE=ghcr.io/safrano9999/google-maps-mcp-safrano9999:latest
./config.sh "$@"
printf '\nGoogle Maps MCP is configured. No images have been built or pulled.\n'
printf 'Baremetal: npm ci --ignore-scripts && npm run build && node --env-file=google-maps-mcp.env dist/index.js\n'
