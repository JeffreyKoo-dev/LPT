// LPT 웹 푸시 알림용 서비스 워커.
// 캐싱/오프라인 지원은 다루지 않는다 — 오직 푸시 수신/클릭 처리만 담당한다.

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { title: "LPT", body: event.data ? event.data.text() : "" };
  }

  const title = payload.title || "LPT";
  const options = {
    body: payload.body || "",
    icon: payload.icon || "/og-image.png",
    badge: payload.badge || "/og-image.png",
    data: { url: payload.url || "/dashboard" },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/dashboard";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(url) && "focus" in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});
