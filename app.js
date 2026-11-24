const state = {
  activeTab: "chat",
  slots: {
    scene: null,
    budget: null,
    device: null,
    priority: null,
    audience: null,
    avoid: []
  },
  questionCount: 0,
  hasResults: false,
  recommendations: [],
  compare: [],
  catalogFilter: "all",
  catalogStyle: "all",
  catalogSort: "recommended",
  catalogSearch: "",
  operatorReady: false,
  strategy: null
};

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const els = {
  miniApp: $("#miniApp"),
  headerTitle: $("#headerTitle"),
  resetButton: $("#resetButton"),
  chatPage: $("#chatPage"),
  catalogPage: $("#catalogPage"),
  operatorPage: $("#operatorPage"),
  chatScroll: $("#chatScroll"),
  brandHero: $("#brandHero"),
  messages: $("#messages"),
  quickReplies: $("#quickReplies"),
  chatForm: $("#chatForm"),
  chatInput: $("#chatInput"),
  composerPlus: $("#composerPlus"),
  clarityLabel: $("#clarityLabel"),
  slotRow: $("#slotRow"),
  resultSection: $("#resultSection"),
  resultTitle: $("#resultTitle"),
  resultSubtitle: $("#resultSubtitle"),
  matchSummary: $("#matchSummary"),
  recommendationList: $("#recommendationList"),
  notRecommend: $("#notRecommend"),
  openCompareButton: $("#openCompareButton"),
  compareCount: $("#compareCount"),
  catalogGrid: $("#catalogGrid"),
  catalogCount: $("#catalogCount"),
  catalogSearch: $("#catalogSearch"),
  catalogFilters: $("#catalogFilters"),
  catalogStyleFilters: $("#catalogStyleFilters"),
  sortButton: $("#sortButton"),
  operatorMessages: $("#operatorMessages"),
  operatorQuick: $("#operatorQuick"),
  operatorForm: $("#operatorForm"),
  operatorInput: $("#operatorInput"),
  strategyCard: $("#strategyCard"),
  strategyTitle: $("#strategyTitle"),
  strategyContent: $("#strategyContent"),
  downloadPlanButton: $("#downloadPlanButton"),
  sheetBackdrop: $("#sheetBackdrop"),
  detailSheet: $("#detailSheet"),
  detailSheetContent: $("#detailSheetContent"),
  detailSheetClose: $("#detailSheetClose"),
  compareSheet: $("#compareSheet"),
  compareSheetContent: $("#compareSheetContent"),
  compareSheetClose: $("#compareSheetClose"),
  toast: $("#toast")
};

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function showToast(text) {
  els.toast.textContent = text;
  els.toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => els.toast.classList.remove("show"), 1800);
}

function productById(id) {
  return PRODUCTS.find((product) => product.id === id);
}

function formatCny(value) {
  return `¥${value.toLocaleString("zh-CN")}`;
}

function scrollChatToEnd() {
  requestAnimationFrame(() => {
    els.chatScroll.scrollTo({ top: els.chatScroll.scrollHeight, behavior: "smooth" });
  });
}

function scrollToResults() {
  const scrollRect = els.chatScroll.getBoundingClientRect();
  const resultRect = els.resultSection.getBoundingClientRect();
  const target = Math.max(0, els.chatScroll.scrollTop + resultRect.top - scrollRect.top - 8);
  els.chatScroll.scrollTo({ top: target, behavior: "auto" });
}

function addMessage(role, text, meta = []) {
  const row = document.createElement("div");
  row.className = `message-row ${role === "user" ? "user" : "assistant"}`;
  row.innerHTML = `
    ${role === "assistant" ? `<span class="ai-avatar">AI</span>` : ""}
    <div class="message-bubble">
      <p>${text}</p>
      ${meta.length ? `<div class="message-meta">${meta.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}</div>` : ""}
    </div>
  `;
  els.messages.appendChild(row);
  scrollChatToEnd();
}

async function addAiMessage(text, meta = [], delay = 420) {
  const row = document.createElement("div");
  row.className = "message-row assistant typing-row";
  row.innerHTML = `
    <span class="ai-avatar">AI</span>
    <div class="message-bubble"><span class="typing"><i></i><i></i><i></i></span></div>
  `;
  els.messages.appendChild(row);
  scrollChatToEnd();
  await sleep(delay);
  row.remove();
  addMessage("assistant", text, meta);
}

function setQuickReplies(items) {
  els.quickReplies.innerHTML = "";
  items.forEach((label) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "quick-reply";
    button.textContent = label;
    button.addEventListener("click", () => handleUserInput(label));
    els.quickReplies.appendChild(button);
  });
}

function updateSlots() {
  const values = {
    scene: state.slots.scene,
    budget: state.slots.budget == null ? null : state.slots.budget === "不限" ? "不限" : `${state.slots.budget} 元内`,
    audience: state.slots.audience,
    priority: state.slots.priority,
    avoid: state.slots.avoid.length ? state.slots.avoid.join("、") : null
  };
  const labels = { scene: "用途", budget: "预算", audience: "受众", priority: "风格", avoid: "禁忌" };
  $$(".slot-chip", els.slotRow).forEach((chip) => {
    const key = chip.dataset.slot;
    const hasValue = Boolean(values[key]);
    chip.classList.toggle("empty", !hasValue);
    chip.textContent = hasValue ? `${labels[key]} · ${values[key]}` : labels[key];
  });
  const count = ["scene", "budget", "audience", "priority", "avoid"].filter((key) => values[key]).length;
  els.clarityLabel.textContent = `${count} / 5`;
}

function parseBudget(text) {
  if (/不限|无所谓|不设/.test(text)) return "不限";
  const labeled = text.match(/预算\s*(?:在|大概|约|控制在)?\s*(\d{2,4})/);
  const yuen = text.match(/(\d{2,4})\s*(?:元|块|以内|左右)/);
  const value = labeled?.[1] || yuen?.[1];
  return value ? Number(value) : null;
}

