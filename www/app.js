const STORAGE = {
  weatherHistory: "dwt_weather_history",
  essentials: "dwt_essentials",
  checks: "dwt_checks",
  lastWeather: "dwt_last_weather",
};

const DEFAULT_ITEMS = ["钥匙", "手机", "钱包"];

const WMO = {
  0: "晴",
  1: "大部晴朗",
  2: "局部多云",
  3: "多云",
  45: "雾",
  48: "雾凇",
  51: "毛毛雨",
  53: "小雨",
  55: "中雨",
  56: "冻毛毛雨",
  57: "冻雨",
  61: "小雨",
  63: "中雨",
  65: "大雨",
  66: "冻雨",
  67: "冻雨",
  71: "小雪",
  73: "中雪",
  75: "大雪",
  77: "雪粒",
  80: "阵雨",
  81: "强阵雨",
  82: "暴雨",
  85: "阵雪",
  86: "强阵雪",
  95: "雷雨",
  96: "雷雨伴冰雹",
  99: "强雷雨伴冰雹",
};

const $ = (id) => document.getElementById(id);

let currentWeather = null;

function todayKey() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function formatTodayLabel() {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(new Date());
}

function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function saveJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function wmoLabel(code) {
  return WMO[code] ?? "未知";
}

function mapConditionKey(code, precip, temp) {
  if (code >= 71 && code <= 86) return "snow";
  if (code >= 51 && code <= 67) return "rain";
  if (code >= 80 && code <= 82) return "rain";
  if (code >= 95) return "rain";
  if (code === 45 || code === 48) return "fog";
  if (code === 3) return "overcast";
  if (code === 2 || code === 1) return "cloudy";
  if (precip > 0.2) return "rain";
  return "sunny";
}

function buildTips(weather) {
  const tips = [];
  const t = weather.temp;
  const feels = weather.feelsLike ?? t;
  const rain = weather.rainChance ?? 0;
  const uv = weather.uv ?? 0;
  const wind = weather.windSpeed ?? 0;
  const cond = weather.condition;

  if (feels <= 0) {
    tips.push({
      level: "danger",
      icon: "冷",
      title: "厚羽绒 / 棉服",
      text: "体感很冷，建议羽绒服、围巾手套，注意防寒。",
    });
  } else if (feels <= 8) {
    tips.push({
      level: "warn",
      icon: "衣",
      title: "大衣 + 毛衣",
      text: "偏冷，外套要保暖，可叠穿内搭。",
    });
  } else if (feels <= 15) {
    tips.push({
      level: "",
      icon: "衣",
      title: "夹克 / 风衣",
      text: "微凉，一件外套即可，早晚可加一层。",
    });
  } else if (feels <= 22) {
    tips.push({
      level: "",
      icon: "衣",
      title: "长袖或薄外套",
      text: "舒适偏凉，长袖 T 或薄针织就够。",
    });
  } else if (feels <= 28) {
    tips.push({
      level: "",
      icon: "衣",
      title: "短袖 + 薄裤",
      text: "温暖，短袖即可；室内空调猛可加薄外套。",
    });
  } else {
    tips.push({
      level: "warn",
      icon: "热",
      title: "轻薄透气",
      text: "较热，选透气面料，注意补水防暑。",
    });
  }

  if (rain >= 60 || cond === "rain") {
    tips.push({
      level: "danger",
      icon: "伞",
      title: "建议带伞",
      text: `降水概率约 ${rain}% ，出门请带折叠伞或雨衣。`,
    });
  } else if (rain >= 30) {
    tips.push({
      level: "warn",
      icon: "伞",
      title: "可备雨具",
      text: "有可能下雨，包里放一把伞更稳妥。",
    });
  }

  if (uv >= 8) {
    tips.push({
      level: "danger",
      icon: "晒",
      title: "强防晒",
      text: "紫外线很强：防晒霜 SPF50+、墨镜、遮阳帽。",
    });
  } else if (uv >= 5) {
    tips.push({
      level: "warn",
      icon: "晒",
      title: "防晒",
      text: "紫外线中等偏强，建议涂防晒霜并戴帽。",
    });
  } else if (uv >= 3 && (cond === "sunny" || cond === "cloudy")) {
    tips.push({
      level: "",
      icon: "晒",
      title: "轻度防晒",
      text: "户外久的话可备防晒喷雾或遮阳帽。",
    });
  }

  if (wind >= 40) {
    tips.push({
      level: "warn",
      icon: "风",
      title: "防风",
      text: "风力较大，穿防风外套，长发建议扎起。",
    });
  } else if (wind >= 25) {
    tips.push({
      level: "",
      icon: "风",
      title: "有风",
      text: "体感会更凉，外套选防风款更舒适。",
    });
  }

  if (cond === "fog") {
    tips.push({
      level: "warn",
      icon: "雾",
      title: "能见度低",
      text: "雾天出行注意安全，驾车开雾灯、减速。",
    });
  }

  if (cond === "snow") {
    tips.push({
      level: "danger",
      icon: "雪",
      title: "防滑保暖",
      text: "雨雪天气，穿防滑鞋，注意路面湿滑。",
    });
  }

  return tips;
}

