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
  const extensionStorage = globalThis.chrome?.storage?.local;
  const version = globalThis.chrome?.runtime?.getManifest?.().version || "3.1";
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
    button.addEventListener("click", () => showView("home"));
  });

  showView("home");

  const ADMIN_PASSWORD = "0101";
  const opinionMenuButton = document.getElementById("opinion-menu-button");
  const workgroupMenuButton = document.getElementById("workgroup-menu-button");
  const adminButton = document.getElementById("admin-button");
  const adminLoginForm = document.getElementById("admin-login-form");
  const adminPasswordInput = document.getElementById("admin-password");
  const adminLoginError = document.getElementById("admin-login-error");
  const adminLogoutButton = document.getElementById("admin-logout-button");
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

  let adminLoggedIn = false;
  let receptionLoggedIn = false;

  function showAdminNotice() {
    homeNotice.dataset.kind = "success";
    homeNoticeText.textContent = "관리자 페이지입니다.";
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
    if (adminPasswordInput.value !== ADMIN_PASSWORD) {
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
      return;
    }
    receptionButton.hidden = isLoggedIn;
    receptionReminderRow.hidden = !isLoggedIn;
    receptionLogoutButton.hidden = !isLoggedIn;
    adminButton.hidden = isLoggedIn;
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

  loadGrpCodeUppercaseToggle().catch(() => {
    grpCodeUppercaseToggle.checked = false;
  });

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

  loadClaimTaskButtonToggle().catch(() => {
    claimTaskButtonToggle.checked = false;
  });

  claimTaskButtonToggle.addEventListener("change", async () => {
    const enabled = claimTaskButtonToggle.checked;
    if (extensionStorage) {
      await extensionStorage.set({ claimTaskButtonEnabled: enabled });
    } else {
      localStorage.setItem("claimTaskButtonEnabled", String(enabled));
    }
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

  loadWarrantyBrandButtonToggle().catch(() => {
    warrantyBrandButtonToggle.checked = false;
  });

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

  loadAdminReminderToggle().catch(() => {
    adminReminderToggle.checked = false;
  });

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
    if (!globalThis.chrome?.runtime?.sendMessage) return;
    await chrome.runtime.sendMessage({ type: "sync-remote-settings" });
  }

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
    await load();
  }

  initialize().catch((error) => {
    console.error("설정을 불러오지 못했습니다.", error);
    render(DEFAULT_OPINIONS);
    showStatus("설정을 불러오지 못해 기본값을 표시합니다.", "error");
  });
})();
