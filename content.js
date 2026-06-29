(() => {
  "use strict";

  const BUTTON_ID = "jlr-48h-bulk-add";
  const DELETE_BUTTON_ID = "jlr-48h-bulk-delete";
  const VIEW_BUTTON_ID = "jlr-48h-view";
  const DELETE_CONFIRM_ID = "jlr-48h-delete-confirm";
  const OPINION_POPUP_ID = "jlr-48h-opinion-popup";
  const OPINION_OVERLAY_ID = "jlr-48h-opinion-overlay";
  const NATIVE_ADD_BUTTON_ID = "btnAddDlrOpinion";
  const NATIVE_DELETE_BUTTON_ID = "btnDelDlrOpinion";
  const GRID_ID = "dlrOpinionGrid";
  const OPINION_FIELD = "dlrOpinionMtr";

  const WORKGROUP_DIAG_BUTTON_ID = "jlr-workgroup-diag";
  const WORKGROUP_DIAG_POPUP_ID = "jlr-workgroup-diag-popup";
  const WORKGROUP_DIAG_OVERLAY_ID = "jlr-workgroup-diag-overlay";
  const WORKGROUP_DIAG_ESC_CONFIRM_ID = "jlr-workgroup-diag-esc-confirm";
  const NATIVE_WORKGROUP_ADD_BUTTON_ID = "btnAddWrkOperItemGrp";
  const WORKGROUP_GRID_ID = "operItemGrpGrid";
  const WORKGROUP_FIELD = "wrkConts";
  const WORKGROUP_DETAIL_FIELD = "wrkDetlConts";
  const GRP_CODE_FIELD_ID = "grpCode";
  const REMINDER_GRID_ID = "grid";
  const REMINDER_COLUMN_HEADER_ID = "jlr-reminder-header";
  const REMINDER_TOGGLE_BUTTON_ID = "jlr-reminder-toggle-button";
  const REMINDER_POPUP_ID = "jlr-reminder-popup";
  const REMINDER_OVERLAY_ID = "jlr-reminder-overlay";
  const REMINDER_STATUS_OPTIONS = ["입고예정", "입고완료", "예약변경", "취소", "부재"];
  const WEEKDAY_NAMES = ["일", "월", "화", "수", "목", "금", "토"];

  const CLAIM_TASK_BUTTON_ID = "jlr-claim-task-button";
  const TYPE_CHANGE_AREA_ID = "selectTypeChangeArea";
  const TYPE_CHANGE_LISTBOX_ID = "selectTypeChange_listbox";
  const CLAIM_TASK_OPTION_TEXT = "ClaimTask";

  const GRP_CODE_AREA_ID = "grpCodeArea";
  const GRP_CODE_APPLY_BUTTON_ID = "btnGrpCodeChange";
  const GRP_CODE_QUICK_BUTTON_GROUP_ID = "jlr-grp-code-quick-buttons";
  const GRP_CODE_QUICK_LETTERS = ["A", "B", "C", "D", "E"];

  const DOWNLOAD_REASON_AGREE_ID = "agreeCheckboxBtn";
  const DOWNLOAD_REASON_TEXTAREA_ID = "txtConts";
  const DOWNLOAD_REASON_BUTTON_ID = "jlr-download-reason-button";
  const DOWNLOAD_REASON_TEXT = "리마인드 및 예약지 프린트을 위한 다운로드";

  const WARRANTY_CLAIM_STATUS_BUTTON_ID = "btnGetJlrClaimStatus";
  const WARRANTY_BRAND_SELECT_ID = "brandCd";
  const WARRANTY_BRAND_LISTBOX_ID = "brandCd_listbox";
  const WARRANTY_BRAND_OPTIONS = [
    { id: "jlr-warranty-jaguar-button", label: "재규어", optionText: "Jaguar" },
    {
      id: "jlr-warranty-landrover-button",
      label: "랜드로버",
      optionText: "Land Rover",
    },
  ];

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

  let opinions = [...DEFAULT_OPINIONS];
  let isWorking = false;
  let isStatusAnimating = false;
  let statusSequence = 0;
  let diagKeydownHandler = null;
  let opinionKeydownHandler = null;
  let isAdmin = false;
  let grpCodeUppercaseLock = false;
  let isReception = false;
  let reminderActive = false;
  let claimTaskButtonEnabled = false;
  let adminReminderButtonEnabled = false;
  let receptionReminderButtonEnabled = false;
  let warrantyBrandButtonEnabled = false;
  const reminderRowStatus = new Map();
  const manualReminderSelections = new Set();

  async function loadAdminFlags() {
    try {
      const saved = await chrome.storage.local.get([
        "isAdmin",
        "grpCodeUppercaseLock",
        "isReception",
        "reminderActive",
        "claimTaskButtonEnabled",
        "adminReminderButtonEnabled",
        "receptionReminderButtonEnabled",
        "warrantyBrandButtonEnabled",
      ]);
      isAdmin = Boolean(saved.isAdmin);
      grpCodeUppercaseLock = Boolean(saved.grpCodeUppercaseLock);
      isReception = Boolean(saved.isReception);
      reminderActive = Boolean(saved.reminderActive);
      claimTaskButtonEnabled = Boolean(saved.claimTaskButtonEnabled);
      adminReminderButtonEnabled = Boolean(saved.adminReminderButtonEnabled);
      receptionReminderButtonEnabled = Boolean(
        saved.receptionReminderButtonEnabled,
      );
      warrantyBrandButtonEnabled = Boolean(saved.warrantyBrandButtonEnabled);
    } catch (error) {
      console.error("[관리자 설정] 불러오기 실패", error);
    }
  }

  function installGrpCodeGuard() {
    const input =
      document.getElementById(GRP_CODE_FIELD_ID) ||
      document.querySelector(
        `input[name='${GRP_CODE_FIELD_ID}'], input[id$='${GRP_CODE_FIELD_ID}'], input[name$='${GRP_CODE_FIELD_ID}']`,
      );
    if (!input || input.dataset.jlrGuarded) return;
    input.dataset.jlrGuarded = "true";

    let pendingLetter = "";
    let skipNextBeforeInput = false;

    const shouldGuardGrpCode = () => isAdmin && grpCodeUppercaseLock;

    const setGrpCodeValue = (value, caretPosition = value.length) => {
      input.value = value;
      if (typeof input.setSelectionRange === "function") {
        input.setSelectionRange(caretPosition, caretPosition);
      }
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    };

    const normalizeGrpCode = (value) => value.toUpperCase().replace(/[^A-Z]/g, "");

    const setSingleGrpCodeLetter = (text) => {
      const normalized = normalizeGrpCode(text);
      if (!normalized) return;
      setGrpCodeValue(normalized.slice(0, 1), 1);
    };

    const sanitize = () => {
      if (!shouldGuardGrpCode()) return;
      let filtered = normalizeGrpCode(input.value).slice(0, 1);
      if (!filtered && input.value && pendingLetter) {
        filtered = pendingLetter;
      }
      if (filtered !== input.value) {
        setGrpCodeValue(filtered, filtered.length);
      }
    };

    let pollTimer = null;

    input.addEventListener("keydown", (event) => {
      if (!shouldGuardGrpCode()) return;
      const match = /^Key([A-Z])$/.exec(event.code);
      if (!match || event.ctrlKey || event.altKey || event.metaKey) return;

      pendingLetter = match[1];
      skipNextBeforeInput = true;
      event.preventDefault();
      event.stopImmediatePropagation();
      setSingleGrpCodeLetter(pendingLetter);
    }, true);

    input.addEventListener("beforeinput", (event) => {
      if (!shouldGuardGrpCode()) return;
      if (event.inputType === "deleteContentBackward") return;
      if (!event.data) return;

      const value = normalizeGrpCode(event.data);
      if (skipNextBeforeInput) {
        skipNextBeforeInput = false;
        event.preventDefault();
        event.stopImmediatePropagation();
        return;
      }

      if (!value && !pendingLetter) {
        event.preventDefault();
        event.stopImmediatePropagation();
        return;
      }

      event.preventDefault();
      event.stopImmediatePropagation();
      setSingleGrpCodeLetter(value || pendingLetter);
    }, true);

    input.addEventListener("focus", () => {
      if (shouldGuardGrpCode()) {
        input.lang = "en";
        input.setAttribute("inputmode", "latin");
        input.setAttribute("autocomplete", "off");
        input.setAttribute("autocapitalize", "characters");
      }
      if (pollTimer) window.clearInterval(pollTimer);
      pollTimer = window.setInterval(() => {
        if (document.activeElement !== input) return;
        sanitize();
      }, 150);
    });
    input.addEventListener("blur", () => {
      if (pollTimer) {
        window.clearInterval(pollTimer);
        pollTimer = null;
      }
      sanitize();
    });
    input.addEventListener("input", (event) => {
      if (event.isComposing) return;
      sanitize();
    });
    input.addEventListener("compositionend", sanitize);
  }

  async function loadOpinions() {
    try {
      const saved = await chrome.storage.local.get("opinions");
      if (
        Array.isArray(saved.opinions) &&
        saved.opinions.length > 0 &&
        saved.opinions.every(
          (opinion) => typeof opinion === "string" && opinion.trim(),
        )
      ) {
        opinions = [...saved.opinions];
      }
    } catch (error) {
      console.error("[48시간 내부의견] 설정 불러오기 실패", error);
    }
  }

  async function syncRemoteSettings() {
    try {
      await chrome.runtime.sendMessage({ type: "sync-remote-settings" });
    } catch (error) {
      console.warn("[원격 설정] 동기화 실패", error);
    }
  }

  function opinionKey(opinion) {
    return opinion.split(" - ", 2).join(" - ");
  }

  function getOpinionRows(gridElement) {
    return Array.from(gridElement.querySelectorAll("tbody tr"));
  }

  function findMissingOpinions(gridElement) {
    const existing = getOpinionRows(gridElement)
      .map((row) => row.querySelector("td")?.textContent?.trim() || "")
      .filter(Boolean);

    return opinions.filter((opinion) => {
      const key = opinionKey(opinion);
      return !existing.some(
        (savedOpinion) =>
          savedOpinion === key || savedOpinion.startsWith(`${key} -`),
      );
    });
  }

  function findTemplateRows(gridElement) {
    const keys = opinions.map(opinionKey);
    return getOpinionRows(gridElement).filter((row) => {
      const savedOpinion = row.querySelector("td")?.textContent?.trim() || "";
      return keys.some(
        (key) => savedOpinion === key || savedOpinion.startsWith(`${key} -`),
      );
    });
  }

  function getTemplateOpinionItems(gridElement) {
    const rows = getOpinionRows(gridElement);
    return opinions.map((opinion, index) => {
      const key = opinionKey(opinion);
      const row = rows.find((candidate) => {
        const savedOpinion =
          candidate.querySelector("td")?.textContent?.trim() || "";
        return savedOpinion === key || savedOpinion.startsWith(`${key} -`);
      });
      return {
        number: index + 1,
        key,
        text: row?.querySelector("td")?.textContent?.trim() || opinion,
        exists: Boolean(row),
      };
    });
  }

  function normalizeText(value) {
    return (value || "").replace(/\s+/g, " ").trim();
  }

  function findElementByExactText(text) {
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
    );
    let node = walker.nextNode();

    while (node) {
      if (normalizeText(node.nodeValue) === text) {
        return node.parentElement;
      }
      node = walker.nextNode();
    }

    return null;
  }

  function getElementValue(element) {
    if (!element) return "";

    const input = element.querySelector?.("input, textarea, select");
    if (input) {
      return normalizeText(input.value || input.textContent);
    }

    return normalizeText(element.textContent);
  }

  function extractFieldValue(labelElement, labelText) {
    const containers = [
      labelElement.parentElement,
      labelElement.closest("td, th, li"),
      labelElement.closest("div"),
    ].filter(Boolean);

    for (const container of containers) {
      const rawText = getElementValue(container);
      if (!rawText) continue;

      const value = normalizeText(rawText.replace(labelText, ""));
      if (value) {
        return value;
      }
    }

    return "";
  }

  function findOneCareAppValue() {
    const labelText = "One Care App 가입여부";
    const label = findElementByExactText(labelText);
    if (!label) return "";

    // 같은 필드 블록 안에서 라벨 텍스트를 제외한 실제 표시값을 먼저 확인합니다.
    const inlineValue = extractFieldValue(label, labelText);
    if (inlineValue) {
      return inlineValue;
    }

    // 좌측 차량정보 하단의 라벨 오른쪽 값 칸을 우선 확인합니다.
    const candidates = [
      label.nextElementSibling,
      label.parentElement?.nextElementSibling,
      label.closest("td, th, div, li")?.nextElementSibling,
      label.closest("tr")?.querySelector("td:nth-child(2)"),
    ];

    for (const candidate of candidates) {
      const value = getElementValue(candidate);
      if (value && value !== labelText) {
        return value;
      }
    }

    return "";
  }

  function buildOpinionValue(opinion) {
    const key = opinionKey(opinion);
    if (!key.includes("원케어")) {
      return opinion;
    }

    const oneCareValue = findOneCareAppValue();
    return `${key} - ${oneCareValue.includes("가입") ? "가입" : "미가입"}`;
  }

  function setEditorValue(editor, value) {
    const prototype = Object.getPrototypeOf(editor);
    const valueSetter = Object.getOwnPropertyDescriptor(
      prototype,
      "value",
    )?.set;
    if (valueSetter) {
      valueSetter.call(editor, value);
    } else {
      editor.value = value;
    }

    editor.dispatchEvent(new Event("input", { bubbles: true }));
    editor.dispatchEvent(new Event("change", { bubbles: true }));
    editor.blur();
  }

  async function addOpinion(nativeAddButton, gridElement, opinion) {
    const previousRows = new Set(getOpinionRows(gridElement));
    nativeAddButton.click();
    await nextFrame();

    const newRow = getOpinionRows(gridElement).find(
      (row) => !previousRows.has(row),
    );
    const opinionCell = newRow?.querySelector("td");
    if (!newRow || !opinionCell) {
      throw new Error("새 내부의견 행을 찾지 못했습니다.");
    }

    opinionCell.click();
    opinionCell.click();
    opinionCell.dispatchEvent(
      new MouseEvent("dblclick", {
        bubbles: true,
        cancelable: true,
        view: window,
      }),
    );
    await nextFrame();

    const editor = newRow.querySelector(
      `input[name="${OPINION_FIELD}"], textarea[name="${OPINION_FIELD}"]`,
    );
    if (!editor) {
      throw new Error("내부의견 입력 필드를 찾지 못했습니다.");
    }

    editor.focus();
    setEditorValue(editor, opinion);
    await nextFrame();
  }

  async function editOpinionRow(row, value) {
    const opinionCell = row?.querySelector("td");
    if (!row || !opinionCell) {
      throw new Error("수정할 내부의견 행을 찾지 못했습니다.");
    }

    opinionCell.click();
    opinionCell.click();
    opinionCell.dispatchEvent(
      new MouseEvent("dblclick", {
        bubbles: true,
        cancelable: true,
        view: window,
      }),
    );
    await nextFrame();

    const editor = row.querySelector(
      `input[name="${OPINION_FIELD}"], textarea[name="${OPINION_FIELD}"]`,
    );
    if (!editor) {
      throw new Error("내부의견 입력 필드를 찾지 못했습니다.");
    }

    editor.focus();
    setEditorValue(editor, value);
    await nextFrame();
  }

  function nextFrame() {
    return new Promise((resolve) => requestAnimationFrame(() => resolve()));
  }

  function getWorkGroupRows(gridElement) {
    return Array.from(gridElement.querySelectorAll("tbody tr"));
  }

  function getFieldColumnId(gridElement, field) {
    return gridElement.querySelector(`th[data-field="${field}"]`)?.id || "";
  }

  function getColumnIdByHeaderText(gridElement, headerText) {
    const headerThs = Array.from(
      gridElement.querySelectorAll(".k-grid-header thead th"),
    );
    return (
      headerThs.find((th) => th.textContent?.trim().includes(headerText))
        ?.id || ""
    );
  }

  async function fillWorkGroupCell(gridElement, newRow, field, value) {
    const columnId = getFieldColumnId(gridElement, field);
    const cell = columnId
      ? newRow.querySelector(`td[aria-describedby="${columnId}"]`)
      : null;
    if (!columnId || !cell) {
      throw new Error(`${field} 칸을 찾지 못했습니다.`);
    }

    cell.click();
    cell.click();
    cell.dispatchEvent(
      new MouseEvent("dblclick", {
        bubbles: true,
        cancelable: true,
        view: window,
      }),
    );
    await nextFrame();

    const editor = newRow.querySelector(
      `input[name="${field}"], textarea[name="${field}"]`,
    );
    if (!editor) {
      throw new Error(`${field} 입력 필드를 찾지 못했습니다.`);
    }

    editor.focus();
    setEditorValue(editor, value);
    await nextFrame();
  }

  async function addWorkGroupItem(button, nativeAddButton, fields) {
    if (isWorking) return;

    const fieldValues =
      typeof fields === "string" ? { [WORKGROUP_FIELD]: fields } : fields;

    const gridElement = document.getElementById(WORKGROUP_GRID_ID);
    if (!gridElement) {
      showStatus(
        button,
        "그리드 확인 필요",
        button.dataset.resetLabel,
        "error",
      );
      return;
    }

    isWorking = true;
    setBulkButtonsDisabled(true);

    try {
      const previousRows = new Set(getWorkGroupRows(gridElement));
      nativeAddButton.click();
      await nextFrame();

      const newRow = getWorkGroupRows(gridElement).find(
        (row) => !previousRows.has(row),
      );
      if (!newRow) {
        throw new Error("새 작업그룹 행을 찾지 못했습니다.");
      }

      for (const [field, value] of Object.entries(fieldValues)) {
        await fillWorkGroupCell(gridElement, newRow, field, value);
      }

      showStatus(button, "추가 완료", button.dataset.resetLabel);
    } catch (error) {
      console.error("[작업그룹] 추가 실패", error);
      showStatus(button, "추가 실패", button.dataset.resetLabel, "error");
    } finally {
      isWorking = false;
      setBulkButtonsDisabled(false);
    }
  }

  function closeEscConfirm() {
    document.getElementById(WORKGROUP_DIAG_ESC_CONFIRM_ID)?.remove();
  }

  function closeDiagPopup() {
    document.getElementById(WORKGROUP_DIAG_POPUP_ID)?.remove();
    document.getElementById(WORKGROUP_DIAG_OVERLAY_ID)?.remove();
    closeEscConfirm();
    if (diagKeydownHandler) {
      document.removeEventListener("keydown", diagKeydownHandler);
      diagKeydownHandler = null;
    }
  }

  function showEscConfirm() {
    if (document.getElementById(WORKGROUP_DIAG_ESC_CONFIRM_ID)) return;

    const dialog = document.createElement("div");
    dialog.id = WORKGROUP_DIAG_ESC_CONFIRM_ID;
    dialog.className = "jlr-workgroup-popup jlr-workgroup-popup-confirm-dialog";

    const message = document.createElement("p");
    message.className = "jlr-workgroup-popup-title";
    message.textContent = "입력한 내용이 사라집니다. 닫으시겠습니까?";

    const actions = document.createElement("div");
    actions.className = "jlr-workgroup-popup-actions";

    const keepButton = document.createElement("button");
    keepButton.type = "button";
    keepButton.className =
      "jlr-workgroup-popup-button jlr-workgroup-popup-cancel";
    keepButton.textContent = "취소";
    keepButton.addEventListener("click", () => closeEscConfirm());

    const closeButton = document.createElement("button");
    closeButton.type = "button";
    closeButton.className =
      "jlr-workgroup-popup-button jlr-workgroup-popup-confirm";
    closeButton.textContent = "닫기";
    closeButton.addEventListener("click", () => closeDiagPopup());

    actions.append(keepButton, closeButton);
    dialog.append(message, actions);
    document.body.append(dialog);
    window.setTimeout(() => closeButton.focus(), 0);
  }

  function createCheckboxGroup(options) {
    const container = document.createElement("div");
    container.className = "jlr-workgroup-popup-checkbox-group";

    const checkboxes = options.map((optionLabel) => {
      const item = document.createElement("label");
      item.className = "jlr-workgroup-popup-checkbox-item";

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.value = optionLabel;

      const span = document.createElement("span");
      span.textContent = optionLabel;

      item.append(checkbox, span);
      container.append(item);
      return checkbox;
    });

    return {
      container,
      getValues: () =>
        checkboxes.filter((checkbox) => checkbox.checked).map((c) => c.value),
    };
  }

  function createRow(labelText) {
    const row = document.createElement("div");
    row.className = "jlr-workgroup-popup-row";

    const label = document.createElement("label");
    label.textContent = labelText;
    row.append(label);

    return row;
  }

  function showDiagPopup(diagButton, nativeWorkGroupAddButton) {
    if (isWorking) return;

    closeDiagPopup();
    closeDeleteConfirm();

    const popup = document.createElement("div");
    popup.id = WORKGROUP_DIAG_POPUP_ID;
    popup.className = "jlr-workgroup-popup";

    const title = document.createElement("p");
    title.className = "jlr-workgroup-popup-title";
    title.textContent = "진단 내용 입력";

    const fieldsWrap = document.createElement("div");
    fieldsWrap.className = "jlr-workgroup-popup-fields";

    const errorText = document.createElement("p");
    errorText.className = "jlr-workgroup-popup-error";
    errorText.hidden = true;

    // 증상 유형
    let diagType = "general";
    const typeRow = createRow("증상 유형");
    const typeToggle = document.createElement("div");
    typeToggle.className = "jlr-workgroup-popup-toggle";

    // 일반 진단 섹션
    const generalSection = document.createElement("div");

    const symptomRow = createRow("증상");
    const symptomInput = document.createElement("input");
    symptomInput.type = "text";
    symptomInput.placeholder = "직접 입력";
    symptomInput.className = "jlr-workgroup-popup-input";
    const symptomExample = document.createElement("p");
    symptomExample.className = "jlr-workgroup-popup-example";
    symptomExample.textContent = "예: 엔진경고등 점등";
    symptomRow.append(symptomInput, symptomExample);

    const generalConditionRow = createRow("발생 조건/상황");
    const generalCondition = createCheckboxGroup([
      "항시",
      "냉간 시(시동 초기)",
      "열간 시(주행 후)",
      "가속 중",
      "감속 중",
      "정차 중",
      "우천 시",
    ]);
    const generalConditionInput = document.createElement("input");
    generalConditionInput.type = "text";
    generalConditionInput.placeholder = "직접 입력";
    generalConditionInput.className =
      "jlr-workgroup-popup-input jlr-workgroup-popup-input-sub";
    generalConditionRow.append(
      generalConditionInput,
      generalCondition.container,
    );

    const generalReproRow = createRow("재현 방법 및 상세 조건");
    const generalRepro = document.createElement("textarea");
    generalRepro.placeholder = "직접 입력";
    generalRepro.className =
      "jlr-workgroup-popup-input jlr-workgroup-popup-textarea";
    generalReproRow.append(generalRepro);

    generalSection.append(symptomRow, generalConditionRow, generalReproRow);

    // 소음 진단 섹션
    const noiseSection = document.createElement("div");
    noiseSection.hidden = true;

    const soundTypeRow = createRow("증상");
    const soundTypeInput = document.createElement("input");
    soundTypeInput.type = "text";
    soundTypeInput.placeholder = "직접 입력";
    soundTypeInput.className = "jlr-workgroup-popup-input";
    const soundTypeExample = document.createElement("p");
    soundTypeExample.className = "jlr-workgroup-popup-example";
    soundTypeExample.textContent = "예: 주행 중 끼익 소음 발생";
    soundTypeRow.append(soundTypeInput, soundTypeExample);

    const noiseLocationRow = createRow("소음 발생 위치");
    const noiseLocationInput = document.createElement("input");
    noiseLocationInput.type = "text";
    noiseLocationInput.placeholder = "직접 입력";
    noiseLocationInput.className =
      "jlr-workgroup-popup-input jlr-workgroup-popup-input-spacer";
    const noiseLocation = createCheckboxGroup([
      "엔진룸",
      "전방(앞)",
      "후방(뒤)",
      "실내(대시보드)",
      "실내(시트/도어)",
      "실외",
    ]);
    noiseLocationRow.append(noiseLocationInput, noiseLocation.container);

    const noiseConditionRow = createRow("소음 발생 조건/상황");
    const noiseConditionInput = document.createElement("input");
    noiseConditionInput.type = "text";
    noiseConditionInput.placeholder = "직접 입력";
    noiseConditionInput.className = "jlr-workgroup-popup-input";
    const noiseConditionExample = document.createElement("p");
    noiseConditionExample.className = "jlr-workgroup-popup-example";
    noiseConditionExample.textContent =
      "예: 험로/방지턱 통과 시, 선회 중(좌/우), 특정 속도 구간, 에어컨 작동 시";
    noiseConditionRow.append(noiseConditionInput, noiseConditionExample);

    const noiseReproRow = createRow("상세 내용(필요시)");
    const noiseRepro = document.createElement("textarea");
    noiseRepro.placeholder = "직접 입력";
    noiseRepro.className =
      "jlr-workgroup-popup-input jlr-workgroup-popup-textarea";
    noiseReproRow.append(noiseRepro);

    noiseSection.append(
      soundTypeRow,
      noiseLocationRow,
      noiseConditionRow,
      noiseReproRow,
    );

    [
      { value: "general", label: "일반 진단" },
      { value: "noise", label: "소음 진단" },
    ].forEach(({ value, label }) => {
      const toggleButton = document.createElement("button");
      toggleButton.type = "button";
      toggleButton.className = "jlr-workgroup-popup-toggle-button";
      toggleButton.textContent = label;
      if (value === diagType) toggleButton.classList.add("is-selected");
      toggleButton.addEventListener("click", () => {
        if (diagType === value) return;
        diagType = value;
        errorText.hidden = true;
        typeToggle
          .querySelectorAll(".jlr-workgroup-popup-toggle-button")
          .forEach((button) => button.classList.remove("is-selected"));
        toggleButton.classList.add("is-selected");
        generalSection.hidden = diagType !== "general";
        noiseSection.hidden = diagType !== "noise";
      });
      typeToggle.append(toggleButton);
    });

    typeRow.append(typeToggle);

    // 증상 확인 여부
    let confirmedValue = "";
    const confirmedRow = createRow("증상 확인 여부");
    const confirmedToggle = document.createElement("div");
    confirmedToggle.className = "jlr-workgroup-popup-toggle";

    const confirmedNoteO = document.createElement("p");
    confirmedNoteO.className = "jlr-workgroup-popup-note";
    confirmedNoteO.textContent =
      "증상을 직접 확인했으니, 테크니션에게 자세하게 설명하세요.";
    confirmedNoteO.hidden = true;

    const confirmedNoteX = document.createElement("p");
    confirmedNoteX.className =
      "jlr-workgroup-popup-note jlr-workgroup-popup-note-warning";
    confirmedNoteX.textContent =
      "고객 진술 기반 증상입니다. 테크니션에게 점검이 필요함을 알리세요.";
    confirmedNoteX.hidden = true;

    ["O", "X"].forEach((option) => {
      const toggleButton = document.createElement("button");
      toggleButton.type = "button";
      toggleButton.className = `jlr-workgroup-popup-toggle-button jlr-workgroup-popup-toggle-${option.toLowerCase()}`;
      toggleButton.textContent = option;
      toggleButton.addEventListener("click", () => {
        errorText.hidden = true;
        if (confirmedValue === option) {
          confirmedValue = "";
          toggleButton.classList.remove("is-selected");
          confirmedNoteO.hidden = true;
          confirmedNoteX.hidden = true;
          return;
        }
        confirmedValue = option;
        confirmedToggle
          .querySelectorAll(".jlr-workgroup-popup-toggle-button")
          .forEach((button) => button.classList.remove("is-selected"));
        toggleButton.classList.add("is-selected");
        confirmedNoteO.hidden = confirmedValue !== "O";
        confirmedNoteX.hidden = confirmedValue !== "X";
      });
      confirmedToggle.append(toggleButton);
    });

    confirmedRow.append(confirmedToggle);

    fieldsWrap.append(
      typeRow,
      generalSection,
      noiseSection,
      confirmedRow,
      confirmedNoteO,
      confirmedNoteX,
    );

    const actions = document.createElement("div");
    actions.className = "jlr-workgroup-popup-actions";

    const confirmButton = document.createElement("button");
    confirmButton.type = "button";
    confirmButton.className =
      "jlr-workgroup-popup-button jlr-workgroup-popup-confirm";
    confirmButton.textContent = "확인";
    confirmButton.addEventListener("click", () => {
      if (!confirmedValue) {
        errorText.textContent = "모든 항목을 입력해 주세요.";
        errorText.hidden = false;
        return;
      }

      let wrkConts = "";
      const detailLines = [];

      if (diagType === "general") {
        const symptom = symptomInput.value.trim();
        const repro = generalRepro.value.trim();
        if (!symptom || !repro) {
          errorText.textContent = "모든 항목을 입력해 주세요.";
          errorText.hidden = false;
          return;
        }
        const conditions = generalCondition.getValues();
        const conditionExtra = generalConditionInput.value.trim();
        if (conditionExtra) conditions.push(conditionExtra);
        wrkConts = `[증상]: ${symptom}`;
        detailLines.push(
          `[발생 조건/상황]: ${conditions.join(", ") || "-"}`,
          `[재현 방법 및 상세 조건]: ${repro}`,
        );
      } else {
        const soundType = soundTypeInput.value.trim();
        const repro = noiseRepro.value.trim();
        const conditionText = noiseConditionInput.value.trim();
        if (!soundType || !conditionText) {
          errorText.textContent = "모든 항목을 입력해 주세요.";
          errorText.hidden = false;
          return;
        }
        const locations = noiseLocation.getValues();
        const locationExtra = noiseLocationInput.value.trim();
        if (locationExtra) locations.push(locationExtra);
        wrkConts = `[증상]: ${soundType}`;
        detailLines.push(
          `[발생 위치]: ${locations.join(", ") || "-"}`,
          `[발생 조건/상황]: ${conditionText}`,
        );
        if (repro) detailLines.push(`[상세 내용]: ${repro}`);
      }

      detailLines.push(`[증상 확인 여부]: ${confirmedValue}`);

      closeDiagPopup();
      addWorkGroupItem(diagButton, nativeWorkGroupAddButton, {
        [WORKGROUP_FIELD]: wrkConts,
        [WORKGROUP_DETAIL_FIELD]: detailLines.join("\n"),
      });
    });

    const cancelButton = document.createElement("button");
    cancelButton.type = "button";
    cancelButton.className =
      "jlr-workgroup-popup-button jlr-workgroup-popup-cancel";
    cancelButton.textContent = "취소";
    cancelButton.addEventListener("click", () => closeDiagPopup());

    actions.append(cancelButton, confirmButton);
    popup.append(title, fieldsWrap, errorText, actions);

    const overlay = document.createElement("div");
    overlay.id = WORKGROUP_DIAG_OVERLAY_ID;
    overlay.className = "jlr-workgroup-popup-overlay";
    overlay.addEventListener("click", () => closeDiagPopup());

    document.body.append(overlay, popup);

    diagKeydownHandler = (event) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      if (document.getElementById(WORKGROUP_DIAG_ESC_CONFIRM_ID)) {
        closeEscConfirm();
      } else {
        showEscConfirm();
      }
    };
    document.addEventListener("keydown", diagKeydownHandler);
  }

  function showStatus(button, message, resetLabel, kind = "success") {
    const statusToken = String((statusSequence += 1));
    button.dataset.statusToken = statusToken;
    if (kind === "success") {
      delete button.dataset.kind;
      button.dataset.flash = "success";
      isStatusAnimating = true;
      setBulkButtonsDisabled(true);
    } else {
      button.dataset.kind = kind;
      delete button.dataset.flash;
    }
    button.textContent = message;
    window.setTimeout(() => {
      const isCurrentStatus = button.dataset.statusToken === statusToken;
      const shouldRestore =
        button.isConnected &&
        isCurrentStatus &&
        button.textContent === message;

      if (kind === "success" && !isCurrentStatus) {
        return;
      }

      if (shouldRestore) {
        button.textContent = resetLabel;
        delete button.dataset.kind;
        delete button.dataset.flash;
        delete button.dataset.statusToken;
      }

      if (kind === "success") {
        isStatusAnimating = false;
        setBulkButtonsDisabled(isWorking);
      }
    }, 1200);
  }

  function closeDeleteConfirm() {
    document.getElementById(DELETE_CONFIRM_ID)?.remove();
  }

  function closeOpinionPopup() {
    document.getElementById(OPINION_POPUP_ID)?.remove();
    document.getElementById(OPINION_OVERLAY_ID)?.remove();
    if (opinionKeydownHandler) {
      document.removeEventListener("keydown", opinionKeydownHandler);
      opinionKeydownHandler = null;
    }
  }

  function showOpinionPopup() {
    closeOpinionPopup();
    closeDeleteConfirm();
    closeDiagPopup();

    const gridElement = document.getElementById(GRID_ID);
    if (!gridElement) return;

    const items = getTemplateOpinionItems(gridElement);
    const overlay = document.createElement("div");
    overlay.id = OPINION_OVERLAY_ID;
    overlay.className = "jlr-48h-opinion-overlay";
    const hasUnsavedChanges = () =>
      Array.from(
        document.querySelectorAll(
          `#${OPINION_POPUP_ID} textarea[name='jlr48hOpinion']`,
        ),
      ).some((input) => {
        return input.value !== (input.dataset.originalSuffix || "");
      });

    const getUnsavedConfirm = () => {
      return popup.querySelector(".jlr-48h-unsaved-confirm");
    };

    const closeUnsavedConfirm = () => {
      getUnsavedConfirm()?.remove();
      closeButton?.focus();
    };

    const showUnsavedConfirm = () => {
      if (getUnsavedConfirm()) return;

      const confirmBox = document.createElement("div");
      confirmBox.className = "jlr-48h-unsaved-confirm";
      confirmBox.setAttribute("role", "dialog");
      confirmBox.setAttribute("aria-modal", "true");
      confirmBox.setAttribute("aria-labelledby", "jlr-48h-unsaved-title");
      confirmBox.addEventListener("click", (event) => {
        event.stopPropagation();
      });

      const message = document.createElement("p");
      message.id = "jlr-48h-unsaved-title";
      message.className = "jlr-48h-unsaved-message";
      message.textContent = "아직 작성중입니다. 나가시겠습니까?";

      const actions = document.createElement("div");
      actions.className = "jlr-48h-unsaved-actions";

      const leaveButton = document.createElement("button");
      leaveButton.type = "button";
      leaveButton.className =
        "jlr-48h-unsaved-button jlr-48h-unsaved-leave";
      leaveButton.textContent = "나가기";
      leaveButton.addEventListener("click", closeOpinionPopup);

      const stayButton = document.createElement("button");
      stayButton.type = "button";
      stayButton.className = "jlr-48h-unsaved-button";
      stayButton.textContent = "계속 작성";
      stayButton.addEventListener("click", closeUnsavedConfirm);

      actions.append(stayButton, leaveButton);
      confirmBox.append(message, actions);
      popup.append(confirmBox);
      stayButton.focus();
    };

    const requestCloseOpinionPopup = () => {
      if (getUnsavedConfirm()) {
        closeUnsavedConfirm();
        return;
      }
      if (hasUnsavedChanges()) {
        showUnsavedConfirm();
        return;
      }
      closeOpinionPopup();
    };

    overlay.addEventListener("click", requestCloseOpinionPopup);
    opinionKeydownHandler = (event) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      requestCloseOpinionPopup();
    };
    document.addEventListener("keydown", opinionKeydownHandler);

    const popup = document.createElement("div");
    popup.id = OPINION_POPUP_ID;
    popup.className = "jlr-48h-opinion-popup";
    popup.setAttribute("role", "dialog");
    popup.setAttribute("aria-modal", "true");
    popup.setAttribute("aria-labelledby", "jlr-48h-opinion-title");

    const header = document.createElement("div");
    header.className = "jlr-48h-opinion-header";

    const title = document.createElement("h2");
    title.id = "jlr-48h-opinion-title";
    const titleWrap = document.createElement("div");
    titleWrap.className = "jlr-48h-opinion-title-wrap";
    titleWrap.append(title);
    const hasDisabledItems = items.some((item) => !item.exists);
    const inputStateNote = document.createElement("span");
    inputStateNote.className = "jlr-48h-opinion-state-note";
    inputStateNote.dataset.state = hasDisabledItems ? "disabled" : "enabled";
    inputStateNote.textContent = hasDisabledItems
      ? "입력이 없어 비활성화 상태입니다."
      : "입력이 가능한 상태입니다.";
    titleWrap.append(inputStateNote);
    title.textContent = "내부의견 전체보기";

    const headerActions = document.createElement("div");
    headerActions.className = "jlr-48h-opinion-header-actions";

    const saveButton = document.createElement("button");
    saveButton.type = "button";
    saveButton.className = "jlr-48h-opinion-save";
    saveButton.textContent = "수정 적용";

    const closeButton = document.createElement("button");
    closeButton.type = "button";
    closeButton.className = "jlr-48h-opinion-close";
    closeButton.textContent = "닫기";
    closeButton.addEventListener("click", requestCloseOpinionPopup);

    const list = document.createElement("ol");
    list.className = "jlr-48h-opinion-list";

    items.forEach((item) => {
      const row = document.createElement("li");
      row.className = "jlr-48h-opinion-item";
      if (!item.exists) {
        row.dataset.missing = "true";
      }

      const number = document.createElement("span");
      number.className = "jlr-48h-opinion-number";
      number.textContent = String(item.number);

      const prefixValue = `${item.key} - `;
      const suffixValue = item.text.startsWith(prefixValue)
        ? item.text.slice(prefixValue.length)
        : "";
      const prefix = document.createElement("span");
      prefix.className = "jlr-48h-opinion-prefix";
      prefix.textContent = prefixValue;

      const text = document.createElement("textarea");
      text.className = "jlr-48h-opinion-text";
      text.name = "jlr48hOpinion";
      text.value = suffixValue;
      text.rows = 1;
      text.dataset.key = item.key;
      text.dataset.prefix = prefixValue;
      text.dataset.originalValue = item.text;
      text.dataset.originalSuffix = suffixValue;
      text.disabled = !item.exists;
      text.setAttribute("aria-label", `${item.number}번 내부의견 상세 내용`);
      text.addEventListener("focus", () => {
        const end = text.value.length;
        text.setSelectionRange(end, end);
      });

      row.append(number, prefix, text);
      if (item.number === 6) {
        const autoNote = document.createElement("span");
        autoNote.className = "jlr-48h-opinion-auto-note";
        autoNote.textContent = "(자동으로 감지하여 입력됨)";
        row.append(autoNote);
      }
      list.append(row);
    });

    const status = document.createElement("p");
    status.className = "jlr-48h-opinion-status";
    status.setAttribute("role", "status");
    status.hidden = true;

    saveButton.addEventListener("click", async () => {
      if (isWorking) return;

      const inputs = Array.from(
        popup.querySelectorAll("textarea[name='jlr48hOpinion']"),
      );
      const changes = inputs
        .filter((input) => !input.disabled)
        .map((input) => ({
          key: input.dataset.key,
          input,
          prefix: input.dataset.prefix || `${input.dataset.key} - `,
          originalValue: input.dataset.originalValue || "",
          originalSuffix: input.dataset.originalSuffix || "",
          suffix: input.value.trim(),
          value: `${input.dataset.prefix || `${input.dataset.key} - `}${input.value.trim()}`,
        }))
        .filter((change) => change.input.value !== change.originalSuffix);

      if (changes.some((change) => !change.suffix)) {
        status.hidden = false;
        status.dataset.kind = "error";
        status.textContent = "빈 항목은 저장할 수 없습니다.";
        return;
      }

      if (changes.length === 0) {
        status.hidden = false;
        status.dataset.kind = "info";
        status.textContent = "변경된 항목이 없습니다.";
        return;
      }

      isWorking = true;
      saveButton.disabled = true;
      setBulkButtonsDisabled(true);

      try {
        let updatedCount = 0;
        for (const change of changes) {
          const row = getOpinionRows(gridElement).find((candidate) => {
            const savedOpinion =
              candidate.querySelector("td")?.textContent?.trim() || "";
            return (
              savedOpinion === change.key ||
              savedOpinion.startsWith(`${change.key} -`) ||
              savedOpinion === change.originalValue
            );
          });

          if (!row) {
            throw new Error(`${change.key} 행을 찾지 못했습니다.`);
          }

          await editOpinionRow(row, change.value);
          change.input.dataset.originalValue = change.value;
          change.input.dataset.originalSuffix = change.input.value;
          updatedCount += 1;
        }

        status.hidden = false;
        status.dataset.kind = "success";
        status.textContent = `${updatedCount}건 수정했습니다. DMS 저장 버튼을 눌러 최종 저장하세요.`;
      } catch (error) {
        console.error("[48시간 내부의견] 전체보기 행 수정 실패", error);
        status.hidden = false;
        status.dataset.kind = "error";
        status.textContent = "수정하지 못했습니다. 표에서 해당 행을 확인해 주세요.";
      } finally {
        isWorking = false;
        saveButton.disabled = false;
        setBulkButtonsDisabled(false);
      }
    });

    headerActions.append(saveButton, closeButton);
    header.append(titleWrap, headerActions);
    popup.append(header, list, status);
    document.body.append(overlay, popup);
    popup.querySelector("textarea:not(:disabled)")?.focus();
  }

  async function addAllOpinions(button, nativeAddButton) {
    if (isWorking) return;

    const gridElement = document.getElementById(GRID_ID);
    if (!gridElement) {
      showStatus(button, "그리드 확인 필요", "48시간 일괄추가", "error");
      return;
    }

    const missing = findMissingOpinions(gridElement);
    if (missing.length === 0) {
      showStatus(button, "이미 추가됨", "48시간 일괄추가", "info");
      return;
    }

    isWorking = true;
    setBulkButtonsDisabled(true);

    try {
      const insertionOrder = [...missing].reverse();
      for (let index = 0; index < insertionOrder.length; index += 1) {
        button.textContent = `${index + 1}/${insertionOrder.length} 추가 중`;
        await addOpinion(
          nativeAddButton,
          gridElement,
          buildOpinionValue(insertionOrder[index]),
        );
      }
      showStatus(button, `${missing.length}건 추가 완료`, "48시간 일괄추가");
    } catch (error) {
      console.error("[48시간 내부의견] 일괄 추가 실패", error);
      showStatus(button, "추가 실패", "48시간 일괄추가", "error");
    } finally {
      isWorking = false;
      setBulkButtonsDisabled(false);
    }
  }

  function setBulkButtonsDisabled(disabled) {
    document
      .querySelectorAll(".jlr-48h-button, .jlr-workgroup-button")
      .forEach((button) => {
        button.disabled = disabled || isStatusAnimating;
      });
  }

  async function deleteAllOpinions(button, nativeDeleteButton) {
    if (isWorking) return;

    closeDeleteConfirm();

    const gridElement = document.getElementById(GRID_ID);
    if (!gridElement) {
      showStatus(button, "그리드 확인 필요", "일괄삭제", "error");
      return;
    }

    const initialCount = findTemplateRows(gridElement).length;
    if (initialCount === 0) {
      showStatus(button, "삭제할 항목 없음", "일괄삭제", "info");
      return;
    }

    isWorking = true;
    setBulkButtonsDisabled(true);

    try {
      for (let index = 0; index < initialCount; index += 1) {
        button.textContent = `${index + 1}/${initialCount} 삭제 중`;
        const targetRow = findTemplateRows(gridElement)[0];
        if (!targetRow) break;

        targetRow.click();
        await nextFrame();
        nativeDeleteButton.click();
        await nextFrame();

        if (targetRow.isConnected) {
          throw new Error("내부의견 행이 삭제되지 않았습니다.");
        }
      }

      showStatus(button, `${initialCount}건 삭제 완료`, "일괄삭제");
    } catch (error) {
      console.error("[48시간 내부의견] 일괄 삭제 실패", error);
      showStatus(button, "삭제 실패", "일괄삭제", "error");
    } finally {
      isWorking = false;
      setBulkButtonsDisabled(false);
    }
  }

  function showDeleteConfirm(deleteButton, nativeDeleteButton) {
    if (isWorking) return;

    closeDeleteConfirm();
    closeDiagPopup();

    const gridElement = document.getElementById(GRID_ID);
    if (!gridElement) {
      showStatus(deleteButton, "그리드 확인 필요", "일괄삭제", "error");
      return;
    }

    const deleteCount = findTemplateRows(gridElement).length;
    if (deleteCount === 0) {
      showStatus(deleteButton, "삭제할 항목 없음", "일괄삭제", "info");
      return;
    }

    const confirmBox = document.createElement("span");
    confirmBox.id = DELETE_CONFIRM_ID;
    confirmBox.className = "jlr-48h-confirm";

    const message = document.createElement("span");
    message.className = "jlr-48h-confirm-message";
    message.textContent = `${deleteCount}건 삭제할까요?`;

    const confirmButton = document.createElement("button");
    confirmButton.type = "button";
    confirmButton.className = "jlr-48h-confirm-button jlr-48h-confirm-ok";
    confirmButton.textContent = "삭제";
    confirmButton.addEventListener("click", () =>
      deleteAllOpinions(deleteButton, nativeDeleteButton),
    );

    const cancelButton = document.createElement("button");
    cancelButton.type = "button";
    cancelButton.className = "jlr-48h-confirm-button jlr-48h-confirm-cancel";
    cancelButton.textContent = "취소";
    cancelButton.addEventListener("click", () => {
      closeDeleteConfirm();
      showStatus(deleteButton, "삭제 취소", "일괄삭제", "info");
    });

    confirmBox.append(message, confirmButton, cancelButton);
    deleteButton.after(confirmBox);
  }

  function installButton() {
    if (
      document.getElementById(BUTTON_ID) &&
      document.getElementById(DELETE_BUTTON_ID) &&
      document.getElementById(VIEW_BUTTON_ID)
    )
      return;

    const nativeAddButton = document.getElementById(NATIVE_ADD_BUTTON_ID);
    const nativeDeleteButton = document.getElementById(NATIVE_DELETE_BUTTON_ID);
    const gridElement = document.getElementById(GRID_ID);
    if (!nativeAddButton || !nativeDeleteButton || !gridElement) return;

    document.getElementById(BUTTON_ID)?.remove();
    document.getElementById(DELETE_BUTTON_ID)?.remove();
    document.getElementById(VIEW_BUTTON_ID)?.remove();
    closeDeleteConfirm();

    const deleteButton = document.createElement("button");
    deleteButton.id = DELETE_BUTTON_ID;
    deleteButton.type = "button";
    deleteButton.className =
      "btn k-button jlr-48h-button jlr-48h-delete-button";
    deleteButton.textContent = "일괄삭제";
    deleteButton.setAttribute(
      "aria-label",
      "48시간 내부의견 1번부터 12번까지 일괄삭제",
    );
    deleteButton.addEventListener("click", () =>
      showDeleteConfirm(deleteButton, nativeDeleteButton),
    );

    const button = document.createElement("button");
    button.id = BUTTON_ID;
    button.type = "button";
    button.className = "btn k-button jlr-48h-button";
    button.textContent = "48시간 일괄추가";
    button.setAttribute("aria-label", "48시간 내부의견 12건 일괄추가");
    button.addEventListener("click", () =>
      addAllOpinions(button, nativeAddButton),
    );

    const viewButton = document.createElement("button");
    viewButton.id = VIEW_BUTTON_ID;
    viewButton.type = "button";
    viewButton.className = "btn k-button jlr-48h-button jlr-48h-view-button";
    viewButton.textContent = "전체보기";
    viewButton.setAttribute("aria-label", "48시간 내부의견 전체보기");
    viewButton.addEventListener("click", showOpinionPopup);

    nativeAddButton.before(viewButton, button, deleteButton);
  }

  function installWorkGroupButtons() {
    if (document.getElementById(WORKGROUP_DIAG_BUTTON_ID)) return;

    const nativeWorkGroupAddButton = document.getElementById(
      NATIVE_WORKGROUP_ADD_BUTTON_ID,
    );
    const workGroupGridElement = document.getElementById(WORKGROUP_GRID_ID);
    if (!nativeWorkGroupAddButton || !workGroupGridElement) return;

    document.getElementById(WORKGROUP_DIAG_BUTTON_ID)?.remove();
    closeDiagPopup();

    const diagButton = document.createElement("button");
    diagButton.id = WORKGROUP_DIAG_BUTTON_ID;
    diagButton.type = "button";
    diagButton.className = "btn k-button jlr-workgroup-button";
    diagButton.textContent = "진단 내용 입력";
    diagButton.dataset.resetLabel = "진단 내용 입력";
    diagButton.setAttribute("aria-label", "작업그룹 진단 내용 입력");
    diagButton.addEventListener("click", () =>
      showDiagPopup(diagButton, nativeWorkGroupAddButton),
    );

    nativeWorkGroupAddButton.before(diagButton);
  }

  function uninstallReminderColumn(gridElement) {
    document.getElementById(REMINDER_COLUMN_HEADER_ID)?.remove();
    gridElement?.querySelectorAll(".jlr-reminder-cell").forEach((cell) => cell.remove());
    reminderRowStatus.clear();
    manualReminderSelections.clear();
  }

  function installReminderColumn() {
    const gridElement = document.getElementById(REMINDER_GRID_ID);
    if (!gridElement) return;

    if ((!isReception && !isAdmin) || !reminderActive) {
      uninstallReminderColumn(gridElement);
      return;
    }

    const headerRow = gridElement.querySelector(".k-grid-header thead tr");
    const headerColgroup = gridElement.querySelector(".k-grid-header colgroup");
    const contentColgroup = gridElement.querySelector(".k-grid-content colgroup");
    const bodyRows = Array.from(
      gridElement.querySelectorAll(".k-grid-content tbody tr"),
    );
    if (!headerRow || !headerColgroup || !contentColgroup || bodyRows.length === 0) {
      return;
    }

    const resvNoColumnId = getFieldColumnId(gridElement, "resvNo");
    const resvNoTh = resvNoColumnId
      ? document.getElementById(resvNoColumnId)
      : null;
    const resvStatColumnId = getFieldColumnId(gridElement, "resvStatNm");

    if (!document.getElementById(REMINDER_COLUMN_HEADER_ID) && resvNoTh) {
      const headerThs = Array.from(headerRow.children);
      const resvNoIndex = headerThs.indexOf(resvNoTh);

      const headerCol = document.createElement("col");
      headerCol.style.width = "210px";
      const contentCol = document.createElement("col");
      contentCol.style.width = "210px";

      if (resvNoIndex >= 0 && headerColgroup.children[resvNoIndex]) {
        headerColgroup.children[resvNoIndex].after(headerCol);
        contentColgroup.children[resvNoIndex]?.after(contentCol);
      } else {
        headerColgroup.append(headerCol);
        contentColgroup.append(contentCol);
      }

      const th = document.createElement("th");
      th.id = REMINDER_COLUMN_HEADER_ID;
      th.className = "k-header";
      th.setAttribute("scope", "col");
      th.setAttribute("role", "columnheader");
      th.textContent = "리마인드";
      resvNoTh.after(th);
    }

    bodyRows.forEach((row) => {
      if (row.querySelector(".jlr-reminder-cell")) return;

      const uid = row.dataset.uid;
      const anchorCell = resvNoColumnId
        ? row.querySelector(`td[aria-describedby="${resvNoColumnId}"]`)
        : null;

      const cell = document.createElement("td");
      cell.className = "jlr-reminder-cell";
      cell.setAttribute("aria-describedby", REMINDER_COLUMN_HEADER_ID);
      cell.setAttribute("role", "gridcell");

      const statusText = resvStatColumnId
        ? row
            .querySelector(`td[aria-describedby="${resvStatColumnId}"]`)
            ?.textContent?.trim()
        : "";

      if (statusText && statusText.includes("취소")) {
        reminderRowStatus.set(uid, "취소");
        const cancelledNote = document.createElement("span");
        cancelledNote.className = "jlr-reminder-cancelled-note";
        cancelledNote.textContent = "예약취소됨";
        cell.append(cancelledNote);

        if (anchorCell) {
          anchorCell.after(cell);
        } else {
          row.append(cell);
        }
        return;
      }

      const group = document.createElement("div");
      group.className = "jlr-reminder-button-group";

      REMINDER_STATUS_OPTIONS.forEach((label) => {
        const statusButton = document.createElement("button");
        statusButton.type = "button";
        statusButton.className = "jlr-reminder-status-button";
        statusButton.dataset.status = label;
        statusButton.textContent = label;
        if (reminderRowStatus.get(uid) === label) {
          statusButton.classList.add("is-selected");
        }
        statusButton.addEventListener("click", () => {
          const current = reminderRowStatus.get(uid);
          if (current === label) {
            reminderRowStatus.delete(uid);
            manualReminderSelections.delete(uid);
          } else {
            reminderRowStatus.set(uid, label);
            manualReminderSelections.add(uid);
          }
          group
            .querySelectorAll(".jlr-reminder-status-button")
            .forEach((button) => {
              button.classList.toggle(
                "is-selected",
                reminderRowStatus.get(uid) === button.dataset.status,
              );
            });
        });
        group.append(statusButton);
      });

      cell.append(group);
      if (anchorCell) {
        anchorCell.after(cell);
      } else {
        row.append(cell);
      }
    });
  }

  function closeReminderPopup() {
    document.getElementById(REMINDER_POPUP_ID)?.remove();
    document.getElementById(REMINDER_OVERLAY_ID)?.remove();
  }

  function buildReminderSummaryText(gridElement) {
    const rnumColumnId = getFieldColumnId(gridElement, "rnum");
    const dtimeColumnId = getFieldColumnId(gridElement, "resvDtime");
    const resvStatColumnId = getFieldColumnId(gridElement, "resvStatNm");
    const saColumnId = getColumnIdByHeaderText(gridElement, "SA");
    if (!rnumColumnId || !dtimeColumnId) return "";

    const rows = Array.from(
      gridElement.querySelectorAll(".k-grid-content tbody tr"),
    );

    const allRows = rows
      .map((row) => {
        const no = row
          .querySelector(`td[aria-describedby="${rnumColumnId}"]`)
          ?.textContent?.trim();
        const dtimeText = row
          .querySelector(`td[aria-describedby="${dtimeColumnId}"]`)
          ?.textContent?.trim();
        if (!no || !dtimeText) return null;

        const [datePart, timePart] = dtimeText.split(" ");
        const hour = Number((timePart || "00:00").split(":")[0]);
        if (!datePart || Number.isNaN(hour)) return null;

        const statusText = resvStatColumnId
          ? row
              .querySelector(`td[aria-describedby="${resvStatColumnId}"]`)
              ?.textContent?.trim()
          : "";
        const saText = saColumnId
          ? row
              .querySelector(`td[aria-describedby="${saColumnId}"]`)
              ?.textContent?.trim()
          : "";
        const excluded =
          (statusText && statusText.includes("취소")) || saText === "김상우";

        return {
          no: Number(no),
          status: reminderRowStatus.get(row.dataset.uid),
          datePart,
          hour,
          excluded,
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.no - b.no);

    const entries = allRows
      .filter((row) => !row.excluded)
      .map((row, index) => ({ ...row, no: index + 1 }))
      .filter((row) => row.status);

    if (entries.length === 0) return "";

    const dateObj = new Date(`${entries[0].datePart}T00:00:00`);
    const title = `${dateObj.getMonth() + 1}월${dateObj.getDate()}일 (${WEEKDAY_NAMES[dateObj.getDay()]}) 예약자 리마인드현황`;

    const groupLines = (list) => {
      const lines = [];
      let rangeStart = null;
      let rangeEnd = null;
      let rangeStatus = null;

      const flush = () => {
        if (rangeStart === null) return;
        lines.push(
          rangeStart === rangeEnd
            ? `${rangeStart}번 ${rangeStatus}`
            : `${rangeStart}번 ~ ${rangeEnd}번 ${rangeStatus}`,
        );
      };

      list.forEach((entry) => {
        if (rangeStatus === entry.status && rangeEnd === entry.no - 1) {
          rangeEnd = entry.no;
        } else {
          flush();
          rangeStart = entry.no;
          rangeEnd = entry.no;
          rangeStatus = entry.status;
        }
      });
      flush();

      return lines;
    };

    const lines = [title];
    const amEntries = entries.filter((entry) => entry.hour < 12);
    const pmEntries = entries.filter((entry) => entry.hour >= 12);

    if (amEntries.length) {
      lines.push("_____오전_____", ...groupLines(amEntries));
    }
    if (pmEntries.length) {
      lines.push("_____오후_____", ...groupLines(pmEntries));
    }

    return lines.join("\n");
  }

  function showReminderSummaryPopup() {
    const gridElement = document.getElementById(REMINDER_GRID_ID);
    if (!gridElement) return;

    closeReminderPopup();
    closeDiagPopup();
    closeDeleteConfirm();

    const text = buildReminderSummaryText(gridElement);

    const popup = document.createElement("div");
    popup.id = REMINDER_POPUP_ID;
    popup.className = "jlr-workgroup-popup jlr-reminder-summary-popup";

    const title = document.createElement("p");
    title.className = "jlr-workgroup-popup-title";
    title.textContent = "리마인드 결과 정리";

    const textarea = document.createElement("textarea");
    textarea.className =
      "jlr-workgroup-popup-input jlr-workgroup-popup-textarea jlr-reminder-summary-textarea";
    textarea.value = text || "선택된 항목이 없습니다.";

    const actions = document.createElement("div");
    actions.className = "jlr-workgroup-popup-actions";

    const closeButton = document.createElement("button");
    closeButton.type = "button";
    closeButton.className =
      "jlr-workgroup-popup-button jlr-workgroup-popup-cancel";
    closeButton.textContent = "닫기";
    closeButton.addEventListener("click", closeReminderPopup);

    const copyButton = document.createElement("button");
    copyButton.type = "button";
    copyButton.className =
      "jlr-workgroup-popup-button jlr-workgroup-popup-confirm";
    copyButton.textContent = "복사";

    const copyToClipboard = async () => {
      try {
        await navigator.clipboard.writeText(textarea.value);
      } catch (error) {
        textarea.select();
        document.execCommand("copy");
      }
    };

    const flashCopied = () => {
      copyButton.textContent = "복사 완료";
      window.setTimeout(() => {
        copyButton.textContent = "복사";
      }, 1200);
    };

    copyButton.addEventListener("click", async () => {
      await copyToClipboard();
      flashCopied();
    });

    actions.append(closeButton, copyButton);
    popup.append(title, textarea, actions);

    const overlay = document.createElement("div");
    overlay.id = REMINDER_OVERLAY_ID;
    overlay.className = "jlr-workgroup-popup-overlay";
    overlay.addEventListener("click", closeReminderPopup);

    document.body.append(overlay, popup);

    if (text) {
      copyToClipboard().then(flashCopied);
    }
  }

  function installReminderToggleButton() {
    const visible =
      (isReception && receptionReminderButtonEnabled) ||
      (isAdmin && adminReminderButtonEnabled);
    if (!visible) {
      document.getElementById(REMINDER_TOGGLE_BUTTON_ID)?.remove();
      return;
    }

    const existingButton = document.getElementById(REMINDER_TOGGLE_BUTTON_ID);
    if (existingButton) {
      existingButton.textContent = reminderActive ? "리마인드 종료" : "리마인드 시작";
      return;
    }

    const custChangeButton = document.getElementById("btnCustChange");
    if (!custChangeButton) return;

    const toggleButton = document.createElement("button");
    toggleButton.type = "button";
    toggleButton.id = REMINDER_TOGGLE_BUTTON_ID;
    toggleButton.className = "btn k-button jlr-workgroup-button";
    toggleButton.textContent = reminderActive ? "리마인드 종료" : "리마인드 시작";
    toggleButton.addEventListener("click", async () => {
      try {
        await chrome.storage.local.set({ reminderActive: !reminderActive });
      } catch (error) {
        console.error("[리마인드] 상태 변경 실패", error);
      }
    });

    custChangeButton.before(toggleButton);

    const nativeHeight = custChangeButton.getBoundingClientRect().height;
    if (nativeHeight > 0) {
      toggleButton.style.height = `${nativeHeight}px`;
      toggleButton.style.minHeight = `${nativeHeight}px`;
    }
  }

  async function selectClaimTaskOption() {
    const wrapper = document.querySelector(
      `#${TYPE_CHANGE_AREA_ID} .k-dropdown`,
    );
    if (!wrapper) return;

    wrapper.click();
    await nextFrame();
    await nextFrame();

    const listbox = document.getElementById(TYPE_CHANGE_LISTBOX_ID);
    const items = listbox
      ? Array.from(listbox.querySelectorAll("li"))
      : [];
    const target = items.find(
      (li) => li.textContent?.trim() === CLAIM_TASK_OPTION_TEXT,
    );
    if (!target) {
      wrapper.click();
      return;
    }

    target.click();
  }

  async function selectWarrantyBrandOption(optionText) {
    const select = document.getElementById(WARRANTY_BRAND_SELECT_ID);
    const wrapper = select?.closest(".k-widget.k-dropdown");
    if (!wrapper) return false;

    wrapper.click();
    await nextFrame();
    await nextFrame();

    const listbox = document.getElementById(WARRANTY_BRAND_LISTBOX_ID);
    const items = listbox ? Array.from(listbox.querySelectorAll("li")) : [];
    const target = items.find((li) => li.textContent?.trim() === optionText);
    if (!target) {
      wrapper.click();
      return false;
    }

    target.click();
    await nextFrame();
    return true;
  }

  async function applyWarrantyBrandFilter(optionText) {
    const selected = await selectWarrantyBrandOption(optionText);
    if (!selected) return;
    document.getElementById(WARRANTY_CLAIM_STATUS_BUTTON_ID)?.click();
  }

  function isRoSettlementPage() {
    return document.body?.innerText?.includes("RO정산관리") ?? false;
  }

  function installClaimTaskButton() {
    const area = document.getElementById(TYPE_CHANGE_AREA_ID);
    const existing = document.getElementById(CLAIM_TASK_BUTTON_ID);

    if (!area || !isAdmin || !claimTaskButtonEnabled || !isRoSettlementPage()) {
      existing?.remove();
      return;
    }

    if (existing) return;

    const button = document.createElement("button");
    button.type = "button";
    button.id = CLAIM_TASK_BUTTON_ID;
    button.className = "btn k-button jlr-claim-task-button";
    button.textContent = "클레임";
    button.addEventListener("click", () => {
      selectClaimTaskOption();
    });

    area.prepend(button);

    const dropdownHeight = area
      .querySelector(".k-dropdown")
      ?.getBoundingClientRect().height;
    if (dropdownHeight > 0) {
      button.style.height = `${dropdownHeight}px`;
      button.style.minHeight = `${dropdownHeight}px`;
    }
  }

  function installGrpCodeQuickButtons() {
    const area = document.getElementById(GRP_CODE_AREA_ID);
    const input = document.getElementById(GRP_CODE_FIELD_ID);
    const applyButton = document.getElementById(GRP_CODE_APPLY_BUTTON_ID);
    const existing = document.getElementById(GRP_CODE_QUICK_BUTTON_GROUP_ID);

    if (
      !area ||
      !input ||
      !applyButton ||
      !isAdmin ||
      !claimTaskButtonEnabled
    ) {
      existing?.remove();
      return;
    }

    if (existing) return;

    const group = document.createElement("div");
    group.id = GRP_CODE_QUICK_BUTTON_GROUP_ID;
    group.className = "jlr-grp-code-quick-buttons";

    GRP_CODE_QUICK_LETTERS.forEach((letter) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "btn k-button jlr-grp-code-quick-button";
      button.textContent = letter;
      button.addEventListener("click", () => {
        setEditorValue(input, letter);
        applyButton.click();
      });
      group.append(button);
    });

    area.prepend(group);
  }

  function installWarrantyBrandButtons() {
    const statusButton = document.getElementById(
      WARRANTY_CLAIM_STATUS_BUTTON_ID,
    );
    const group = statusButton?.closest(".btn-group");

    if (!group || !isAdmin || !warrantyBrandButtonEnabled) {
      WARRANTY_BRAND_OPTIONS.forEach((option) => {
        document.getElementById(option.id)?.remove();
      });
      return;
    }

    WARRANTY_BRAND_OPTIONS.forEach((option) => {
      if (document.getElementById(option.id)) return;

      const button = document.createElement("button");
      button.type = "button";
      button.id = option.id;
      button.className = "btn btn-default k-primary k-button jlr-warranty-brand-button";
      button.textContent = option.label;
      button.addEventListener("click", () => {
        applyWarrantyBrandFilter(option.optionText);
      });

      statusButton.before(button);
    });
  }

  function installDownloadReasonButton() {
    const agreeCheckbox = document.getElementById(DOWNLOAD_REASON_AGREE_ID);
    const textarea = document.getElementById(DOWNLOAD_REASON_TEXTAREA_ID);
    const footer = agreeCheckbox?.closest(".window-content")
      ?.querySelector(".window-content-footer .btn-group");
    if (!agreeCheckbox || !textarea || !footer) return;
    if (document.getElementById(DOWNLOAD_REASON_BUTTON_ID)) return;

    const button = document.createElement("button");
    button.type = "button";
    button.id = DOWNLOAD_REASON_BUTTON_ID;
    button.className = "btn btn-small k-button jlr-download-reason-button";
    button.textContent = "예약지";
    button.addEventListener("click", () => {
      if (!agreeCheckbox.checked) {
        agreeCheckbox.click();
      }
      setEditorValue(textarea, DOWNLOAD_REASON_TEXT);
    });

    footer.prepend(button);
  }

  function installAll() {
    installButton();
    installWorkGroupButtons();
    installGrpCodeGuard();
    installReminderColumn();
    installReminderToggleButton();
    installClaimTaskButton();
    installGrpCodeQuickButtons();
    installWarrantyBrandButtons();
    installDownloadReasonButton();
  }

  async function initialize() {
    await syncRemoteSettings();
    await Promise.all([loadOpinions(), loadAdminFlags()]);
    installAll();
  }

  initialize().catch((error) => {
    console.error("[JLR 유틸] 초기화 실패", error);
    installAll();
  });

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "local") return;
    if (changes.opinions) loadOpinions();
    if (changes.isAdmin) {
      isAdmin = Boolean(changes.isAdmin.newValue);
      installClaimTaskButton();
      installGrpCodeQuickButtons();
      installWarrantyBrandButtons();
      installReminderColumn();
      installReminderToggleButton();
    }
    if (changes.grpCodeUppercaseLock) {
      grpCodeUppercaseLock = Boolean(changes.grpCodeUppercaseLock.newValue);
    }
    if (changes.claimTaskButtonEnabled) {
      claimTaskButtonEnabled = Boolean(changes.claimTaskButtonEnabled.newValue);
      installClaimTaskButton();
      installGrpCodeQuickButtons();
    }
    if (changes.adminReminderButtonEnabled) {
      adminReminderButtonEnabled = Boolean(
        changes.adminReminderButtonEnabled.newValue,
      );
      installReminderToggleButton();
    }
    if (changes.receptionReminderButtonEnabled) {
      receptionReminderButtonEnabled = Boolean(
        changes.receptionReminderButtonEnabled.newValue,
      );
      installReminderToggleButton();
    }
    if (changes.warrantyBrandButtonEnabled) {
      warrantyBrandButtonEnabled = Boolean(
        changes.warrantyBrandButtonEnabled.newValue,
      );
      installWarrantyBrandButtons();
    }
    if (changes.isReception) {
      isReception = Boolean(changes.isReception.newValue);
      installReminderColumn();
      installReminderToggleButton();
    }
    if (changes.reminderActive) {
      const next = Boolean(changes.reminderActive.newValue);
      if (!next && reminderActive && manualReminderSelections.size > 0) {
        showReminderSummaryPopup();
      }
      reminderActive = next;
      installReminderColumn();
      installReminderToggleButton();
    }
  });

  let installAllScheduled = false;
  function scheduleInstallAll() {
    if (installAllScheduled) return;
    installAllScheduled = true;
    window.requestAnimationFrame(() => {
      installAllScheduled = false;
      installAll();
    });
  }

  const observer = new MutationObserver(scheduleInstallAll);
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
})();
