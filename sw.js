const CACHE_NAME="english-master-v8.0.1-layout-switch-3";
const APP_SHELL=["./","./index.html","./app.js?v=8.0.1","./styles.css","./manifest.json","./app-version.json"];
const NETWORK_FIRST_SHELL=new Set(["/english-master-data/","/english-master-data/index.html","/english-master-data/app.js","/english-master-data/styles.css","/english-master-data/manifest.json","/english-master-data/app-version.json"]);

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

    if(NETWORK_FIRST_SHELL.has(url.pathname)){
    event.respondWith(
      fetch(event.request,{cache:"no-store"})
        .then(response=>{
          if(response.ok){
            const copy=response.clone();
            caches.open(CACHE_NAME).then(cache=>cache.put(event.request,copy));
          }
          return response;
        })
        .catch(()=>caches.match(event.request).then(cached=>cached||caches.match("./index.html")))
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