function parseSlots(text) {
  const updated = [];
  if (/带娃|宝宝|母婴|妈咪|亲子|童车|尿不湿|奶瓶|育儿/.test(text)) {
    state.slots.scene = "带娃";
    updated.push("用途 · 带娃");
  } else if (/登山|徒步|露营|越野|户外/.test(text)) {
    state.slots.scene = "户外";
    updated.push("用途 · 户外");
  } else if (/旅行|出游|短途|登机|长途/.test(text)) {
    state.slots.scene = "旅行";
    updated.push("用途 · 旅行");
  } else if (/学生|校园|上课|课程|书包|补习|孩子|儿童/.test(text)) {
    state.slots.scene = "校园";
    updated.push("用途 · 校园");
  } else if (/约会|穿搭|逛街|出片|日常搭配/.test(text)) {
    state.slots.scene = "穿搭";
    updated.push("用途 · 穿搭");
  } else if (/通勤|上班|办公|电脑包/.test(text)) {
    state.slots.scene = "通勤";
    updated.push("用途 · 通勤");
  }

  const budget = parseBudget(text);
  if (budget != null) {
    state.slots.budget = budget;
    updated.push(budget === "不限" ? "预算 · 不限" : `预算 · ${budget} 元内`);
  }

  const device = text.match(/(1[3-7])\s*(?:寸|英寸)/);
  if (device) {
    state.slots.device = Number(device[1]);
    updated.push(`电脑 · ${device[1]} 英寸`);
  }

  if (/送人|送礼|送男|送女/.test(text)) {
    state.slots.audience = "送礼";
    updated.push("人群 · 送礼");
  } else if (/宝妈|妈妈/.test(text)) {
    state.slots.audience = "宝妈";
    updated.push("人群 · 宝妈");
  } else if (/奶爸|爸爸/.test(text)) {
    state.slots.audience = "奶爸";
    updated.push("人群 · 奶爸");
  } else if (/孩子|儿童|儿子|女儿|小学生/.test(text)) {
    state.slots.audience = "孩子";
    updated.push("人群 · 孩子");
  } else if (/上班族|工作党|职场|上班/.test(text)) {
    state.slots.audience = "上班族";
    updated.push("人群 · 上班族");
  } else if (/自己|自用/.test(text)) {
    state.slots.audience = "自用";
    updated.push("人群 · 自用");
  }

  if (/商务|正式|职业/.test(text)) {
    state.slots.priority = "商务简约";
    updated.push("风格 · 商务简约");
  } else if (/韩系/.test(text)) {
    state.slots.priority = "韩系";
    updated.push("风格 · 韩系");
  } else if (/精致|轻熟|时尚|高级/.test(text)) {
    state.slots.priority = "精致时尚";
    updated.push("风格 · 精致时尚");
  } else if (/可爱|清新|活泼/.test(text)) {
    state.slots.priority = "可爱清新";
    updated.push("风格 · 可爱清新");
  } else if (/户外|登山|徒步|耐磨|外挂|背负|防雨/.test(text)) {
    state.slots.priority = "户外功能";
    updated.push("风格 · 户外功能");
  } else if (/护脊|减负|大容量|分区|保温|童车|功能/.test(text)) {
    state.slots.priority = "功能型";
    updated.push("风格 · 功能型");
  } else if (/轻便|轻一点|不沉/.test(text)) {
    state.slots.priority = "轻便";
    updated.push("风格 · 轻便");
  } else if (/简约|极简/.test(text)) {
    state.slots.priority = "简约";
    updated.push("风格 · 简约");
  }

  const avoid = [];
  if (/不要黑|不喜欢黑|避开黑/.test(text)) avoid.push("黑色");
  if (/不要翻盖|不要盖子/.test(text)) avoid.push("翻盖");
  if (/不要粉|不喜欢粉/.test(text)) avoid.push("粉色");
  if (/不要棕|不喜欢棕/.test(text)) avoid.push("棕色");
  if (/不能太重|别太重/.test(text)) avoid.push("超重");
  if (avoid.length) {
    state.slots.avoid = [...new Set([...state.slots.avoid, ...avoid])];
    updated.push(`禁忌 · ${avoid.join("、")}`);
  }
  updateSlots();
  return updated;
}

async function handleUserInput(raw) {
  const text = raw.trim();
  if (!text) return;
  els.chatInput.value = "";
  addMessage("user", escapeHtml(text));

  if (/重新|重来|重置/.test(text)) {
    resetChat();
    return;
  }

  if (/帮我决定|你帮我选|直接推荐/.test(text)) {
    applyDefaults();
    updateSlots();
    await recommend(false);
    return;
  }

  if (state.hasResults) {
    await handlePostRecommendation(text);
    return;
  }

  const updates = parseSlots(text);
  const question = nextQuestion();
  if (!question) {
    await recommend(false, updates);
    return;
  }
  state.questionCount += 1;
  await addAiMessage(question.text, updates.length ? updates : question.meta || []);
  setQuickReplies(question.options);
}

function nextQuestion() {
  if (!state.slots.scene) {
    return {
      text: "先告诉我：谁背、主要用在哪儿？我会用它决定容量、背负和风格。",
      options: ["上班通勤", "小学生上学", "带娃出门", "登山徒步", "约会穿搭"]
    };
  }
  if (state.slots.budget == null) {
    return {
      text: "我会先守住预算硬条件。你的可接受上限大概是多少？",
      options: ["100 元内", "200 元内", "300 元内", "600 元内", "价格不限"]
    };
  }
  if (!state.slots.priority && state.questionCount < 3) {
    const optionsByScene = {
      "通勤": ["商务简约", "韩系", "轻便功能", "精致时尚"],
      "校园": ["护脊减负", "大容量", "活泼可爱", "轻便"],
      "带娃": ["大容量分区", "轻便外出", "清新耐看", "帮我决定"],
      "旅行": ["大容量", "多分区", "轻便", "帮我决定"],
      "户外": ["轻量徒步", "专业户外", "大容量", "轻便"],
      "穿搭": ["韩系", "复古", "精致时尚", "简约"]
    };
    return {
      text: "最后看风格和核心能力：你更希望它偏哪一种？",
      options: optionsByScene[state.slots.scene] || ["功能型", "简约", "精致时尚", "帮我决定"]
    };
  }
  return null;
}

function applyDefaults() {
  state.slots.scene ||= "通勤";
  state.slots.budget ??= "不限";
  state.slots.priority ||= "简约";
  state.slots.audience ||= "自用";
  updateSlots();
}

