// Run the web app on this laptop against the live backend: `npm run web:local`.
//
// The live backend (api.karmaverse.earth) only allows https://karmaverse.earth as a
// browser origin, so a web app on http://localhost is blocked by CORS and login
// fails with "Please try again". This starts dev-cors-proxy.js (adds the missing
// CORS headers) and Expo web pointed at it, on port 8081 — the localhost port that
// is an Authorized JavaScript origin for Google Sign-In. USE ONLY FOR LOCAL DEV.
//
// Carbon footprint is ON by default, answered by a local test mock because the
// live backend doesn't have its routes yet (scripts/dev-carbon-mock.js):
//   npm run web:local                 carbon on, local mock (placeholder numbers)
//   CARBON=live npm run web:local     carbon on, real backend routes (once deployed)
//   CARBON=off npm run web:local      carbon off ("Coming soon!")

const { spawn } = require('child_process');
const path = require('path');

const root = path.resolve(__dirname, '..');
const PROXY_URL = 'http://localhost:8899';

const run = (cmd, args, env) =>
  spawn(cmd, args, { cwd: root, stdio: 'inherit', shell: process.platform === 'win32', env: { ...process.env, ...env } });

const carbon = (process.env.CARBON || 'mock').toLowerCase();
const proxy = run('node', ['dev-cors-proxy.js'], { CARBON_MOCK: carbon === 'off' || carbon === 'live' ? '0' : '1' });
const web = run('npx', ['expo', 'start', '--web', '--port', '8081', '-c'], {
  EXPO_PUBLIC_API_URL: PROXY_URL,
  ...(carbon === 'off' ? {} : { EXPO_PUBLIC_CARBON_API: 'true' }),
});

// Stop both together.
const stop = () => { proxy.kill(); web.kill(); process.exit(); };
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
web.on('exit', stop);
proxy.on('exit', (code) => { if (code) console.error(`dev-cors-proxy exited (${code}) — is port 8899 already in use?`); });
