// Runner-only request tests: replace fetch so no Google requests or charges occur.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

if (process.argv[2] === 'child') {
  const { registerRoutesTools } = await import('../dist/tools/routes.js');
  const handlers = new Map();
  registerRoutesTools({ registerTool: (name, schema, handler) => handlers.set(name, handler) });
  let request;
  globalThis.fetch = async (url, init) => {
    request = { url, body: JSON.parse(init.body), mask: init.headers['X-Goog-FieldMask'] };
    return new Response('{}', { status: 200 });
  };
  const expected = process.env.GOOGLE_MAPS_ROUTING_PREFERENCE || 'TRAFFIC_AWARE_OPTIMAL';
  for (const mode of ['DRIVE', 'TWO_WHEELER', 'WALK', 'BICYCLE', 'TRANSIT']) {
    request = undefined;
    const result = await handlers.get('routes_compute')({
      origin: '48.2082,16.3738', destination: '48.185,16.383', travel_mode: mode,
    });
    assert(!result.isError, JSON.stringify(result));
    assert.equal(request.body.routingPreference,
      ['DRIVE', 'TWO_WHEELER'].includes(mode) ? expected : undefined);
    assert.equal(request.body.departureTime, undefined, 'No departure time lets Google use now');
    assert(request.mask.includes('routes.staticDuration'));
  }
  for (const mode of ['DRIVE', 'WALK', 'BICYCLE', 'TRANSIT']) {
    request = undefined;
    const result = await handlers.get('routes_matrix')({
      origins: ['48.2082,16.3738'], destinations: ['48.185,16.383'], travel_mode: mode,
    });
    assert(!result.isError, JSON.stringify(result));
    assert.equal(request.body.routingPreference, mode === 'DRIVE' ? expected : undefined);
    assert(request.mask.split(',').includes('staticDuration'));
  }
} else {
  for (const preference of [undefined, '', 'TRAFFIC_AWARE_OPTIMAL', 'TRAFFIC_AWARE', 'TRAFFIC_UNAWARE']) {
    const env = { ...process.env, GOOGLE_MAPS_API_KEY: 'ci-placeholder' };
    delete env.GOOGLE_MAPS_ROUTING_PREFERENCE;
    if (preference !== undefined) env.GOOGLE_MAPS_ROUTING_PREFERENCE = preference;
    const result = spawnSync(process.execPath, [fileURLToPath(import.meta.url), 'child'], {
      env, encoding: 'utf8', timeout: 10000,
    });
    assert.equal(result.status, 0, result.stderr || result.error?.message);
  }
  const invalid = spawnSync(process.execPath, [fileURLToPath(import.meta.url), 'child'], {
    env: { ...process.env, GOOGLE_MAPS_API_KEY: 'ci-placeholder', GOOGLE_MAPS_ROUTING_PREFERENCE: 'invalid' },
    encoding: 'utf8', timeout: 10000,
  });
  assert.notEqual(invalid.status, 0, 'Invalid routing preference must be rejected');
  assert(invalid.stderr.includes('ZodError'));
  console.log('Passed routing defaults, overrides, travel modes, matrix requests and invalid configuration.');
}
