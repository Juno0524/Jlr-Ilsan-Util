(() => {
  "use strict";

  const DEFAULT_OPINIONS = Object.freeze([
    "48시간 - 1.고객성향 및 특이사항 - ",
    "48시간 - 2.마지막 정비이력 - ",
    "48시간 - 3.마지막 엔진오일 교환 - ",
    "48시간 - 4.리콜 - X",
    "48시간 - 5.출고 요청 시간 - ",
    "48시간 - 6.원케어 가입 - ",
    "48시간 - 7.NSC - X",
    "48시간 - 8.EVHC - X",
    "48시간 - 9.입고시 엡셀링 - X",
    "48시간 - 10.메달리아 - X",
    "48시간 - 11.부품 - X",
    "48시간 - 12.프리미팅 - X",
  ]);

  const form = document.getElementById("settings-form");
  const fields = document.getElementById("opinion-fields");
  const addOpinionButton = document.getElementById("add-opinion-button");
  const resetButton = document.getElementById("reset-button");
  const status = document.getElementById("status");
  const notice = document.getElementById("notice");
  const noticeText = document.getElementById("notice-text");
  const syncStatusText = document.getElementById("sync-status-text");
  const syncRetryButton = document.getElementById("sync-retry-button");
  const extensionStorage = globalThis.chrome?.storage?.local;
  const version = globalThis.chrome?.runtime?.getManifest?.().version || "dev";
  const emissionForm = document.getElementById("emission-form");
  const emissionInput = document.getElementById("emission-engineering-number");
  const emissionLookupNotice = document.getElementById("emission-lookup-notice");
  const emissionLookupNoticeText = document.getElementById(
    "emission-lookup-notice-text",
  );
  const emissionResult = document.getElementById("emission-result");
  document.getElementById("version").textContent = `v${version}`;

  const views = document.querySelectorAll(".view");

  function showView(name) {
    views.forEach((view) => {
      view.hidden = view.id !== `view-${name}`;
    });
  }

  document.querySelectorAll("[data-open-view]").forEach((button) => {
    button.addEventListener("click", () => showView(button.dataset.openView));
  });

  document.querySelectorAll("[data-back]").forEach((button) => {
    button.addEventListener("click", () =>
      showView(button.dataset.back || "home"),
    );
  });

  showView("home");

  const ADMIN_PASSWORD_HASH =
    "07334386287751ba02a4588c1a0875dbd074a61bd9e6ab7c48d244eacd0c99e0";

  async function hashPassword(value) {
    const data = new TextEncoder().encode(value);
    const digest = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(digest))
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
  }
  const opinionMenuButton = document.getElementById("opinion-menu-button");
  const workgroupMenuButton = document.getElementById("workgroup-menu-button");
  const adminButton = document.getElementById("admin-button");
  const adminLoginForm = document.getElementById("admin-login-form");
  const adminPasswordInput = document.getElementById("admin-password");
  const adminLoginError = document.getElementById("admin-login-error");
  const adminLogoutButton = document.getElementById("admin-logout-button");
  const emissionsPartsButton = document.getElementById("emissions-parts-button");
  const settingsAdminSiteButton = document.getElementById(
    "settings-admin-site-button",
  );
  const receptionButton = document.getElementById("reception-button");
  const receptionReminderRow = document.getElementById(
    "reception-reminder-row",
  );
  const receptionLogoutButton = document.getElementById(
    "reception-logout-button",
  );
  const homeNotice = document.getElementById("home-notice");
  const homeNoticeText = document.getElementById("home-notice-text");
  const DMS_URL_PREFIX = "https://www.jlrkdms.co.kr/";
  const SETTINGS_ADMIN_URL = "https://jlr-settings-admin.vercel.app/";
  const EMISSION_PARTS_FALLBACK_URL = "asset/emission-parts.json";
  const EMISSION_PARTS_STORAGE_KEY = "emissionParts";

  let emissionPartsCache = null;

  let adminLoggedIn = false;
  let receptionLoggedIn = false;

  function showAdminNotice() {
    homeNotice.dataset.kind = "success";
    homeNoticeText.textContent = "관리자 페이지입니다.";
  }

  function syncHomeButtonsVisibility() {
    emissionsPartsButton.hidden = adminLoggedIn || receptionLoggedIn;
  }

  function setAdminLoggedIn(isLoggedIn) {
    adminLoggedIn = isLoggedIn;
    opinionMenuButton.hidden = true;
    workgroupMenuButton.hidden = true;
    adminButton.textContent = isLoggedIn ? "관리자 메뉴" : "관리자 로그인";
    adminLogoutButton.hidden = !isLoggedIn;
    adminLoginForm.hidden = true;
    adminLoginError.hidden = true;
    adminPasswordInput.value = "";
    if (isLoggedIn) {
      receptionButton.hidden = true;
      receptionReminderRow.hidden = true;
      receptionLogoutButton.hidden = true;
      showAdminNotice();
    } else {
      setReceptionLoggedIn(receptionLoggedIn);
      checkActiveSite();
    }
    syncHomeButtonsVisibility();
  }

  adminLogoutButton.addEventListener("click", async () => {
    if (extensionStorage) {
      await extensionStorage.set({ isAdmin: false });
    } else {
      localStorage.setItem("isAdmin", "false");
    }
    setAdminLoggedIn(false);
    showView("home");
  });

  adminButton.addEventListener("click", () => {
    if (adminLoggedIn) {
      showView("admin");
      return;
    }
    adminLoginForm.hidden = !adminLoginForm.hidden;
    adminLoginError.hidden = true;
    if (!adminLoginForm.hidden) {
      window.setTimeout(() => adminPasswordInput.focus(), 0);
    }
  });

  adminLoginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const enteredHash = await hashPassword(adminPasswordInput.value);
    if (enteredHash !== ADMIN_PASSWORD_HASH) {
      adminLoginError.hidden = false;
      adminPasswordInput.value = "";
      adminPasswordInput.focus();
      return;
    }
    if (extensionStorage) {
      await extensionStorage.set({ isAdmin: true });
    } else {
      localStorage.setItem("isAdmin", "true");
    }
    setAdminLoggedIn(true);
  });

  settingsAdminSiteButton.addEventListener("click", () => {
    if (globalThis.chrome?.tabs?.create) {
      chrome.tabs.create({ url: SETTINGS_ADMIN_URL });
      return;
    }

    window.open(SETTINGS_ADMIN_URL, "_blank", "noopener");
  });

  async function loadAdminState() {
    const saved = extensionStorage
      ? await extensionStorage.get("isAdmin")
      : { isAdmin: localStorage.getItem("isAdmin") === "true" };
    setAdminLoggedIn(Boolean(saved.isAdmin));
  }

  loadAdminState().catch(() => setAdminLoggedIn(false));

  let reminderActive = false;
  const RECEPTION_REMINDER_DEFAULT = true;

  function setReceptionLoggedIn(isLoggedIn) {
    receptionLoggedIn = isLoggedIn;
    if (adminLoggedIn) {
      receptionButton.hidden = true;
      receptionReminderRow.hidden = true;
      receptionLogoutButton.hidden = true;
      syncHomeButtonsVisibility();
      return;
    }
    receptionButton.hidden = isLoggedIn;
    receptionReminderRow.hidden = !isLoggedIn;
    receptionLogoutButton.hidden = !isLoggedIn;
    adminButton.hidden = isLoggedIn;
    syncHomeButtonsVisibility();
  }

  receptionButton.addEventListener("click", async () => {
    if (extensionStorage) {
      await extensionStorage.set({
        isReception: true,
        receptionReminderButtonEnabled: RECEPTION_REMINDER_DEFAULT,
      });
    } else {
      localStorage.setItem("isReception", "true");
      localStorage.setItem(
        "receptionReminderButtonEnabled",
        String(RECEPTION_REMINDER_DEFAULT),
      );
    }
    receptionReminderToggle.checked = RECEPTION_REMINDER_DEFAULT;
    setReceptionLoggedIn(true);
  });

  receptionLogoutButton.addEventListener("click", async () => {
    if (extensionStorage) {
      await extensionStorage.set({ isReception: false, reminderActive: false });
    } else {
      localStorage.setItem("isReception", "false");
      localStorage.setItem("reminderActive", "false");
    }
    reminderActive = false;
    setReceptionLoggedIn(false);
    showView("home");
  });

  async function loadReceptionState() {
    const saved = extensionStorage
      ? await extensionStorage.get(["isReception", "reminderActive"])
      : {
          isReception: localStorage.getItem("isReception") === "true",
          reminderActive: localStorage.getItem("reminderActive") === "true",
    };
    reminderActive = Boolean(saved.reminderActive);
    setReceptionLoggedIn(Boolean(saved.isReception));
  }

  loadReceptionState().catch(() => setReceptionLoggedIn(false));

  const grpCodeUppercaseToggle = document.getElementById(
    "grp-code-uppercase-toggle",
  );

  async function loadGrpCodeUppercaseToggle() {
    const saved = extensionStorage
      ? await extensionStorage.get("grpCodeUppercaseLock")
      : { grpCodeUppercaseLock: localStorage.getItem("grpCodeUppercaseLock") === "true" };
    grpCodeUppercaseToggle.checked = Boolean(saved.grpCodeUppercaseLock);
  }

  loadGrpCodeUppercaseToggle()
    .catch(() => {
      grpCodeUppercaseToggle.checked = false;
    })
    .then(() => syncTogglesAllState());

  grpCodeUppercaseToggle.addEventListener("change", async () => {
    const enabled = grpCodeUppercaseToggle.checked;
    if (extensionStorage) {
      await extensionStorage.set({ grpCodeUppercaseLock: enabled });
    } else {
      localStorage.setItem("grpCodeUppercaseLock", String(enabled));
    }
  });

  const claimTaskButtonToggle = document.getElementById(
    "claim-task-button-toggle",
  );

  async function loadClaimTaskButtonToggle() {
    const saved = extensionStorage
      ? await extensionStorage.get("claimTaskButtonEnabled")
      : {
          claimTaskButtonEnabled:
            localStorage.getItem("claimTaskButtonEnabled") === "true",
        };
    claimTaskButtonToggle.checked = Boolean(saved.claimTaskButtonEnabled);
  }

  loadClaimTaskButtonToggle()
    .catch(() => {
      claimTaskButtonToggle.checked = false;
    })
    .then(() => syncTogglesAllState());

  claimTaskButtonToggle.addEventListener("change", async () => {
    const enabled = claimTaskButtonToggle.checked;
    if (extensionStorage) {
      await extensionStorage.set({ claimTaskButtonEnabled: enabled });
    } else {
      localStorage.setItem("claimTaskButtonEnabled", String(enabled));
    }
  });

  const workGroupClaimButtonToggle = document.getElementById(
    "workgroup-claim-button-toggle",
  );

  async function loadWorkGroupClaimButtonToggle() {
    const saved = extensionStorage
      ? await extensionStorage.get("workGroupClaimButtonEnabled")
      : {
          workGroupClaimButtonEnabled:
            localStorage.getItem("workGroupClaimButtonEnabled") === "true",
        };
    workGroupClaimButtonToggle.checked = Boolean(
      saved.workGroupClaimButtonEnabled,
    );
  }

  loadWorkGroupClaimButtonToggle()
    .catch(() => {
      workGroupClaimButtonToggle.checked = false;
    })
    .then(() => syncTogglesAllState());

  workGroupClaimButtonToggle.addEventListener("change", async () => {
    const enabled = workGroupClaimButtonToggle.checked;
    if (extensionStorage) {
      await extensionStorage.set({ workGroupClaimButtonEnabled: enabled });
    } else {
      localStorage.setItem("workGroupClaimButtonEnabled", String(enabled));
    }
  });

  const DEFAULT_WORKGROUP_CLAIM_TYPES = [
    { name: "리콜/캠페인", enabled: true },
    { name: "보증", enabled: true },
    { name: "서비스플랜", enabled: true },
  ];
  const workgroupClaimTypesList = document.getElementById(
    "workgroup-claim-types-list",
  );
  const workgroupClaimTypesNewInput = document.getElementById(
    "workgroup-claim-types-new-input",
  );
  const workgroupClaimTypesAddButton = document.getElementById(
    "workgroup-claim-types-add-button",
  );
  const workgroupClaimTypesToggleButton = document.getElementById(
    "workgroup-claim-types-toggle-button",
  );
  const workgroupClaimTypesBody = document.getElementById(
    "workgroup-claim-types-body",
  );

  workgroupClaimTypesToggleButton.addEventListener("click", () => {
    const expanded =
      workgroupClaimTypesToggleButton.getAttribute("aria-expanded") === "true";
    workgroupClaimTypesToggleButton.setAttribute(
      "aria-expanded",
      String(!expanded),
    );
    workgroupClaimTypesBody.hidden = expanded;
  });

  async function getWorkGroupClaimTypes() {
    const saved = extensionStorage
      ? await extensionStorage.get("workgroupClaimTypes")
      : {
          workgroupClaimTypes: JSON.parse(
            localStorage.getItem("workgroupClaimTypes") || "null",
          ),
        };
    return Array.isArray(saved.workgroupClaimTypes)
      ? saved.workgroupClaimTypes
      : DEFAULT_WORKGROUP_CLAIM_TYPES;
  }

  async function saveWorkGroupClaimTypes(types) {
    if (extensionStorage) {
      await extensionStorage.set({ workgroupClaimTypes: types });
    } else {
      localStorage.setItem("workgroupClaimTypes", JSON.stringify(types));
    }
  }

  function renderWorkGroupClaimTypes(types) {
    workgroupClaimTypesList.replaceChildren();
    if (types.length === 0) {
      const empty = document.createElement("li");
      empty.className = "claim-types-empty";
      empty.textContent = "등록된 유형이 없습니다.";
      workgroupClaimTypesList.append(empty);
      return;
    }
    types.forEach((type, index) => {
      const item = document.createElement("li");

      const label = document.createElement("label");
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = type.enabled;
      checkbox.addEventListener("change", async () => {
        const updated = await getWorkGroupClaimTypes();
        updated[index].enabled = checkbox.checked;
        await saveWorkGroupClaimTypes(updated);
      });
      const text = document.createElement("span");
      text.textContent = type.name;
      label.append(checkbox, text);

      const deleteButton = document.createElement("button");
      deleteButton.type = "button";
      deleteButton.className = "icon-button";
      deleteButton.textContent = "삭제";
      deleteButton.addEventListener("click", async () => {
        const updated = await getWorkGroupClaimTypes();
        updated.splice(index, 1);
        await saveWorkGroupClaimTypes(updated);
        renderWorkGroupClaimTypes(updated);
      });

      item.append(label, deleteButton);
      workgroupClaimTypesList.append(item);
    });
  }

  async function loadWorkGroupClaimTypes() {
    renderWorkGroupClaimTypes(await getWorkGroupClaimTypes());
  }

  loadWorkGroupClaimTypes().catch(() => {
    renderWorkGroupClaimTypes(DEFAULT_WORKGROUP_CLAIM_TYPES);
  });

  workgroupClaimTypesAddButton.addEventListener("click", async () => {
    const name = workgroupClaimTypesNewInput.value.trim();
    if (!name) return;
    const types = await getWorkGroupClaimTypes();
    if (types.some((type) => type.name === name)) {
      workgroupClaimTypesNewInput.value = "";
      return;
    }
    types.push({ name, enabled: true });
    await saveWorkGroupClaimTypes(types);
    renderWorkGroupClaimTypes(types);
    workgroupClaimTypesNewInput.value = "";
  });

  const warrantyBrandButtonToggle = document.getElementById(
    "warranty-brand-button-toggle",
  );

  async function loadWarrantyBrandButtonToggle() {
    const saved = extensionStorage
      ? await extensionStorage.get("warrantyBrandButtonEnabled")
      : {
          warrantyBrandButtonEnabled:
            localStorage.getItem("warrantyBrandButtonEnabled") === "true",
        };
    warrantyBrandButtonToggle.checked = Boolean(
      saved.warrantyBrandButtonEnabled,
    );
  }

  loadWarrantyBrandButtonToggle()
    .catch(() => {
      warrantyBrandButtonToggle.checked = false;
    })
    .then(() => syncTogglesAllState());

  warrantyBrandButtonToggle.addEventListener("change", async () => {
    const enabled = warrantyBrandButtonToggle.checked;
    if (extensionStorage) {
      await extensionStorage.set({ warrantyBrandButtonEnabled: enabled });
    } else {
      localStorage.setItem("warrantyBrandButtonEnabled", String(enabled));
    }
  });

  const adminReminderToggle = document.getElementById("admin-reminder-toggle");

  async function loadAdminReminderToggle() {
    const saved = extensionStorage
      ? await extensionStorage.get("adminReminderButtonEnabled")
      : {
          adminReminderButtonEnabled:
            localStorage.getItem("adminReminderButtonEnabled") === "true",
        };
    adminReminderToggle.checked = Boolean(saved.adminReminderButtonEnabled);
  }

  loadAdminReminderToggle()
    .catch(() => {
      adminReminderToggle.checked = false;
    })
    .then(() => syncTogglesAllState());

  adminReminderToggle.addEventListener("change", async () => {
    const enabled = adminReminderToggle.checked;
    if (extensionStorage) {
      await extensionStorage.set({ adminReminderButtonEnabled: enabled });
    } else {
      localStorage.setItem("adminReminderButtonEnabled", String(enabled));
    }
  });

  const receptionReminderToggle = document.getElementById(
    "reception-reminder-toggle",
  );

  async function loadReceptionReminderToggle() {
    if (extensionStorage) {
      const saved = await extensionStorage.get("receptionReminderButtonEnabled");
      receptionReminderToggle.checked =
        saved.receptionReminderButtonEnabled ?? RECEPTION_REMINDER_DEFAULT;
      return;
    }

    const saved = localStorage.getItem("receptionReminderButtonEnabled");
    receptionReminderToggle.checked =
      saved === null ? RECEPTION_REMINDER_DEFAULT : saved === "true";
  }

  loadReceptionReminderToggle().catch(() => {
    receptionReminderToggle.checked = RECEPTION_REMINDER_DEFAULT;
  });

  receptionReminderToggle.addEventListener("change", async () => {
    const enabled = receptionReminderToggle.checked;
    if (extensionStorage) {
      await extensionStorage.set({ receptionReminderButtonEnabled: enabled });
    } else {
      localStorage.setItem("receptionReminderButtonEnabled", String(enabled));
    }
  });

  const ADMIN_BULK_TOGGLES = [
    { toggle: grpCodeUppercaseToggle, label: "그룹코드 대문자" },
    { toggle: claimTaskButtonToggle, label: "클레임 버튼" },
    { toggle: workGroupClaimButtonToggle, label: "청구 버튼" },
    { toggle: adminReminderToggle, label: "리마인드" },
    { toggle: warrantyBrandButtonToggle, label: "재규어/랜드로버" },
  ];
  const togglesAllToggle = document.getElementById("toggles-all-toggle");
  const togglesAllStatus = document.getElementById("toggles-all-status");

  function syncTogglesAllState() {
    togglesAllToggle.checked = ADMIN_BULK_TOGGLES.every(
      ({ toggle }) => toggle.checked,
    );
    const onLabels = ADMIN_BULK_TOGGLES.filter(({ toggle }) => toggle.checked).map(
      ({ label }) => label,
    );
    togglesAllStatus.textContent =
      onLabels.length > 0 ? `켜진 기능: ${onLabels.join(", ")}` : "켜진 기능 없음";
  }

  function setAllAdminToggles(enabled) {
    ADMIN_BULK_TOGGLES.forEach(({ toggle }) => {
      if (toggle.checked === enabled) return;
      toggle.checked = enabled;
      toggle.dispatchEvent(new Event("change"));
    });
    syncTogglesAllState();
  }

  togglesAllToggle.addEventListener("change", () => {
    setAllAdminToggles(togglesAllToggle.checked);
  });

  ADMIN_BULK_TOGGLES.forEach(({ toggle }) => {
    toggle.addEventListener("change", syncTogglesAllState);
  });

  syncTogglesAllState();

  const USAGE_STAT_LABELS = {
    workGroupClaim: "작업그룹 청구 버튼",
    claimTask: "클레임(ClaimTask) 버튼",
    reminderToggle: "리마인드 시작/종료 버튼",
    warrantyBrand: "재규어/랜드로버 버튼",
  };
  const usageStatsList = document.getElementById("usage-stats-list");
  const usageStatsResetButton = document.getElementById(
    "usage-stats-reset-button",
  );
  const usageStatsToggleButton = document.getElementById(
    "usage-stats-toggle-button",
  );

  usageStatsToggleButton.addEventListener("click", () => {
    const expanded = usageStatsToggleButton.getAttribute("aria-expanded") === "true";
    usageStatsToggleButton.setAttribute("aria-expanded", String(!expanded));
    usageStatsList.hidden = expanded;
  });

  async function getUsageStats() {
    const saved = extensionStorage
      ? await extensionStorage.get("usageStats")
      : { usageStats: JSON.parse(localStorage.getItem("usageStats") || "null") };
    return saved.usageStats && typeof saved.usageStats === "object"
      ? saved.usageStats
      : {};
  }

  function renderUsageStats(stats) {
    usageStatsList.replaceChildren();
    const keys = Object.keys(USAGE_STAT_LABELS);
    const hasAny = keys.some((key) => stats[key] > 0);
    if (!hasAny) {
      const empty = document.createElement("li");
      empty.className = "usage-stats-empty";
      empty.textContent = "아직 사용 기록이 없습니다.";
      usageStatsList.append(empty);
      return;
    }
    keys.forEach((key) => {
      const item = document.createElement("li");
      const label = document.createElement("span");
      label.textContent = USAGE_STAT_LABELS[key];
      const count = document.createElement("span");
      count.textContent = `${stats[key] || 0}회`;
      item.append(label, count);
      usageStatsList.append(item);
    });
  }

  async function loadUsageStats() {
    renderUsageStats(await getUsageStats());
  }

  loadUsageStats().catch(() => renderUsageStats({}));

  usageStatsResetButton.addEventListener("click", async () => {
    if (extensionStorage) {
      await extensionStorage.set({ usageStats: {} });
    } else {
      localStorage.setItem("usageStats", JSON.stringify({}));
    }
    renderUsageStats({});
  });

  function checkActiveSite() {
    if (!globalThis.chrome?.tabs?.query) return;
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (adminLoggedIn) {
        showAdminNotice();
        return;
      }
      const url = tabs?.[0]?.url || "";
      if (url.startsWith(DMS_URL_PREFIX)) {
        homeNotice.dataset.kind = "success";
        homeNoticeText.textContent = "DMS 페이지에서만 작동합니다.";
      } else {
        homeNotice.dataset.kind = "error";
        homeNoticeText.textContent = "DMS로 이동하세요.";
      }
    });
  }

  checkActiveSite();

  function normalizeEngineeringNumber(value) {
    return String(value || "")
      .toUpperCase()
      .replace(/[ㄱ-ㅎㅏ-ㅣ가-힣]/g, "")
      .replace(/\s+/g, "")
      .slice(0, 10);
  }

  emissionInput?.addEventListener("input", () => {
    const normalized = normalizeEngineeringNumber(emissionInput.value);
    if (emissionInput.value !== normalized) {
      emissionInput.value = normalized;
    }
  });

  async function loadEmissionParts() {
    if (Array.isArray(emissionPartsCache)) return emissionPartsCache;

    if (extensionStorage) {
      const saved = await extensionStorage.get(EMISSION_PARTS_STORAGE_KEY);
      if (Array.isArray(saved.emissionParts) && saved.emissionParts.length > 0) {
        emissionPartsCache = saved.emissionParts;
        return emissionPartsCache;
      }
    } else {
      const raw = localStorage.getItem(EMISSION_PARTS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          emissionPartsCache = parsed;
          return emissionPartsCache;
        }
      }
    }

    const fallbackUrl = globalThis.chrome?.runtime?.getURL
      ? chrome.runtime.getURL(EMISSION_PARTS_FALLBACK_URL)
      : EMISSION_PARTS_FALLBACK_URL;
    const response = await fetch(fallbackUrl, { cache: "no-store" });
    if (!response.ok) {
      throw new Error("배출가스 부품 기준 데이터를 불러오지 못했습니다.");
    }

    const parsed = await response.json();
    if (!Array.isArray(parsed)) {
      throw new Error("배출가스 부품 기준 데이터 형식이 올바르지 않습니다.");
    }

    emissionPartsCache = parsed;
    return emissionPartsCache;
  }

  function renderEmissionMessage(message) {
    emissionResult.replaceChildren();
    const text = document.createElement("p");
    text.className = "emission-empty";
    text.textContent = message;
    emissionResult.append(text);
  }

  function showEmissionLookupNotice(message) {
    emissionLookupNoticeText.textContent = message;
    emissionLookupNotice.hidden = false;
  }

  function hideEmissionLookupNotice() {
    emissionLookupNotice.hidden = true;
  }

  function renderEmissionResults(results, engineeringNumber) {
    emissionResult.replaceChildren();

    if (results.length === 0) {
      hideEmissionLookupNotice();
      renderEmissionMessage(
        `${engineeringNumber}에 해당하는 배출가스 부품 기준을 찾지 못했습니다.`,
      );
      return;
    }

    const list = document.createElement("div");
    list.className = "emission-result-list";

    results.forEach((item, index) => {
      const card = document.createElement("section");
      card.className = "emission-result-card";

      const title = document.createElement("p");
      title.className = "emission-result-title";
      title.textContent = `${engineeringNumber} 조회 결과 ${index + 1}`;

      const grid = document.createElement("dl");
      grid.className = "emission-result-grid";

      [
        ["Coverage", item.coverage || "-"],
        ["Description", item.description || "-"],
        ["INCL/EXCL", item.includeExclude || "-"],
        ["엔지니어링", item.engineeringNumber || "-"],
        ["ENG NO", item.engNo || "-"],
        ["BASE NAME", item.baseName || "-"],
      ].forEach(([label, value]) => {
        const dt = document.createElement("dt");
        dt.textContent = label;
        const dd = document.createElement("dd");
        dd.textContent = value;
        grid.append(dt, dd);
      });

      card.append(title, grid);
      list.append(card);
    });

    emissionResult.append(list);
  }

  async function handleEmissionLookup(event) {
    event?.preventDefault();
    const engineeringNumber = normalizeEngineeringNumber(emissionInput.value);
    emissionInput.value = engineeringNumber;

    if (engineeringNumber.length < 1 || engineeringNumber.length > 10) {
      hideEmissionLookupNotice();
      renderEmissionMessage("엔지니어링 번호 1~10자리를 입력하세요.");
      emissionInput.focus();
      return;
    }

    showEmissionLookupNotice(
      "조회 결과가 있더라도 해당 부품이 항상 배출가스 부품인 것은 아니므로 추가 확인이 필요합니다.",
    );
    renderEmissionMessage("조회 중입니다...");

    try {
      const parts = await loadEmissionParts();
      const results = parts.filter(
        (item) =>
          normalizeEngineeringNumber(item.engineeringNumber) === engineeringNumber,
      );
      renderEmissionResults(results, engineeringNumber);
    } catch (error) {
      hideEmissionLookupNotice();
      renderEmissionMessage(error.message);
    }
  }

  emissionsPartsButton?.addEventListener("click", () => {
    window.setTimeout(() => emissionInput.focus(), 0);
  });
  emissionForm?.addEventListener("submit", handleEmissionLookup);

  function render(values) {
    fields.replaceChildren();
    values.forEach((value, index) => {
      const row = document.createElement("div");
      row.className = "field-row";

      const label = document.createElement("label");
      label.htmlFor = `opinion-${index}`;
      label.textContent = `${index + 1}번`;

      const input = document.createElement("input");
      input.id = `opinion-${index}`;
      input.name = "opinion";
      input.type = "text";
      input.value = value;
      input.required = true;

      const deleteButton = document.createElement("button");
      deleteButton.type = "button";
      deleteButton.className = "icon-button opinion-delete-button";
      deleteButton.textContent = "삭제";
      deleteButton.addEventListener("click", () => {
        row.remove();
        renumberOpinionRows();
      });

      row.append(label, input, deleteButton);
      fields.append(row);
    });
    renumberOpinionRows();
  }

  function renumberOpinionRows() {
    fields.querySelectorAll(".field-row").forEach((row, index) => {
      const label = row.querySelector("label");
      const input = row.querySelector("input[name='opinion']");
      if (!label || !input) return;
      input.id = `opinion-${index}`;
      label.htmlFor = input.id;
      label.textContent = `${index + 1}번`;
    });
  }

  function getOpinionValues() {
    return Array.from(fields.querySelectorAll("input[name='opinion']"), (input) =>
      input.value.trim(),
    );
  }

  function isValidOpinions(values) {
    return values.length > 0 && values.every(Boolean);
  }

  function showStatus(message, kind = "success") {
    status.textContent = message;
    notice.dataset.kind = kind;
    noticeText.textContent = message;
    window.setTimeout(() => {
      if (status.textContent !== message) return;
      status.textContent = "";
      notice.dataset.kind = "info";
      noticeText.textContent = "내부의견 문구를 추가, 삭제, 수정한 후 저장하세요.";
    }, 2400);
  }

  async function load() {
    const saved = extensionStorage
      ? await extensionStorage.get("opinions")
      : { opinions: JSON.parse(localStorage.getItem("opinions") || "null") };
    const values =
      Array.isArray(saved.opinions) && isValidOpinions(saved.opinions)
        ? saved.opinions
        : DEFAULT_OPINIONS;
    render(values);
  }

  async function syncRemoteSettings() {
    if (!globalThis.chrome?.runtime?.sendMessage) {
      return { ok: false, message: "확장 프로그램 컨텍스트를 사용할 수 없습니다." };
    }
    try {
      return await chrome.runtime.sendMessage({ type: "sync-remote-settings" });
    } catch (error) {
      return { ok: false, message: error.message };
    }
  }

  function formatSyncTime(isoString) {
    const date = new Date(isoString || "");
    return Number.isNaN(date.getTime())
      ? null
      : date.toLocaleString("ko-KR", { hour12: false });
  }

  async function renderSyncStatus() {
    if (!extensionStorage) {
      syncStatusText.textContent = "확장 프로그램 컨텍스트를 사용할 수 없습니다.";
      syncStatusText.dataset.kind = "error";
      return;
    }

    const saved = await extensionStorage.get([
      "remoteSettingsSyncedAt",
      "remoteSettingsVersion",
      "remoteSettingsLastError",
      "remoteSettingsLastErrorAt",
    ]);

    const syncedAt = formatSyncTime(saved.remoteSettingsSyncedAt);
    const errorAt = formatSyncTime(saved.remoteSettingsLastErrorAt);
    const errorIsNewer =
      saved.remoteSettingsLastError &&
      errorAt &&
      (!syncedAt ||
        new Date(saved.remoteSettingsLastErrorAt) >
          new Date(saved.remoteSettingsSyncedAt));

    if (errorIsNewer) {
      syncStatusText.dataset.kind = "error";
      syncStatusText.textContent = `동기화 실패 (${errorAt}): ${saved.remoteSettingsLastError}`;
      return;
    }

    syncStatusText.dataset.kind = "info";
    syncStatusText.textContent = syncedAt
      ? `마지막 동기화: ${syncedAt} (버전 ${saved.remoteSettingsVersion || "-"})`
      : "아직 동기화된 적이 없습니다.";
  }

  syncRetryButton.addEventListener("click", async () => {
    syncRetryButton.disabled = true;
    syncStatusText.textContent = "동기화 중...";
    syncStatusText.dataset.kind = "info";
    try {
      await syncRemoteSettings();
      emissionPartsCache = null;
      await load();
    } finally {
      await renderSyncStatus();
      syncRetryButton.disabled = false;
    }
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const values = getOpinionValues();
    if (!isValidOpinions(values)) {
      showStatus("내부의견 문구를 1개 이상 입력해 주세요.", "error");
      return;
    }
    if (extensionStorage) {
      await extensionStorage.set({ opinions: values });
    } else {
      localStorage.setItem("opinions", JSON.stringify(values));
    }
    showStatus(`${values.length}개 문구를 저장했습니다.`);
  });

  addOpinionButton.addEventListener("click", () => {
    render([...getOpinionValues(), ""]);
    const inputs = fields.querySelectorAll("input[name='opinion']");
    inputs[inputs.length - 1]?.focus();
  });

  resetButton.addEventListener("click", () => {
    render(DEFAULT_OPINIONS);
    showStatus("기본값을 불러왔습니다. 저장을 눌러 적용하세요.", "info");
  });

  async function initialize() {
    await syncRemoteSettings();
    emissionPartsCache = null;
    await load();
    await renderSyncStatus();
    await loadEmissionParts().catch(() => {});
  }

  initialize().catch((error) => {
    console.error("설정을 불러오지 못했습니다.", error);
    render(DEFAULT_OPINIONS);
    showStatus("설정을 불러오지 못해 기본값을 표시합니다.", "error");
    renderSyncStatus().catch(() => {});
  });
})();