function hardFailure(product) {
  if (state.slots.budget !== "不限" && state.slots.budget != null && product.priceCny > state.slots.budget) {
    return `超出 ${state.slots.budget} 元预算`;
  }
  const sceneTags = {
    "通勤": ["通勤", "商务", "差旅"],
    "校园": ["小学生", "上学", "补习", "校园"],
    "带娃": ["带娃", "亲子", "家庭出行"],
    "旅行": ["旅行", "短途", "家庭出行", "周末", "户外"],
    "户外": ["登山", "徒步", "露营", "户外", "越野"],
    "穿搭": ["约会", "穿搭", "逛街", "周末"]
  };
  const sceneMatched = (sceneTags[state.slots.scene] || []).some((tag) => product.useTags.some((use) => use.includes(tag)));
  if (state.slots.scene && !sceneMatched) return `不属于${state.slots.scene}主场景`;
  if (state.slots.device && (!product.laptopIn || product.laptopIn < state.slots.device)) {
    return `电脑仓仅支持 ${product.laptopIn} 英寸`;
  }
  if (state.slots.avoid.includes("黑色") && product.color.toLowerCase().includes("black")) {
    return "颜色属于你明确排除的黑色";
  }
  if (state.slots.avoid.includes("翻盖") && product.featureTags.some((tag) => tag.includes("翻盖"))) {
    return "采用你排除的翻盖结构";
  }
  if (state.slots.avoid.includes("粉色") && /粉/.test(product.color)) {
    return "颜色属于你明确排除的粉色";
  }
  if (state.slots.avoid.includes("棕色") && /棕/.test(product.color)) {
    return "颜色属于你明确排除的棕色";
  }
  if (state.slots.avoid.includes("超重") && Number.isFinite(product.weightKg) && product.weightKg > 1.05) {
    return "自重超过你的可接受范围";
  }
  return null;
}

function scoreProduct(product) {
  let score = 50;
  const sceneTags = {
    "通勤": ["通勤", "商务", "差旅"],
    "校园": ["小学生", "上学", "补习", "校园"],
    "带娃": ["带娃", "亲子", "家庭出行"],
    "旅行": ["旅行", "短途", "家庭出行", "周末", "户外"],
    "户外": ["登山", "徒步", "露营", "户外", "越野"],
    "穿搭": ["约会", "穿搭", "逛街", "周末"]
  };
  const wantedScene = sceneTags[state.slots.scene] || ["通勤"];
  const sceneHits = wantedScene.filter((tag) => product.useTags.some((use) => use.includes(tag))).length;
  score += sceneHits * 8;

  if (state.slots.device && product.laptopIn >= state.slots.device) score += 4;
  if (state.slots.device === 0) score += 3;

  if (state.slots.budget !== "不限" && state.slots.budget != null) {
    const gap = state.slots.budget - product.priceCny;
    score += Math.max(0, Math.min(8, gap / Math.max(1, state.slots.budget) * 12));
  } else {
    score += 4;
  }

  if (product.originalCny > product.priceCny) {
    score += Math.min(5, (product.originalCny - product.priceCny) / product.originalCny * 14);
  }
  if (Number.isFinite(product.weightKg)) score += Math.max(0, Math.min(7, (1.25 - product.weightKg) * 8));
  if (Number.isFinite(product.volumeL) && product.volumeL >= 20 && product.volumeL <= 24) score += 3;
  if (Number.isFinite(product.volumeL) && product.volumeL >= 23) score += 1.5;

  const styleMap = {
    "商务简约": ["商务", "简约", "轻熟"],
    "简约": ["简约", "极简"],
    "韩系": ["韩系", "复古", "精致时尚"],
    "复古": ["复古", "韩系"],
    "精致时尚": ["精致时尚", "轻熟", "复古"],
    "可爱清新": ["可爱", "清新", "活力"],
    "功能型": ["功能型", "轻功能"],
    "户外功能": ["户外", "专业户外", "轻量徒步", "功能型"],
    "轻便": ["轻量", "轻功能"]
  };
  const wantedStyles = styleMap[state.slots.priority] || [state.slots.priority].filter(Boolean);
  if (wantedStyles.some((style) => product.styles.some((item) => item.includes(style)))) score += 10;
  if (state.slots.priority === "功能型") {
    score += Math.min(5, product.featureTags.filter((tag) => /分区|容量|保温|童车|护脊|减震|防渗|背负|防雨|外挂/.test(tag)).length * 1.5);
  }
  if (state.slots.priority === "轻便") {
    if (Number.isFinite(product.weightKg)) score += Math.max(0, (1.2 - product.weightKg) * 8);
    else if (product.featureTags.some((tag) => /轻|减震|减负/.test(tag))) score += 3;
  }
  if (state.slots.audience === "孩子" && product.audience.some((item) => item.includes("儿童"))) score += 6;
  if (state.slots.audience === "宝妈" && product.audience.some((item) => item.includes("宝妈"))) score += 5;
  if (state.slots.audience === "奶爸" && product.audience.some((item) => item.includes("奶爸"))) score += 5;
  if (state.slots.audience === "上班族" && product.audience.some((item) => item.includes("上班"))) score += 4;
  if (state.slots.audience === "送礼" && product.audience.some((item) => item.includes("送礼"))) score += 5;

  if (product.stock === "out") score -= 18;
  score += Math.min(3, product.featureTags.length * 0.35);
  return Math.max(39, Math.min(98, Math.round(score)));
}

function productReason(product) {
  const reasons = [];
  if (product.specs?.[0]) reasons.push(`${product.specs[0][0]} ${product.specs[0][1]}`);
  if (state.slots.priority && product.styles.some((style) => state.slots.priority.includes(style) || style.includes(state.slots.priority))) {
    reasons.push(`风格接近${state.slots.priority}`);
  }
  if (state.slots.scene && product.useTags.some((tag) => tag.includes(state.slots.scene))) {
    reasons.push(`适合${state.slots.scene}场景`);
  }
  return reasons.slice(0, 2).join("，") + "。";
}

