// Service worker desativado de propósito: a versão anterior cacheava o bundle
// com nome fixo ("v1") e continuava servindo código velho após cada deploy.
// Este arquivo só existe para que clientes com o SW antigo instalado recebam
// uma atualização que se auto-remove.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
      .then(() => self.registration.unregister())
      .then(() => self.clients.matchAll({ type: 'window' }))
      .then((clients) => clients.forEach((c) => c.navigate(c.url))),
  );
});
