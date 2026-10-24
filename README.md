# Google Maps MCP — Safrano9999

Fork of [apurvaumredkar/google-maps-mcp](https://github.com/apurvaumredkar/google-maps-mcp). Provides 15 Google Maps Platform tools for routes, places, geocoding and maps. The original GPL-3.0-only license and attribution are retained.

The container uses the **original `supercorp/supergateway:4.1.0` image as its runtime base**, with Node.js 26.12.1 replacing its older Node runtime. Supergateway exposes this fork's stdio server through one stateful Streamable HTTP endpoint. Baremetal installations can use the native HTTP server or stdio directly.

## Configuration

Run `./setup.sh` (or `./config.sh`) to configure the named environment file and deployment settings using the shared default and New/Skip logic. `env.example` defines the required `GOOGLE_MAPS_API_KEY` and optional traffic routing preference; `container.example` defines the image, optional host publication and repeatable `ADDITIONAL_LINE` Quadlet settings. Leave the published port blank for network-only access, and add `Network=core` as an additional line. Alternatively, copy `env.example` to `.env` and set `GOOGLE_MAPS_API_KEY`. This is the only required setting. Secrets are excluded from Git and never embedded in the image. No database or persistent volume is needed.

Enable the Google APIs required by the tools you use in the key's Google Cloud project. Google Cloud billing and API-specific quotas apply. The optional `routes_optimize` tool additionally needs `GOOGLE_CLOUD_PROJECT_ID` and the Route Optimization API; ordinary routing does not need that extra variable.

With the default container name, the shared configurator writes `google-maps-mcp.env`, `google-maps-mcp_config.conf`, `google-maps-mcp_container.conf` and the generated Quadlet/Compose files. For baremetal, load the generated environment using `node --env-file=google-maps-mcp.env dist/index.js`, or use the manual `.env` setup below.

## Traffic-aware routing

`GOOGLE_MAPS_ROUTING_PREFERENCE=TRAFFIC_AWARE_OPTIMAL` is the optional default preset. If unset or empty, the server also uses `TRAFFIC_AWARE_OPTIMAL`. Alternatives are `TRAFFIC_AWARE` and `TRAFFIC_UNAWARE`; other values are rejected at startup.

The preference is sent for driving and two-wheeler routes, and driving route matrices. It is omitted for walking, cycling and transit. With no departure time supplied, Google uses the current time. A future departure time combines live and historical traffic predictions. Responses include `duration` and `staticDuration` to distinguish the traffic-aware ETA from the baseline.

Traffic-aware requests can be billed differently by Google. With `TRAFFIC_AWARE_OPTIMAL`, Google limits a matrix to 100 origin/destination pairs. See [Google's traffic documentation](https://developers.google.com/maps/documentation/routes/config_trade_offs).

The directly hosted Google Maps Grounding Lite MCP does not expose this routing setting; use this fork's `routes_compute` or `routes_matrix` tool for configurable traffic-aware routing.

## Container

Image: `ghcr.io/safrano9999/google-maps-mcp-safrano9999:latest` (GHCR package).

After the image has been downloaded through Smart1, run it on the internal Podman network:

```sh
podman run --pull=never -d --name google-maps-mcp --network core \
  --env-file google-maps-mcp.env \
  ghcr.io/safrano9999/google-maps-mcp-safrano9999:latest
```

- MCP: `http://google-maps-mcp:8000/mcp`
- Health: `http://google-maps-mcp:8000/health`

No host port is required for clients on the same container network. This endpoint has no inbound authentication; access is provided by the surrounding private network and authenticated gateway, such as LiteLLM. The upstream native HTTP `MCP_AUTH_TOKEN` setting does not apply to Supergateway.

## Baremetal

Use Node.js 26.12.1 or newer. No Supergateway installation is required for the native HTTP server:

```sh
git clone https://github.com/safrano9999/google-maps-mcp-safrano9999.git
cd google-maps-mcp-safrano9999
cp env.example .env
# Set GOOGLE_MAPS_API_KEY in .env.
npm ci --ignore-scripts
npm run build
npm start
```

The native endpoint is `http://localhost:8000/mcp`, with `/health` for health checks. `.env` is loaded by Node; injected environment variables take precedence. The internal MCP port is fixed at 8000. The native server also supports optional `MCP_AUTH_TOKEN`. With a native token configured, clients must send it in `X-Api-Key`.

For a client that launches a stdio process, use `npm run --silent start:stdio` from the repository directory, or `node --env-file-if-exists=.env dist/stdio.js`. Keep stdout reserved for MCP messages.

## Tools and Google APIs

| Tools | Google API |
| --- | --- |
| `routes_compute`, `routes_matrix` | Routes API |
| `routes_optimize` | Route Optimization API; additional project ID required |
| `places_geocode` | Geocoding API |
| `places_details`, `places_text_search`, `places_nearby_search`, `places_autocomplete`, `places_photos` | Places API (New) |
| `places_address_validation` | Address Validation API |
| `places_timezone` | Time Zone API |
| `maps_static_map` | Maps Static API |
| `maps_embed_url` | Maps Embed API |
| `maps_elevation` | Elevation API |
| `maps_street_view` | Street View Static API |

## Build and releases

Builds run exclusively on GitHub-hosted Actions runners. Workflow and Containerfile sources live in `SCRIPTS/githubactions/google-maps-mcp-safrano9999`; `.github/` contains generated copies. The Containerfile clones this fork at the exact workflow commit, compiles it in a Node builder, and copies the result into the original Supergateway base.

The runner checks the runtime versions, health endpoint, all 15 tool schemas and independent HTTP sessions without making Google API calls. Only a tested candidate is published as `YYYY.M.N` and `latest`. Runtime publication does not test every Google API or grant permissions in LiteLLM.

The local `config.sh` is a hardlink to `SCRIPTS/safrano9999/config/config.sh`. A Git checkout contains the same shared script as a regular file; `setup.sh` restores the hardlink when the SCRIPTS checkout is available.
