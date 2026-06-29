const REMOTE_SETTINGS_URL =
  "https://jlr-settings-admin.vercel.app/api/settings";
const REMOTE_SETTINGS_ALARM = "sync-remote-settings";
const SYNC_INTERVAL_MINUTES = 5;

function isValidOpinions(opinions) {
  return (
    Array.isArray(opinions) &&
    opinions.length > 0 &&
    opinions.every((opinion) => typeof opinion === "string" && opinion.trim())
  );
}

function normalizeRemoteSettings(settings) {
  if (!settings || typeof settings !== "object") return null;
  if (typeof settings.version !== "string" || !settings.version.trim()) {
    return null;
  }
  if (!isValidOpinions(settings.opinions)) return null;

  return {
    version: settings.version.trim(),
    opinions: settings.opinions,
  };
}

async function syncRemoteSettings() {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);
  let response;
  try {
    response = await fetch(`${REMOTE_SETTINGS_URL}?t=${Date.now()}`, {
      cache: "no-store",
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
  if (!response.ok) {
    throw new Error(`Remote settings request failed: ${response.status}`);
  }

  const remoteSettings = normalizeRemoteSettings(await response.json());
  if (!remoteSettings) {
    throw new Error("Remote settings format is invalid.");
  }

  const saved = await chrome.storage.local.get("remoteSettingsVersion");
  if (saved.remoteSettingsVersion === remoteSettings.version) {
    return { updated: false, version: remoteSettings.version };
  }

  await chrome.storage.local.set({
    opinions: remoteSettings.opinions,
    remoteSettingsVersion: remoteSettings.version,
    remoteSettingsSyncedAt: new Date().toISOString(),
  });

  return { updated: true, version: remoteSettings.version };
}

function scheduleRemoteSettingsSync() {
  chrome.alarms.create(REMOTE_SETTINGS_ALARM, {
    delayInMinutes: 1,
    periodInMinutes: SYNC_INTERVAL_MINUTES,
  });
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.clear(REMOTE_SETTINGS_ALARM);
  scheduleRemoteSettingsSync();
  syncRemoteSettings().catch((error) => {
    console.error("[원격 설정] 초기 동기화 실패", error);
  });
});

chrome.runtime.onStartup.addListener(() => {
  chrome.alarms.clear(REMOTE_SETTINGS_ALARM);
  scheduleRemoteSettingsSync();
  syncRemoteSettings().catch((error) => {
    console.error("[원격 설정] 시작 동기화 실패", error);
  });
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name !== REMOTE_SETTINGS_ALARM) return;
  syncRemoteSettings().catch((error) => {
    console.error("[원격 설정] 동기화 실패", error);
  });
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "sync-remote-settings") {
    syncRemoteSettings()
      .then((result) => sendResponse({ ok: true, ...result }))
      .catch((error) => {
        console.error("[원격 설정] 동기화 실패", error);
        sendResponse({ ok: false, message: error.message });
      });
    return true;
  }

  if (message?.type !== "open-settings-popup") return false;

  const view = message.view === "workgroup" ? "workgroup" : message.view === "opinion" ? "opinion" : "";
  const url = view
    ? chrome.runtime.getURL(`options.html?view=${view}`)
    : chrome.runtime.getURL("options.html");

  chrome.windows.create({
    url,
    type: "popup",
    width: 320,
    height: 560,
  });
  return false;
});