function buildRecommendations() {
  const scored = PRODUCTS.map((product) => {
    const failure = hardFailure(product);
    return { ...product, score: scoreProduct(product), hardFailure: failure };
  });
  const validInStock = scored
    .filter((product) => !product.hardFailure && product.stock === "in")
    .sort((a, b) => b.score - a.score);
  const validAny = scored
    .filter((product) => !product.hardFailure)
    .sort((a, b) => b.score - a.score);
  let list = validInStock.slice(0, 3);
  if (!list.length) {
    list = scored
      .filter((product) => product.stock === "in")
      .map((product) => ({ ...product, score: Math.max(42, product.score - 12), nearMiss: true }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 2);
  }
  return {
    list,
    strict: validInStock.length > 0,
    excluded: scored.filter((product) => !list.some((item) => item.id === product.id))
  };
}

async function recommend(isFollowUp = false, updates = []) {
  const result = buildRecommendations();
  state.recommendations = result.list;
  state.hasResults = true;
  const summaryMeta = [
    state.slots.scene,
    state.slots.budget === "不限" ? "价格不限" : `${state.slots.budget} 元内`,
    state.slots.audience,
    state.slots.priority
  ].filter(Boolean);

  const message = result.strict
    ? `我已经把${summaryMeta.join("、")}放到一起筛选。先给你 ${result.list.length} 款有货候选，理由和取舍都来自商品页快照与已验证字段。`
    : "当前没有同时满足全部硬条件的在库商品。我不会把不符合条件的商品硬说成匹配，下面只展示最接近的选项和具体缺口。";

  await addAiMessage(message, updates);
  els.resultSection.hidden = false;
  renderRecommendations(result);
  setQuickReplies(["更便宜", "换简约风", "看风险提示", "重新描述"]);
  setTimeout(scrollToResults, 90);
}

function renderRecommendations(result) {
  els.resultTitle.textContent = result.strict ? `为你筛出 ${result.list.length} 款` : "暂无完全匹配，先看接近项";
  els.resultSubtitle.textContent = result.strict
    ? "匹配度综合场景、受众、风格、预算和商品能力计算。"
    : "缺失的硬条件已明确标出，你可以修改一个条件重新筛选。";
  els.matchSummary.innerHTML = [
    state.slots.scene,
    state.slots.budget === "不限" ? "价格不限" : state.slots.budget ? `${state.slots.budget} 元内` : null,
    state.slots.audience,
    state.slots.priority,
    ...state.slots.avoid
  ].filter(Boolean).map((item) => `<span>${escapeHtml(item)}</span>`).join("");

  els.recommendationList.innerHTML = result.list.map((product, index) => productCard(product, index, result.strict)).join("");
  bindProductCards(els.recommendationList);

  const excluded = result.excluded
    .filter((product) => product.stock === "out" || product.hardFailure)
    .slice(0, 2);
  if (excluded.length) {
    els.notRecommend.innerHTML = `
      <h3>为什么没有推荐</h3>
      ${excluded.map((product) => `<p><b>${escapeHtml(product.name)}：</b>${escapeHtml(product.hardFailure || "当前缺货，无法形成完整成交链路。")}</p>`).join("")}
    `;
  } else {
    els.notRecommend.innerHTML = `<h3>没有隐藏的硬条件</h3><p>当前候选均满足主场景、预算与已明确禁忌项。</p>`;
  }
}

function productCard(product, index, strict) {
  const selected = state.compare.includes(product.id);
  const out = product.stock === "out";
  const badge = product.nearMiss ? "接近项" : index === 0 && strict ? "AI 首选" : `${product.score}% 匹配`;
  return `
    <article class="product-card ${index === 0 && strict ? "top" : ""} ${out ? "out-of-stock" : ""}">
      <div class="card-visual" data-detail="${product.id}" role="button" tabindex="0" aria-label="查看 ${escapeHtml(product.name)} 详情">
        ${!product.nearMiss ? `<span class="match-badge">${badge}</span>` : ""}
        <span class="stock-badge ${out ? "out" : ""}">${out ? "缺货" : "有货"}</span>
        <img src="${product.image}" alt="${escapeHtml(product.brand)} ${escapeHtml(product.name)}">
      </div>
      <div class="card-body">
        <div class="product-meta">
          <span class="product-brand">${escapeHtml(product.brand)}</span>
          <span class="score"><b>${product.score}</b>% 匹配</span>
        </div>
        <h3 class="product-title">${escapeHtml(product.name)}</h3>
        <p class="product-subtitle">${escapeHtml(product.subtitle)}</p>
        <div class="price-row">
          <strong><small>¥</small>${product.priceCny}</strong>
          ${product.originalCny > product.priceCny ? `<del>¥${product.originalCny}</del>` : ""}
          <span class="price-caption">${escapeHtml(product.priceNote || "活动页参考价")}</span>
        </div>
        <div class="spec-row">
          ${product.specs.map((spec) => `<span class="spec"><b>${escapeHtml(spec[0])}</b><span>${escapeHtml(spec[1])}</span></span>`).join("")}
        </div>
        <div class="reason-box"><b>为什么推荐：</b>${escapeHtml(productReason(product))}</div>
        <p class="risk-line">取舍：${escapeHtml(product.tradeoff)}</p>
        <div class="card-actions">
          <button class="compare-button ${selected ? "selected" : ""}" type="button" data-compare="${product.id}">
            ${selected ? "已加入" : "加入对比"}
          </button>
          <button class="primary-card-button" type="button" data-detail="${product.id}" ${out ? "disabled" : ""}>
            ${out ? "当前缺货" : "查看商品"}
          </button>
        </div>
      </div>
    </article>
  `;
}

function bindProductCards(root) {
  $$("[data-detail]", root).forEach((button) => {
    button.addEventListener("click", () => openDetail(button.dataset.detail));
    button.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openDetail(button.dataset.detail);
      }
    });
  });
  $$("[data-compare]", root).forEach((button) => {
    button.addEventListener("click", () => toggleCompare(button.dataset.compare));
  });
}

function toggleCompare(id) {
  const index = state.compare.indexOf(id);
  if (index >= 0) {
    state.compare.splice(index, 1);
  } else if (state.compare.length >= 3) {
    showToast("最多同时对比 3 款");
    return;
  } else {
    state.compare.push(id);
  }
  updateCompareIndicator();
  if (state.hasResults) renderRecommendations(buildRecommendations());
  renderCatalog();
}

function updateCompareIndicator() {
  els.compareCount.textContent = state.compare.length;
  els.openCompareButton.hidden = state.compare.length === 0;
}

