// Source of truth: SCRIPTS/githubactions. Generated copies are overwritten.
// Run only on a GitHub Actions runner. No external API requests.
import assert from 'node:assert/strict';
const sdk = '/usr/local/lib/node_modules/supergateway/node_modules/@modelcontextprotocol/sdk/dist/esm';
const { Client } = await import(`${sdk}/client/index.js`);
const { StreamableHTTPClientTransport } = await import(`${sdk}/client/streamableHttp.js`);
const expected = ["maps_elevation", "maps_embed_url", "maps_static_map", "maps_street_view", "places_address_validation", "places_autocomplete", "places_details", "places_geocode", "places_nearby_search", "places_photos", "places_text_search", "places_timezone", "routes_compute", "routes_matrix", "routes_optimize"];
async function check(port) {
  const client = new Client({ name: 'maps-http-smoke', version: '1' });
  const transport = new StreamableHTTPClientTransport(new URL(`http://127.0.0.1:${port}/mcp`));
  try {
    await client.connect(transport);
    assert(transport.sessionId, 'Stateful HTTP must return a session ID');
    const { tools } = await client.listTools();
    assert.deepEqual(tools.map(tool => tool.name).sort(), expected);
    const route = tools.find(tool => tool.name === 'routes_compute');
    assert(route.inputSchema.properties.origin);
    assert(route.inputSchema.properties.destination);
    await transport.terminateSession();
  } finally {
    await client.close();
  }
}
await check(8000);
await check(8000);
console.log('HTTP initialization, independent sessions and all 15 tool schemas passed.');
