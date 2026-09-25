const CACHE_NAME="english-master-v8.0.0";
const APP_SHELL=["./","./index.html","./app.js","./styles.css","./manifest.json"];

self.addEventListener("install",event=>{
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache=>cache.addAll(APP_SHELL))
      .then(()=>self.skipWaiting())
  );
});

self.addEventListener("activate",event=>{
  event.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k))))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener("fetch",event=>{
  const url=new URL(event.request.url);
  if(url.origin!==self.location.origin)return;

  const isData=url.pathname.includes("/data/");
  if(isData){
    event.respondWith(
      fetch(event.request)
        .then(response=>{
          const copy=response.clone();
          const cacheKey=new Request(url.origin+url.pathname);
          caches.open(CACHE_NAME).then(cache=>cache.put(cacheKey,copy));
          return response;
        })
        .catch(()=>caches.match(new Request(url.origin+url.pathname)))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached=>{
      if(cached)return cached;
      return fetch(event.request).then(response=>{
        if(response.ok){
          const copy=response.clone();
          caches.open(CACHE_NAME).then(cache=>cache.put(event.request,copy));
        }
        return response;
      });
    })
  );
});