function renderTips(weather) {
  const tips = buildTips(weather);
  const list = $("tipList");
  const section = $("tipsSection");
  list.innerHTML = "";
  tips.forEach((tip) => {
    const li = document.createElement("li");
    li.className = `tip-item ${tip.level}`.trim();
    li.innerHTML = `
      <div class="tip-icon">${tip.icon}</div>
      <div>
        <strong>${tip.title}</strong>
        <span>${tip.text}</span>
      </div>`;
    list.appendChild(li);
  });
  section.hidden = tips.length === 0;
}

function renderWeatherUI(weather) {
  currentWeather = weather;
  $("displayTemp").textContent = `${Math.round(weather.temp)}°`;
  $("displayDesc").textContent = weather.label ?? wmoLabel(weather.code);
  $("displayPlace").textContent = weather.place ?? "当前位置";

  const chips = [];
  if (weather.feelsLike != null) chips.push(`体感 ${Math.round(weather.feelsLike)}°`);
  if (weather.humidity != null) chips.push(`湿度 ${weather.humidity}%`);
  if (weather.rainChance != null) chips.push(`降水 ${weather.rainChance}%`);
  if (weather.uv != null) chips.push(`UV ${weather.uv}`);
  if (weather.windSpeed != null) chips.push(`风速 ${Math.round(weather.windSpeed)} km/h`);

  $("weatherChips").innerHTML = chips.map((c) => `<span class="chip">${c}</span>`).join("");
  renderTips(weather);
  saveJSON(STORAGE.lastWeather, { ...weather, savedAt: Date.now() });
}

async function reversePlace(lat, lon) {
  try {
    const p = new URLSearchParams({ latitude: lat, longitude: lon, language: "zh", count: 1 });
    const res = await fetch(`https://geocoding-api.open-meteo.com/v1/reverse?${p}`);
    if (!res.ok) return null;
    const data = await res.json();
    const r = data.results?.[0];
    if (!r) return null;
    return [r.name, r.admin1].filter(Boolean).join(" · ");
  } catch {
    return null;
  }
}

async function fetchWeather(lat, lon) {
  const params = new URLSearchParams({
    latitude: lat,
    longitude: lon,
    current: [
      "temperature_2m",
      "apparent_temperature",
      "relative_humidity_2m",
      "precipitation",
      "weather_code",
      "wind_speed_10m",
      "uv_index",
    ].join(","),
    daily: "precipitation_probability_max,uv_index_max",
    timezone: "auto",
    forecast_days: 1,
  });

  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
  if (!res.ok) throw new Error("天气服务不可用");
  const data = await res.json();
  const c = data.current;
  const rainChance = data.daily?.precipitation_probability_max?.[0] ?? 0;
  const uvMax = data.daily?.uv_index_max?.[0];
  const uv = c.uv_index ?? uvMax ?? 0;

  return {
    temp: c.temperature_2m,
    feelsLike: c.apparent_temperature,
    humidity: c.relative_humidity_2m,
    precipitation: c.precipitation,
    rainChance: Math.round(rainChance),
    uv: Math.round(uv),
    windSpeed: c.wind_speed_10m,
    code: c.weather_code,
    label: wmoLabel(c.weather_code),
    condition: mapConditionKey(c.weather_code, c.precipitation, c.temperature_2m),
    source: "auto",
    lat,
    lon,
  };
}