async function handlePostRecommendation(text) {
  if (/重新描述|重新来/.test(text)) {
    resetChat();
    return;
  }
  if (/更轻|轻一点|最轻/.test(text)) {
    const sorted = [...state.recommendations].sort((a, b) => {
      const aw = Number.isFinite(a.weightKg) ? a.weightKg : Infinity;
      const bw = Number.isFinite(b.weightKg) ? b.weightKg : Infinity;
      return aw - bw;
    });
    state.recommendations = sorted;
    els.resultTitle.textContent = "按重量重新排序";
    els.resultSubtitle.textContent = "轻量优先，但预算和设备条件仍然保留。";
    els.recommendationList.innerHTML = sorted.map((product, index) => productCard(product, index, true)).join("");
    bindProductCards(els.recommendationList);
    const lightest = sorted.find((product) => Number.isFinite(product.weightKg));
    await addAiMessage(lightest ? `按已标注自重排序，最轻的是 <strong>${escapeHtml(lightest.name)}</strong>（${lightest.weightKg.toFixed(2)} kg）。其他图款未公开重量，暂不参与轻量结论。` : "当前候选没有公开自重数据，我不会用模型猜测重量。建议改看容量、背负结构与用户反馈。");
    return;
  }
  if (/便宜|预算|价格/.test(text)) {
    const sorted = [...state.recommendations].sort((a, b) => a.priceCny - b.priceCny);
    state.recommendations = sorted;
    els.resultTitle.textContent = "按价格差重新排序";
    els.resultSubtitle.textContent = "先守住硬条件，再看预算贴合与性价比。";
    els.recommendationList.innerHTML = sorted.map((product, index) => productCard(product, index, true)).join("");
    bindProductCards(els.recommendationList);
    await addAiMessage(`在现有候选里，<strong>${escapeHtml(sorted[0].name)}</strong> 的参考价最低（${formatCny(sorted[0].priceCny)}）。它的取舍是：${escapeHtml(sorted[0].tradeoff)}`);
    return;
  }
  if (/简约|商务|韩系|精致|可爱|功能/.test(text)) {
    if (/韩系/.test(text)) state.slots.priority = "韩系";
    else if (/精致/.test(text)) state.slots.priority = "精致时尚";
    else if (/可爱/.test(text)) state.slots.priority = "可爱清新";
    else if (/功能/.test(text)) state.slots.priority = "功能型";
    else state.slots.priority = "简约";
    updateSlots();
    const result = buildRecommendations();
    state.recommendations = result.list;
    renderRecommendations(result);
    setQuickReplies(["更便宜", "换简约风", "看风险提示", "重新描述"]);
    await addAiMessage(`已按 <strong>${escapeHtml(state.slots.priority)}</strong> 重新排序，预算与主场景仍作为硬条件。`);
    return;
  }
  if (/风险|缺货|不推荐/.test(text)) {
    const risk = PRODUCTS.find((product) => product.stock === "out") || state.recommendations[0];
    await addAiMessage(`我会优先揭示风险。例如 <strong>${escapeHtml(risk.name)}</strong>：${escapeHtml(risk.tradeoff)} 如果你需要立即购买，它不能作为主推荐；可改看有货替代款或开启到货提醒。`);
    return;
  }
  await addAiMessage("你可以说“更轻一点”“更便宜”“看风险提示”，或直接打开商品详情查看规格、评论洞察和官方来源。");
  setQuickReplies(["更便宜", "换简约风", "看风险提示", "重新描述"]);
}

function openDetail(id) {
  const product = productById(id);
  if (!product) return;
  const score = product.score || scoreProduct(product);
  els.detailSheetContent.innerHTML = `
    <div class="detail-head">
      <img src="${product.image}" alt="${escapeHtml(product.brand)} ${escapeHtml(product.name)}">
      <div class="detail-head-content">
        <span class="product-brand">${escapeHtml(product.brand)}</span>
        <h2 id="detailSheetTitle">${escapeHtml(product.name)}</h2>
        <p>${escapeHtml(product.subtitle)}</p>
        <div class="detail-price"><small>参考价 </small>${formatCny(product.priceCny)}</div>
        <span class="verified-pill">${escapeHtml(product.stockLabel)}</span>
      </div>
    </div>
    <section class="detail-section">
      <h3>场景、用途与风格</h3>
      <div class="detail-taxonomy">
        <div><span>用途</span><b>${escapeHtml(product.category)}</b></div>
        <div><span>场景</span><b>${escapeHtml(product.useTags.join(" · "))}</b></div>
        <div><span>风格</span><b>${escapeHtml(product.styles.join(" · "))}</b></div>
        <div><span>人群</span><b>${escapeHtml(product.audience.join(" · "))}</b></div>
      </div>
    </section>
    <div class="detail-large-specs">
      ${product.specs.map((spec) => `<div><b>${escapeHtml(spec[0])}</b><span>${escapeHtml(spec[1])}</span></div>`).join("")}
    </div>
    <section class="detail-section">
      <h3>为什么适合当前需求</h3>
      <p>${escapeHtml(productReason(product))} 当前匹配分 ${score}%。</p>
    </section>
    <section class="detail-section">
      <h3>商品与场景要点</h3>
      <ul>${product.highlights.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
    </section>
    <section class="detail-section">
      <h3>${escapeHtml(product.insightType)}</h3>
      <div class="evidence-block">${escapeHtml(product.insight)}<br><small>记录用于商品事实追溯，不构成实时库存或最终到手价承诺。</small></div>
    </section>
    <section class="detail-section">
      <h3>需要接受的取舍</h3>
      <p>${escapeHtml(product.tradeoff)}</p>
    </section>
    <div class="detail-cta-row">
      <button class="secondary" type="button" data-detail-compare="${product.id}">
        ${state.compare.includes(product.id) ? "已加入对比" : "加入对比"}
      </button>
      ${
        product.stock === "out"
          ? `<button type="button" id="stockAlertButton">到货提醒</button>`
          : `<a href="${product.sourceUrl}" target="_blank" rel="noreferrer">查看商品来源</a>`
      }
    </div>
    <p class="detail-source">型号 ${escapeHtml(product.model)} · SKU ${escapeHtml(product.sku)}<br>${escapeHtml(product.sourceLabel)} · 核验快照 ${escapeHtml(product.sourceCheckedAt)}<br>${escapeHtml(product.skuNote)}。库存为页面状态而非实时数量，实际价格、库存与配送以渠道页面为准。<br><a href="${escapeHtml(product.imageSourceUrl)}" target="_blank" rel="noreferrer">查看商品原图</a></p>
  `;
  els.detailSheetContent.querySelector("[data-detail-compare]")?.addEventListener("click", (event) => {
    toggleCompare(event.currentTarget.dataset.detailCompare);
    openDetail(id);
  });
  $("#stockAlertButton", els.detailSheetContent)?.addEventListener("click", () => {
    showToast("已记录到货提醒（演示）");
  });
  openSheet(els.detailSheet);
}

function openSheet(sheet) {
  closeSheets();
  els.sheetBackdrop.hidden = false;
  requestAnimationFrame(() => sheet.classList.add("open"));
  sheet.setAttribute("aria-hidden", "false");
}

