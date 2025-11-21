self.addEventListener('install', (event) => {
    self.skipWaiting();
  });
  
  self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
  });
  
  // O que fazer quando clicar na notificação
  self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(
      clients.matchAll({ type: 'window' }).then((clientList) => {
        // Se o app já estiver aberto, foca nele
        for (const client of clientList) {
          if (client.url === '/' && 'focus' in client) return client.focus();
        }
        // Se não, abre
        if (clients.openWindow) return clients.openWindow('/');
      })
    );
  });