async function getDevicePosition() {
  const cap = window.Capacitor;
  const geo = cap?.Plugins?.Geolocation;
  if (cap?.isNativePlatform?.() && geo) {
    const perm = await geo.requestPermissions();
    if (perm.location === "denied" && perm.coarseLocation === "denied") {
      throw new Error("denied");
    }
    const pos = await geo.getCurrentPosition({
      enableHighAccuracy: true,
      timeout: 15000,
    });
    return { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
  }

  if (!navigator.geolocation) throw new Error("unsupported");

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 15000 },
    );
  });
}

async function locateAndLoad() {
  $("displayDesc").textContent = "正在获取天气…";

  try {
    const { latitude, longitude } = await getDevicePosition();
    const weather = await fetchWeather(latitude, longitude);
    const place = await reversePlace(latitude, longitude);
    weather.place = place ?? `${latitude.toFixed(2)}°, ${longitude.toFixed(2)}°`;
    renderWeatherUI(weather);
    return weather;
  } catch {
    $("displayDesc").textContent = "定位失败，请允许定位或用手动录入";
    return null;
  }
}

function saveTodayWeather() {
  if (!currentWeather) {
    alert("请先获取或录入今日天气");
    return;
  }
  const history = loadJSON(STORAGE.weatherHistory, []);
  const entry = {
    date: todayKey(),
    ...currentWeather,
    tips: buildTips(currentWeather).map((t) => t.title),
  };
  const idx = history.findIndex((h) => h.date === entry.date);
  if (idx >= 0) history[idx] = entry;
  else history.unshift(entry);
  saveJSON(STORAGE.weatherHistory, history.slice(0, 60));
  renderHistory();
  alert("已记录今日天气");
}

function renderHistory() {
  const history = loadJSON(STORAGE.weatherHistory, []);
  const list = $("historyList");
  const empty = $("historyEmpty");
  $("historyCount").textContent = `${history.length} 天`;
  list.innerHTML = "";

  if (!history.length) {
    empty.hidden = false;
    return;
  }
  empty.hidden = true;

  history.forEach((h) => {
    const li = document.createElement("li");
    li.className = "history-item";
    const tips = (h.tips || []).slice(0, 2).join(" · ");
    li.innerHTML = `
      <div>
        <div class="date">${h.date}</div>
        <div class="detail">${h.label ?? ""} ${Math.round(h.temp)}°</div>
      </div>
      <div class="detail">${tips || "—"}</div>`;
    list.appendChild(li);
  });
}

function getEssentials() {
  const items = loadJSON(STORAGE.essentials, null);
  if (!items || !items.length) {
    saveJSON(STORAGE.essentials, DEFAULT_ITEMS);
    return [...DEFAULT_ITEMS];
  }
  return items;
}

function getChecksForToday() {
  const all = loadJSON(STORAGE.checks, {});
  const key = todayKey();
  if (!all[key]) {
    all[key] = {};
    saveJSON(STORAGE.checks, all);
  }
  return all[key];
}

function setCheck(item, checked) {
  const all = loadJSON(STORAGE.checks, {});
  const key = todayKey();
  if (!all[key]) all[key] = {};
  all[key][item] = checked;
  saveJSON(STORAGE.checks, all);
}

function renderChecklist() {
  const items = getEssentials();
  const checks = getChecksForToday();
  const list = $("checklist");
  list.innerHTML = "";

  items.forEach((name) => {
    const id = `chk-${name}`;
    const li = document.createElement("li");
    li.className = "check-item" + (checks[name] ? " done" : "");
    li.innerHTML = `
      <input type="checkbox" id="${id}" ${checks[name] ? "checked" : ""} />
      <label for="${id}">${name}</label>
      <button type="button" data-remove="${encodeURIComponent(name)}" aria-label="删除">×</button>`;
    const cb = li.querySelector("input");
    cb.addEventListener("change", () => {
      setCheck(name, cb.checked);
      li.classList.toggle("done", cb.checked);
    });
    li.querySelector("button").addEventListener("click", () => {
      if (!confirm(`删除「${name}」？`)) return;
      const next = getEssentials().filter((x) => x !== name);
      saveJSON(STORAGE.essentials, next);
      const all = loadJSON(STORAGE.checks, {});
      Object.keys(all).forEach((d) => delete all[d][name]);
      saveJSON(STORAGE.checks, all);
      renderChecklist();
    });
    list.appendChild(li);
  });

}