function closeSheets() {
  els.detailSheet.classList.remove("open");
  els.compareSheet.classList.remove("open");
  els.sheetBackdrop.hidden = true;
  els.detailSheet.setAttribute("aria-hidden", "true");
  els.compareSheet.setAttribute("aria-hidden", "true");
}

function openCompare() {
  const selected = state.compare.map(productById).filter(Boolean);
  if (!selected.length) {
    els.compareSheetContent.innerHTML = `<div class="compare-empty">还没有加入对比。返回推荐卡片，选择 2 至 3 款即可横向比较。</div>`;
  } else {
    els.compareSheetContent.innerHTML = `
      <table class="compare-table">
        <thead><tr><th>参数</th>${selected.map((p) => `<th>${escapeHtml(p.name)}</th>`).join("")}</tr></thead>
        <tbody>
          <tr><th>参考价</th>${selected.map((p) => `<td>${formatCny(p.priceCny)}</td>`).join("")}</tr>
          <tr><th>品类</th>${selected.map((p) => `<td>${escapeHtml(p.category)}</td>`).join("")}</tr>
          <tr><th>风格</th>${selected.map((p) => `<td>${escapeHtml(p.styles.join(" / "))}</td>`).join("")}</tr>
          <tr><th>受众</th>${selected.map((p) => `<td>${escapeHtml(p.audience.join(" / "))}</td>`).join("")}</tr>
          <tr><th>关键规格</th>${selected.map((p) => `<td>${p.specs.map((s) => `${s[0]} ${s[1]}`).join("；")}</td>`).join("")}</tr>
          <tr><th>主要取舍</th>${selected.map((p) => `<td>${escapeHtml(p.tradeoff)}</td>`).join("")}</tr>
        </tbody>
      </table>
    `;
  }
  openSheet(els.compareSheet);
}

/* Catalog */
function productMatchesFilter(product) {
  if (state.catalogFilter === "commute" && product.category !== "通勤包") return false;
  if (state.catalogFilter === "student" && product.category !== "学生书包") return false;
  if (state.catalogFilter === "mommy" && product.category !== "妈咪包") return false;
  if (state.catalogFilter === "fashion" && product.category !== "时尚背包") return false;
  if (state.catalogFilter === "outdoor" && product.category !== "登山包") return false;
  if (state.catalogFilter === "entry" && (product.priceCny < 50 || product.priceCny > 100)) return false;
  if (state.catalogFilter === "function" && !product.styles.some((style) => /功能|护脊|轻功能|户外/.test(style))) return false;
  const styleMatchers = {
    business: /商务|轻熟/,
    minimal: /简约|极简/,
    korean: /韩系|学院/,
    retro: /复古|软皮|皮质/,
    fashion: /精致时尚|轻奢|印花/,
    cute: /可爱|清新|活力|公主/,
    functional: /功能|轻功能/,
    outdoor: /户外|运动|露营/
  };
  if (state.catalogStyle !== "all" && !product.styles.some((style) => styleMatchers[state.catalogStyle]?.test(style))) return false;
  const query = state.catalogSearch.trim().toLowerCase();
  if (!query) return true;
  return [product.brand, product.name, product.model, product.sku, product.subtitle, product.category, ...product.styles, ...product.useTags, ...product.audience, ...product.featureTags]
    .join(" ")
    .toLowerCase()
    .includes(query);
}

function diversifyCatalogOrder(products) {
  const categoryOrder = ["妈咪包", "学生书包", "通勤包", "时尚背包", "登山包"];
  const groups = new Map(categoryOrder.map((category) => [category, []]));
  products.forEach((product) => {
    if (!groups.has(product.category)) groups.set(product.category, []);
    groups.get(product.category).push(product);
  });
  groups.forEach((items) => items.sort((a, b) => a.priceCny - b.priceCny));

  const diversified = [];
  let cursor = 0;
  while (groups.size) {
    let added = false;
    for (const [category, items] of groups) {
      if (items[cursor]) {
        diversified.push(items[cursor]);
        added = true;
      } else if (cursor > 0) {
        groups.delete(category);
      }
    }
    if (!added) break;
    cursor += 1;
  }
  return diversified;
}

function renderCatalog() {
  if (!els.catalogGrid) return;
  let list = PRODUCTS.filter(productMatchesFilter);
  if (state.catalogSort === "price") {
    list = [...list].sort((a, b) => a.priceCny - b.priceCny);
  } else if (state.catalogSort === "light") {
    list = [...list].sort((a, b) => {
      const aw = Number.isFinite(a.weightKg) ? a.weightKg : Infinity;
      const bw = Number.isFinite(b.weightKg) ? b.weightKg : Infinity;
      return aw - bw;
    });
  } else {
    list = diversifyCatalogOrder([...list].sort((a, b) => (b.stock === "in") - (a.stock === "in")));
  }
  els.catalogCount.textContent = `${list.length} 件商品`;
  els.catalogGrid.innerHTML = list.map((product) => `
    <article class="catalog-card" data-detail="${product.id}" tabindex="0" role="button" aria-label="查看 ${escapeHtml(product.name)}">
      <div class="catalog-card-image">
        ${product.stock === "out" ? `<span class="catalog-card-out">缺货</span>` : ""}
        <img src="${product.image}" alt="${escapeHtml(product.brand)} ${escapeHtml(product.name)}">
      </div>
      <div class="catalog-card-body">
        <span class="catalog-card-brand">${escapeHtml(product.brand)}</span>
        <h3>${escapeHtml(product.name)}</h3>
        <p>${escapeHtml([...product.styles.slice(0, 2), ...product.useTags.slice(0, 1)].join(" · "))}</p>
        <div class="catalog-card-price">¥${product.priceCny}<span>${escapeHtml(product.category)}</span></div>
      </div>
    </article>
  `).join("");
  bindProductCards(els.catalogGrid);
}

function switchTab(tab) {
  state.activeTab = tab;
  els.toast.classList.remove("show");
  $$(".app-page").forEach((page) => page.classList.remove("active"));
  $(`#${tab}Page`).classList.add("active");
  $$(".tab-item").forEach((item) => item.classList.toggle("active", item.dataset.tab === tab));
  els.headerTitle.textContent = {
    chat: "AI 导购",
    catalog: "商品库",
    operator: "运营驾驶舱"
  }[tab];
  if (tab === "catalog") renderCatalog();
  if (tab === "operator" && !state.operatorReady) initOperator();
}

