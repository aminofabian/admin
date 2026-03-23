/* Service worker for push notifications - must be served from same origin over HTTPS */
self.addEventListener('push', (event) => {
  if (!event.data) return;
  let payload = { title: 'New message', body: 'You have a new chat message' };
  try {
    payload = event.data.json();
  } catch {
    payload.body = event.data.text() || payload.body;
  }
  const options = {
    body: payload.body || 'New message',
    icon: '/vercel.svg',
    tag: payload.tag || 'chat-push',
    data: payload.data || {},
    requireInteraction: false,
  };
  event.waitUntil(
    self.registration.showNotification(payload.title || 'New message', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = '/dashboard/chat';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if (c.url.includes(self.location.origin) && 'focus' in c) {
          c.navigate(url);
          return c.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
