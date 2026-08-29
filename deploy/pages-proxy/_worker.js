const upstreamOrigin = 'https://develop-period-newbie-serving.trycloudflare.com';

function upstreamUrlFor(request) {
  const incoming = new URL(request.url);
  const upstream = new URL(upstreamOrigin);
  upstream.pathname = incoming.pathname;
  upstream.search = incoming.search;
  return { incoming, upstream };
}

function rewriteLocation(value, incoming) {
  if (!value) return null;
  try {
    const location = new URL(value, upstreamOrigin);
    if (location.origin !== upstreamOrigin) return value;
    location.protocol = incoming.protocol;
    location.host = incoming.host;
    return location.toString();
  } catch {
    return value;
  }
}

const worker = {
  async fetch(request) {
    const { incoming, upstream } = upstreamUrlFor(request);
    const headers = new Headers(request.headers);
    headers.set('x-forwarded-host', incoming.host);
    headers.set('x-forwarded-proto', 'https');

    const init = {
      method: request.method,
      headers,
      redirect: 'manual',
    };
    if (request.method !== 'GET' && request.method !== 'HEAD') init.body = request.body;

    try {
      const upstreamResponse = await fetch(new Request(upstream.toString(), init));
      const response = new Response(upstreamResponse.body, upstreamResponse);
      const location = rewriteLocation(response.headers.get('location'), incoming);
      if (location) response.headers.set('location', location);
      response.headers.set('x-chencheng-edge', 'pages');
      return response;
    } catch {
      return new Response('服务暂时不可用，请稍后刷新重试。', {
        status: 503,
        headers: {
          'cache-control': 'no-store',
          'content-type': 'text/plain; charset=utf-8',
          'retry-after': '30',
        },
      });
    }
  },
};

export default worker;
