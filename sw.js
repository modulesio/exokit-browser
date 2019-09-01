const redirects = new Map();
const permanentRedirects = {
  /* 'https://assets-prod.reticulum.io/hubs/assets/js/vendor-64ef06ca9a87923873c0.js': './vendor-64ef06ca9a87923873c0.js',
  'https://assets-prod.reticulum.io/hubs/assets/js/hub-67b8da18c0bbd358dd06.js': './hub-67b8da18c0bbd358dd06.js',
  'https://assets-prod.reticulum.io/hubs/assets/js/engine-23a00b5ddcc04ff719cd.js': './engine-23a00b5ddcc04ff719cd.js',
  'https://uploads-prod.reticulum.io/files/128e210e-2f20-4dab-846d-a4282333e77b.bin': 'https://https-uploads--prod-reticulum-io.proxy.webaverse.com/files/128e210e-2f20-4dab-846d-a4282333e77b.bin', */
};

self.addEventListener('message', e => {
  const {data} = e;
  const {method} = data;
  if (method === 'redirect') {
    const {src, dst} = data;
    redirects.set(src, dst);
  }
  e.ports[0].postMessage({});
});

const _rewriteUrlToProxy = u => {
  /* if (!/^https:\/\//.test(u) || /^https:\/\/(?:.+?\.)?webaverse.com/.test(u)) {
    return u;
  } else { */
  if (/^[a-z]+:/.test(u) && u.indexOf(self.location.origin) !== 0) {
    const parsedUrl = new URL(u);
    parsedUrl.host = parsedUrl.host.replace(/-/g, '--');
    return 'https://' + parsedUrl.origin.replace(/^(https?):\/\//, '$1-').replace(/:([0-9]+)$/, '-$1').replace(/\./g, '-') + '.proxy.webaverse.com' + parsedUrl.pathname;
  } else {
    return u;
  }
  // }
};
const _getBaseUrl = u => {
  if (!/^(?:[a-z]+:|\/)/.test(u)) {
    u = '/' + u;
  }
  u = u.replace(/(\/)[^\/]+$/, '$1');
  return u;
};
const _insertAfter = (htmlString, match, s) => {
  return htmlString.slice(0, match.index) + match[0] + s + htmlString.slice();
};
const _insertBefore = (htmlString, match, s) => {
  return htmlString.slice(0, match.index) + s + match[0] + htmlString.slice();
};
const _addHtmlBase = (htmlString, u) => {
  let match;
  if (match = htmlString.match(/<[\s]*head[\s>]/i)) {
    return _insertAfter(htmlString, match, `<base href="${encodeURI(u)}" target="_blank">`);
  } else if (match = htmlString.match(/<[\s]*body[\s>]/i)) {
    return _insertBefore(htmlString, match, `<head><base href="${encodeURI(u)}" target="_blank"></head>`);
  } else {
    throw new Error(`no head or body tag: ${htmlString}`);
  }
};
const _proxyHtmlScripts = htmlString => htmlString.replace(/(src=")([^"]+)(")/g, (all, pre, src, post) => {
  if (/^[a-z]+:\/\//.test(src)) {
    return pre + location.origin + '/p/' + src + post;
  } else {
    return all;
  }
});
const _rewriteResText = (res, rewriteFn) => res.text()
  .then(text => new Response(rewriteFn(text), {
    status: res.status,
    headers: res.headers,
  }));
const _rewriteRes = res => {
  const {url, headers, originalUrl} = res;

  if (originalUrl && /^text\/html(?:;|$)/.test(headers.get('Content-Type'))) {
    return _rewriteResText(res, htmlString => {
      htmlString = _addHtmlBase(htmlString, _getBaseUrl(url));
      htmlString = _proxyHtmlScripts(htmlString);
      return htmlString;
    });
  } else if (/^https:\/\/assets-prod\.reticulum\.io\/hubs\/assets\/js\/hub-[a-zA-Z0-9]+\.js$/.test(originalUrl)) {
    return _rewriteResText(res, jsString => jsString.replace('window.top', 'window.self'));
  } else {
    return res;
  }
};

self.addEventListener('install', event => {
  // console.log('sw install');
  self.skipWaiting();

  /* event.waitUntil(
    caches.open(PRECACHE)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(self.skipWaiting())
  ); */
});
self.addEventListener('activate', event => {
  // console.log('sw activate');
  self.clients.claim();
});
self.addEventListener('fetch', event => {
  // console.log('got request', event.request.url);

  let u = event.request.url;
  const dst = redirects.get(u);
  if (dst) {
    u = dst;
    redirects.delete(event.request.url);
  }

  let match = u.match(/^[a-z]+:\/\/[a-zA-Z0-9\-\.:]+(.+)$/);
  if (match) {
    let match2;
    if (match2 = match[1].match(/^\/p\/(.+)$/)) {
      const originalUrl = match2[1];
      const permanentRedirect = permanentRedirects[originalUrl];
      if (permanentRedirect) {
        event.respondWith(
          fetch(permanentRedirect)
        );
      } else {
        const proxyUrl = _rewriteUrlToProxy(originalUrl);
        event.respondWith(
          fetch(proxyUrl).then(res => {
            res.originalUrl = originalUrl;
            return _rewriteRes(res);
          })
        );
      }
    } else if (match2 = match[1].match(/^\/d\/(.+)$/)) {
      event.respondWith(fetch(match2[1]));
    } else {
      if (event.request.url === u) {
        event.respondWith(fetch(event.request));
      } else {
        event.respondWith(
          fetch(u).then(res => {
            res.originalUrl = u;
            return _rewriteRes(res);
          })
        );
      }
    }
  } else {
    event.respondWith(new Response('invalid url', {
      status: 500,
    }));
  }
});