import http from 'node:http';
import fs from 'node:fs';
const feed = fs.readFileSync(new URL('../bridge/sample-feed.json', import.meta.url), 'utf8');
http.createServer((req, res) => {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'x-arcane-key',
    'Content-Type': 'application/json',
  };
  if (req.method === 'OPTIONS') { res.writeHead(204, cors); return res.end(); }
  // Stands in for a shop that is deployed but not configured yet.
  if (req.url.startsWith('/unconfigured')) {
    res.writeHead(503, cors);
    return res.end(JSON.stringify({
      error: 'feed_disabled',
      message: 'ARCANE_FEED_KEY is not set on this deployment, so the feed is switched off.',
    }));
  }
  if (req.headers['x-arcane-key'] !== 'test-key') {
    res.writeHead(401, cors); return res.end('{"error":"unauthorised"}');
  }
  res.writeHead(200, cors); res.end(feed);
}).listen(4500, () => console.log('feed on 4500'));
