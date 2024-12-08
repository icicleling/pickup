export function keepAwake() {
  if (!("wakeLock" in navigator)) return;

  let screenLock: WakeLockSentinel | null = null;

  function getScreenLock() {
    navigator.wakeLock.request("screen").then((lock) => {
      screenLock = lock;
    });
  }

  getScreenLock();

  document.addEventListener("visibilitychange", () => {
    if (screenLock !== null && document.visibilityState === "visible") {
      getScreenLock();
    }
  });
}

export function fullScreen() {
  document.querySelector("html")?.requestFullscreen();
}