/* Operator */
function initOperator() {
  state.operatorReady = true;
  els.operatorMessages.innerHTML = "";
  addOperatorMessage("assistant", "你希望本周期优先优化哪类场景？我会结合对应的背包品类、用户疑问和商品证据生成建议。");
  renderOperatorQuick(["提升通勤转化", "优化亲子主推", "提升校园成交"]);
  generateStrategy("提升通勤转化", false);
}

function addOperatorMessage(role, text) {
  const div = document.createElement("div");
  div.className = `operator-message ${role}`;
  div.innerHTML = text;
  els.operatorMessages.appendChild(div);
  els.operatorMessages.scrollTop = els.operatorMessages.scrollHeight;
}

function renderOperatorQuick(items) {
  els.operatorQuick.innerHTML = "";
  items.forEach((item) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = item;
    button.addEventListener("click", () => generateStrategy(item, true));
    els.operatorQuick.appendChild(button);
  });
}

function generateStrategy(goal, addChat = true) {
  if (addChat) addOperatorMessage("user", escapeHtml(goal));
  const byCategory = (category) => PRODUCTS.find((product) => product.category === category && product.stock === "in");
  const mommy = byCategory("妈咪包");
  const student = byCategory("学生书包");
  const fashion = byCategory("时尚背包");
  const commute = byCategory("通勤包");
  let title = "多场景背包增长方案";
  let items = [];

  if (/母婴|带娃|妈咪|亲子/.test(goal)) {
    title = "亲子场景转化优化";
    items = [
      {
        title: "把“大容量”拆成可验证的分区语言",
        body: `用 ${mommy.name} 承接带娃人群，首屏直接展示纸尿裤、奶瓶、湿巾和衣物的取放动线。`,
        evidence: `${mommy.specs.map((spec) => `${spec[0]}${spec[1]}`).join(" · ")} · 母婴 A 类`
      },
      {
        title: "为轻装出门提供第二种选择",
        body: "对“只下楼两小时”的用户，不应强推大容量；先问出行时长，再决定大包或轻量款。",
        evidence: "场景追问：日常遛娃 / 商场半日 / 长途旅行"
      },
      {
        title: "内容优先解释减负与安全",
        body: "标题采用“满载肩感”“保温区实测”“分区会不会太碎”等证据型主题。",
        evidence: "评论洞察模块（演示标签，待真实数据接入）"
      }
    ];
  } else if (/校园|学生|书包/.test(goal)) {
    title = "校园书包增长方案";
    items = [
      {
        title: "先按身高推荐，再按颜色推荐",
        body: `把 ${student.name} 的大小号适配放到第一层筛选，避免家长只看外观买错尺码。`,
        evidence: "大号适配 156cm · 小号适配 138cm"
      },
      {
        title: "把护脊与反光条做成详情首屏",
        body: "对家长最有说服力的不是“可爱”，而是肩带承托、隔层数量和夜间识别。",
        evidence: "多隔层 · 反光条 · 护脊表达"
      },
      {
        title: "按年级/课本量增加二次确认",
        body: "在成交前增加“几年级、每天几本书、是否带水杯”的轻量确认。",
        evidence: "减少尺码和容量错配"
      }
    ];
  } else if (/穿搭|时尚|约会|韩系|礼物/.test(goal)) {
    title = "韩系与精致通勤内容方案";
    items = [
      {
        title: "把风格词落到可购买场景",
        body: `用 ${fashion.name} 承接“通勤也能约会”的需求，展示双肩和手提两种背法。`,
        evidence: fashion.featureTags.slice(0, 4).join(" · ")
      },
      {
        title: "建立浅色与深色的对比入口",
        body: "让用户直接选择“韩系复古棕”或“精致灰粉”，减少只看款式不看场景的比较成本。",
        evidence: "复古棕 / 灰粉 / 多背法"
      },
      {
        title: "评论洞察优先回答显脏与肩感",
        body: "内容标题聚焦“浅色耐脏吗”“通勤装得下吗”“肩带会不会勒”，比泛化种草更有效。",
        evidence: "评论洞察模块（演示标签）"
      }
    ];
  } else if (/通勤|商务/.test(goal)) {
    title = "通勤场景增长优化";
    items = [
      {
        title: `主推 ${commute.name} 承接轻商务需求`,
        body: "将轻商务轮廓、通勤分区和手提/双肩切换放在详情首屏。",
        evidence: commute.featureTags.slice(0, 4).join(" · ")
      },
      {
        title: `增加 ${fashion.name} 的穿搭入口`,
        body: "把通勤拆成“商务简约”和“下班可约会”两条路径，避免只展示一种通勤风格。",
        evidence: "商务简约 / 韩系 / 精致时尚"
      },
      {
        title: "用提问代替默认电脑仓",
        body: "先问是否带电脑，再决定是否展示电脑仓；不带电脑的用户不应被功能型商品包围。",
        evidence: "2 至 3 个关键问题后再推荐"
      }
    ];
  } else {
    title = "跨场景经营优化";
    items = [
      {
        title: "按生活场景拆分首页入口",
        body: "将通勤、校园、带娃、旅行和穿搭拆成并行入口，不再默认所有人都在找电脑包。",
        evidence: `当前商品池覆盖 ${new Set(PRODUCTS.map((product) => product.category)).size} 类背包`
      },
      {
        title: `用 ${commute.name} 承接商务简约需求`,
        body: "通勤入口强调外观、办公分区与多背法；带娃入口则不应复用同一解释模板。",
        evidence: "场景标签与商品标签独立匹配"
      },
      {
        title: "先问 2 至 3 个关键问题再推荐",
        body: "先确认谁背和场景，再确认预算与风格，避免把妈咪包推荐给通勤用户。",
        evidence: "场景 / 预算 / 风格三段式澄清"
      }
    ];
  }

  state.strategy = { title, goal, items, generatedAt: "2026-11-24" };
  els.strategyTitle.textContent = title;
  els.strategyContent.innerHTML = items.map((item, index) => `
    <article class="strategy-item">
      <span class="strategy-index">${index + 1}</span>
      <div>
        <h3>${escapeHtml(item.title)}</h3>
        <p>${escapeHtml(item.body)}</p>
        <span class="strategy-evidence">${escapeHtml(item.evidence)}</span>
      </div>
    </article>
  `).join("");
  els.strategyCard.hidden = false;
  renderOperatorQuick(["提升通勤转化", "优化亲子主推", "提升校园成交"]);

  if (addChat) {
    setTimeout(() => {
      addOperatorMessage("assistant", `已生成 <strong>${escapeHtml(title)}</strong>。建议先做 2 周 A/B：A 组使用参数型理由，B 组使用评论洞察型理由，观察 SKU 点击与商品页跳转。`);
      els.strategyCard.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 400);
  }
}

function buildPlanMarkdown() {
  const s = state.strategy;
  if (!s) return "";
  return [
    `# ${s.title}`,
    "",
    `生成日期：${s.generatedAt}`,
    `优化目标：${s.goal}`,
    "",
    "## 行动建议",
    ...s.items.map((item, index) => `${index + 1}. **${item.title}**  \n${item.body}  \n证据：${item.evidence}`),
    "",
    "## A/B 验证",
    "- A 组：需求匹配型推荐话术，优先说明用途与硬条件命中。",
    "- B 组：评论洞察型推荐话术，优先说明高频关注与真实取舍。",
    "- 指标：SKU 点击率、对比率、商品页跳转率、成交率、客单价。",
    "- 通过条件：硬条件违反率 0，解释一致性 100%。",
    "",
    "## 数据说明",
    "SKU、型号、价格、库存状态和商品图来自小米商城、苏宁易购与品牌官网快照。库存仅代表页面状态，正式接入时需替换为渠道实时库存接口。"
  ].join("\n");
}

function downloadPlan() {
  if (!state.strategy) return;
  const blob = new Blob([buildPlanMarkdown()], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "赛夫AI背包导购_策略优化方案.md";
  anchor.click();
  URL.revokeObjectURL(url);
  showToast("策略方案已导出");
}

/* Reset/demo */
function resetChat() {
  state.slots = { scene: null, budget: null, device: null, priority: null, audience: null, avoid: [] };
  state.questionCount = 0;
  state.hasResults = false;
  state.recommendations = [];
  state.compare = [];
  updateSlots();
  updateCompareIndicator();
  $("#brandHero").style.display = "block";
  els.resultSection.hidden = true;
  els.messages.innerHTML = "";
  addMessage("assistant", "先不用想参数。告诉我：<strong>谁背、主要用在什么场景？</strong>", ["通勤", "校园", "带娃", "旅行", "穿搭"]);
  setQuickReplies(["上班通勤", "小学生上学", "带娃出门", "周末旅行", "约会穿搭"]);
  if (state.activeTab !== "chat") switchTab("chat");
}

function startDemoResult() {
  state.slots = {
    scene: "通勤",
    budget: 600,
    device: null,
    priority: "商务简约",
    audience: "上班族",
    avoid: []
  };
  state.questionCount = 3;
  updateSlots();
  els.brandHero.style.display = "none";
  addMessage("user", "上班通勤，预算 600 元，想商务简约一点。");
  addMessage("assistant", "我先把你的话整理成 3 个条件：<strong>工作通勤、600 元内、商务简约</strong>。这次不会默认你需要电脑仓，也不会把所有包都按同一种通勤逻辑推荐。", ["用途 · 通勤", "预算 · 600 元内", "受众 · 上班族", "风格 · 商务简约"]);
  state.hasResults = true;
  const result = buildRecommendations();
  state.recommendations = result.list;
  renderRecommendations(result);
  els.resultSection.hidden = false;
  setQuickReplies(["更便宜", "换简约风", "看风险提示", "重新描述"]);
  showToast("演示结果已加载");
  setTimeout(scrollToResults, 100);
}

/* Events */
$$("[data-tab]").forEach((button) => {
  button.addEventListener("click", () => switchTab(button.dataset.tab));
});
$$("[data-tab-target]").forEach((button) => {
  button.addEventListener("click", () => switchTab(button.dataset.tabTarget));
});
$$("[data-starter]").forEach((button) => {
  button.addEventListener("click", () => handleUserInput(button.dataset.starter));
});
els.chatForm.addEventListener("submit", (event) => {
  event.preventDefault();
  handleUserInput(els.chatInput.value);
});
els.composerPlus.addEventListener("click", () => {
  showToast("可以直接说：带娃、预算 300、大容量分区");
});
els.resetButton.addEventListener("click", () => {
  if (state.activeTab === "operator") {
    state.operatorReady = false;
    initOperator();
    showToast("运营对话已重置");
  } else {
    resetChat();
  }
});
els.openCompareButton.addEventListener("click", openCompare);
els.compareSheetClose.addEventListener("click", closeSheets);
els.detailSheetClose.addEventListener("click", closeSheets);
els.sheetBackdrop.addEventListener("click", closeSheets);

els.catalogSearch.addEventListener("input", (event) => {
  state.catalogSearch = event.target.value;
  renderCatalog();
});
els.catalogFilters.addEventListener("click", (event) => {
  const button = event.target.closest("[data-filter]");
  if (!button) return;
  state.catalogFilter = button.dataset.filter;
  $$(".filter-chip", els.catalogFilters).forEach((chip) => chip.classList.toggle("active", chip === button));
  renderCatalog();
});
els.catalogStyleFilters.addEventListener("click", (event) => {
  const button = event.target.closest("[data-style]");
  if (!button) return;
  state.catalogStyle = button.dataset.style;
  $$(".filter-chip", els.catalogStyleFilters).forEach((chip) => chip.classList.toggle("active", chip === button));
  renderCatalog();
});
els.sortButton.addEventListener("click", () => {
  const modes = [
    ["recommended", "推荐排序"],
    ["price", "价格从低到高"],
    ["light", "轻量优先"]
  ];
  const current = modes.findIndex(([key]) => key === state.catalogSort);
  const next = modes[(current + 1) % modes.length];
  state.catalogSort = next[0];
  els.sortButton.innerHTML = `${next[1]} <span>⌄</span>`;
  renderCatalog();
});

els.operatorForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const value = els.operatorInput.value.trim();
  if (!value) return;
  els.operatorInput.value = "";
  generateStrategy(value, true);
});
els.downloadPlanButton.addEventListener("click", downloadPlan);

/* Initial state */
updateSlots();
renderCatalog();
addMessage("assistant", "先不用想参数。告诉我：<strong>谁背、主要用在什么场景？</strong>", ["通勤", "校园", "带娃", "户外", "穿搭"]);
setQuickReplies(["上班通勤", "小学生上学", "带娃出门", "登山徒步", "约会穿搭"]);

const params = new URLSearchParams(location.search);
if (params.get("demo") === "result") {
  startDemoResult();
} else if (params.get("demo") === "operator") {
  switchTab("operator");
} else if (params.get("demo") === "catalog") {
  switchTab("catalog");
}