function resetChecks() {
  const all = loadJSON(STORAGE.checks, {});
  all[todayKey()] = {};
  saveJSON(STORAGE.checks, all);
  renderChecklist();
}

function applyManualWeather(formData) {
  const condition = formData.get("condition");
  const temp = Number(formData.get("temp"));
  const rainChance = Number(formData.get("rainChance"));
  const uv = Number(formData.get("uv"));
  const windKey = formData.get("wind");
  const windMap = { calm: 8, breeze: 22, strong: 45 };
  const labels = {
    sunny: "晴（手动）",
    cloudy: "多云（手动）",
    overcast: "阴（手动）",
    rain: "雨（手动）",
    snow: "雪（手动）",
    fog: "雾（手动）",
  };

  const weather = {
    temp,
    feelsLike: temp,
    rainChance,
    uv,
    windSpeed: windMap[windKey] ?? 10,
    condition,
    label: labels[condition],
    source: "manual",
    place: "手动录入",
  };
  renderWeatherUI(weather);
}

function setupTabs() {
  const tabs = document.querySelectorAll(".tab");

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((t) => t.classList.toggle("active", t === tab));
      const isHistory = tab.dataset.tab === "history";
      document.querySelectorAll(".main > .card").forEach((card, i) => {
        if (isHistory) {
          card.classList.toggle("panel-hidden", i < 3);
        } else {
          card.classList.remove("panel-hidden");
        }
      });
    });
  });
}

function registerSW() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  }
}

function warnIfInsecureOnIOS() {
  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
  if (isIOS && !window.isSecureContext) {
    $("displayDesc").textContent = "当前非 HTTPS，iPhone 无法自动定位";
    $("displayPlace").textContent = "请点「手动录入」，或改用下方 HTTPS 链接打开";
  }
}

function init() {
  $("todayLabel").textContent = formatTodayLabel();
  warnIfInsecureOnIOS();
  renderHistory();
  renderChecklist();

  const cached = loadJSON(STORAGE.lastWeather, null);
  if (cached && cached.savedAt && Date.now() - cached.savedAt < 3 * 60 * 60 * 1000) {
    renderWeatherUI(cached);
  }

  $("btnLocate").addEventListener("click", locateAndLoad);
  $("btnSaveWeather").addEventListener("click", saveTodayWeather);
  $("btnResetChecks").addEventListener("click", resetChecks);

  const dialog = $("manualDialog");
  $("btnManualWeather").addEventListener("click", () => dialog.showModal());
  $("manualCancel").addEventListener("click", () => dialog.close());

  const rainRange = document.querySelector('input[name="rainChance"]');
  const uvRange = document.querySelector('input[name="uv"]');
  rainRange?.addEventListener("input", () => {
    $("rainChanceOut").textContent = rainRange.value;
  });
  uvRange?.addEventListener("input", () => {
    $("uvOut").textContent = uvRange.value;
  });

  $("manualForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    applyManualWeather(fd);
    dialog.close();
  });

  $("addItemForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const input = $("newItemInput");
    const name = input.value.trim();
    if (!name) return;
    const items = getEssentials();
    if (!items.includes(name)) {
      items.push(name);
      saveJSON(STORAGE.essentials, items);
    }
    input.value = "";
    renderChecklist();
  });

  setupTabs();
  registerSW();
  const isNative = window.Capacitor?.isNativePlatform?.();
  if (isNative || window.isSecureContext || !/iPhone|iPad|iPod/i.test(navigator.userAgent)) {
    locateAndLoad();
  }
}

init();
