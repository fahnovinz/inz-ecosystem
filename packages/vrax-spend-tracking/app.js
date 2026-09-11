/* VRAX Spend Tracking — daily spend tracker.
   Everything lives in localStorage; nothing leaves the device. */

(function () {
  "use strict";

  var KEY = "vrax-spend:v1";
  var THEME_KEY = "vrax-spend:theme";
  var DAY = 86400000;
  var DAYS_PER_PAGE = 10;

  var CATEGORIES = [
    { id: "makan",     emoji: "🍜", label: "Makan" },
    { id: "transport", emoji: "🛵", label: "Transport" },
    { id: "belanja",   emoji: "🛍️", label: "Belanja" },
    { id: "tagihan",   emoji: "🧾", label: "Tagihan" },
    { id: "hiburan",   emoji: "🎮", label: "Hiburan" },
    { id: "lainnya",   emoji: "✨", label: "Lainnya" }
  ];

  var state = null;
  var weeks = 13;
  var daysShown = DAYS_PER_PAGE;
  var chosenCat = "makan";
  var activeScreen = "home";
  var SCREENS = ["home", "history", "log"];

  var $ = function (id) { return document.getElementById(id); };

  /* ───────── storage ───────── */

  function read(key) {
    try { return window.localStorage.getItem(key); } catch (e) { return null; }
  }

  function write(key, value) {
    try { window.localStorage.setItem(key, value); } catch (e) { /* private mode */ }
  }

  function load() {
    var raw = read(KEY);
    if (raw) {
      try {
        var parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.entries)) {
          parsed.budget = parsed.budget || { daily: 150000, monthly: 4500000 };
          parsed.verdicts = parsed.verdicts || {};
          parsed.name = typeof parsed.name === "string" ? parsed.name : "";
          return parsed;
        }
      } catch (e) { /* fall through to a fresh seed */ }
    }
    return {
      entries: seed(),
      budget: { daily: 150000, monthly: 4500000 },
      verdicts: seedVerdicts(),
      name: "",
      demo: true
    };
  }

  function save() { write(KEY, JSON.stringify(state)); }

  /* ───────── demo data, so the app opens in a working state ───────── */

  function rng(seedValue) {
    var a = seedValue >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  var SEED_NOTES = {
    makan:     ["Nasi padang + es teh", "Kopi susu pagi", "Makan siang kantor", "Gorengan sore", "Mie ayam langganan", "Bakso depan gang"],
    transport: ["Ojek online ke kantor", "Bensin motor", "Parkir + tol", "KRL pulang pergi"],
    belanja:   ["Belanja mingguan", "Sabun + deterjen", "Kaos polos", "Kabel charger"],
    tagihan:   ["Token listrik", "Paket data", "Langganan cloud", "Iuran kos"],
    hiburan:   ["Nonton akhir pekan", "Langganan musik", "Main bareng teman"],
    lainnya:   ["Kado ulang tahun", "Obat + vitamin", "Potong rambut"]
  };

  function seed() {
    var rand = rng(20260911);
    var out = [];
    var today = startOfDay(new Date());
    for (var back = 363; back >= 0; back--) {
      var date = new Date(today.getTime() - back * DAY);
      var weekend = date.getDay() === 0 || date.getDay() === 6;
      if (rand() < (weekend ? 0.28 : 0.34)) continue;
      var count = 1 + Math.floor(rand() * (weekend ? 3 : 2.4));
      var pool = back <= 1 ? CATEGORIES.slice(0, 2) : CATEGORIES;
      for (var i = 0; i < count; i++) {
        var cat = pool[Math.floor(rand() * pool.length)];
        var notes = SEED_NOTES[cat.id];
        var base = cat.id === "tagihan" ? 180000 : cat.id === "belanja" ? 120000 : 28000;
        out.push({
          id: "d" + back + "-" + i,
          amount: Math.round((base + rand() * base * 2.4) / 500) * 500,
          cat: cat.id,
          note: notes[Math.floor(rand() * notes.length)],
          date: dateKey(date),
          ts: date.getTime() + (8 + Math.floor(rand() * 12)) * 3600000
        });
      }
    }
    return out;
  }

  function seedVerdicts() {
    var rand = rng(777);
    var out = {};
    var today = startOfDay(new Date());
    for (var back = 363; back >= 1; back--) {
      out[dateKey(new Date(today.getTime() - back * DAY))] = rand() < 0.72 ? "hemat" : "boros";
    }
    return out;
  }

  /* ───────── dates + money ───────── */

  function startOfDay(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }

  function dateKey(d) {
    return d.getFullYear() + "-" +
      String(d.getMonth() + 1).padStart(2, "0") + "-" +
      String(d.getDate()).padStart(2, "0");
  }

  function fromKey(key) {
    var p = key.split("-");
    return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
  }

  var idr = new Intl.NumberFormat("id-ID");
  var DAY_FMT = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" });
  var STAMP_FMT = new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "short", year: "numeric" });
  var TIME_FMT = new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit" });

  function money(n) { return "Rp " + idr.format(Math.round(n)); }

  function moneyShort(n) {
    if (n >= 1000000) return "Rp " + idr.format(Math.round(n / 100000) / 10) + "jt";
    if (n >= 1000) return "Rp " + Math.round(n / 1000) + "rb";
    return money(n);
  }

  function dayLabel(key) {
    var today = startOfDay(new Date()).getTime();
    var diff = Math.round((today - fromKey(key).getTime()) / DAY);
    if (diff === 0) return "Hari ini";
    if (diff === 1) return "Kemarin";
    if (diff < 7) return diff + " hari lalu";
    return DAY_FMT.format(fromKey(key));
  }

  function categoryOf(id) {
    for (var i = 0; i < CATEGORIES.length; i++) if (CATEGORIES[i].id === id) return CATEGORIES[i];
    return CATEGORIES[CATEGORIES.length - 1];
  }

  /* ───────── derived ───────── */

  function totalsByDay() {
    var map = Object.create(null);
    state.entries.forEach(function (e) { map[e.date] = (map[e.date] || 0) + e.amount; });
    return map;
  }

  function sorted() {
    return state.entries.slice().sort(function (a, b) { return b.ts - a.ts; });
  }

  function level(total) {
    var daily = state.budget.daily || 1;
    if (!total) return 0;
    if (total <= daily * 0.6) return 1;
    if (total <= daily * 1.1) return 2;
    return 3;
  }

  /* ───────── render ───────── */

  function render() {
    var today = dateKey(new Date());
    var byDay = totalsByDay();
    var list = sorted();

    renderGreeting();
    $("daystamp").textContent = STAMP_FMT.format(new Date()).toUpperCase();

    renderHero(byDay[today] || 0);
    renderRecent(list);
    renderVerdict(today);
    renderStats(byDay);
    renderMonthly(byDay);
    renderHeat(byDay);
    renderLog(list);
  }

  function greetingWord() {
    var hour = new Date().getHours();
    if (hour < 11) return "Selamat pagi";
    if (hour < 15) return "Selamat siang";
    if (hour < 18) return "Selamat sore";
    return "Selamat malam";
  }

  function renderGreeting() {
    var name = (state.name || "").trim();
    $("greeting").textContent = greetingWord() + (name ? ", " + name : "") + " 👋";
  }

  function renderHero(todayTotal) {
    var daily = state.budget.daily || 1;
    var ratio = todayTotal / daily;
    var fill = $("hero-fill");

    $("today-total").textContent = money(todayTotal);
    fill.style.width = Math.min(ratio, 1) * 100 + "%";
    fill.className = ratio > 1 ? "over" : "";

    if (!todayTotal) {
      $("hero-sub").textContent = "Belum ada pengeluaran. Budget " + money(daily) + " utuh.";
    } else if (ratio > 1) {
      $("hero-sub").innerHTML = "Lewat <b>" + money(todayTotal - daily) + "</b> dari budget " + money(daily);
    } else {
      $("hero-sub").innerHTML = Math.round(ratio * 100) + "% kepakai · sisa <b>" +
        money(daily - todayTotal) + "</b>";
    }
  }

  function renderRecent(list) {
    var box = $("recent");
    box.textContent = "";
    if (!list.length) {
      box.appendChild(emptyNote("Belum ada catatan. Tekan tombol + untuk mulai."));
      return;
    }
    list.slice(0, 3).forEach(function (entry) { box.appendChild(row(entry, true)); });
  }

  function renderVerdict(today) {
    var hemat = 0, boros = 0;
    Object.keys(state.verdicts).forEach(function (k) {
      if (state.verdicts[k] === "hemat") hemat++;
      else if (state.verdicts[k] === "boros") boros++;
    });

    var chosen = state.verdicts[today] || null;
    $("v-hemat").setAttribute("aria-pressed", String(chosen === "hemat"));
    $("v-boros").setAttribute("aria-pressed", String(chosen === "boros"));
    $("verdict-state").textContent = idr.format(hemat) + " hari hemat · " +
      idr.format(boros) + " hari boros";
  }

  function renderStats(byDay) {
    var activeDays = Object.keys(byDay).length;
    var grand = state.entries.reduce(function (sum, e) { return sum + e.amount; }, 0);
    var biggest = state.entries.reduce(function (m, e) { return Math.max(m, e.amount); }, 0);

    $("s-count").textContent = idr.format(state.entries.length);
    $("s-avg").textContent = activeDays ? moneyShort(grand / activeDays) : money(0);
    $("s-max").textContent = biggest ? moneyShort(biggest) : money(0);
  }

  function renderMonthly(byDay) {
    var now = new Date();
    var prefix = dateKey(now).slice(0, 7);
    var used = 0;
    Object.keys(byDay).forEach(function (k) { if (k.indexOf(prefix) === 0) used += byDay[k]; });

    var cap = state.budget.monthly || 1;
    var ratio = used / cap;
    var daysLeft = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - now.getDate() + 1;
    var fill = $("budget-fill");

    fill.style.width = Math.min(ratio, 1) * 100 + "%";
    fill.className = ratio > 1 ? "over" : "";
    $("budget-used").textContent = money(used);
    $("budget-cap").textContent = money(cap);
    $("budget-left-days").textContent = "sisa " + daysLeft + " hari";
    $("budget-track").setAttribute("aria-label",
      "Budget bulanan terpakai " + Math.round(ratio * 100) + " persen");
    $("budget-state").textContent = used > cap
      ? "lewat " + money(used - cap)
      : "aman · sisa " + moneyShort((cap - used) / daysLeft) + " per hari";
  }

  var MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
  var DAY_NAMES = ["Sen", "", "Rab", "", "Jum", "", "Min"];

  var renderedWeeks = null;

  function renderHeat(byDay) {
    var heat = $("heat");
    var days = $("heat-days");
    var scroller = $("heat-scroll");
    var keptScroll = scroller.scrollLeft;
    var sameRange = renderedWeeks === weeks;
    heat.textContent = "";
    days.textContent = "";

    days.appendChild(document.createElement("span")); // lines up with the month row
    DAY_NAMES.forEach(function (name) {
      var el = document.createElement("span");
      el.textContent = name;
      days.appendChild(el);
    });

    var today = startOfDay(new Date());
    var thisMonday = new Date(today.getTime() - ((today.getDay() + 6) % 7) * DAY);
    var start = new Date(thisMonday.getTime() - (weeks - 1) * 7 * DAY);

    var lastMonth = -1;
    for (var week = 0; week < weeks; week++) {
      var monday = new Date(start.getTime() + week * 7 * DAY);
      var sunday = new Date(monday.getTime() + 6 * DAY);

      var column = document.createElement("div");
      column.className = "week";

      var monthLabel = document.createElement("span");
      monthLabel.className = "heat-month";
      if (sunday.getMonth() !== lastMonth) {
        lastMonth = sunday.getMonth();
        monthLabel.textContent = MONTHS[lastMonth];
      }
      column.appendChild(monthLabel);

      for (var d = 0; d < 7; d++) {
        var date = new Date(monday.getTime() + d * DAY);
        var cell = document.createElement("span");
        cell.className = "cell";
        if (date > today) {
          cell.className += " future";
        } else {
          var total = byDay[dateKey(date)] || 0;
          var lv = level(total);
          if (lv) cell.className += " lv" + lv;
          cell.title = DAY_FMT.format(date) + " · " + money(total);
        }
        column.appendChild(cell);
      }

      heat.appendChild(column);
    }

    heat.setAttribute("aria-label", "Peta pengeluaran " + weeks + " minggu terakhir");
    renderedWeeks = weeks;

    if (sameRange) scroller.scrollLeft = keptScroll;
    else scrollHeatToToday();
  }

  function scrollHeatToToday() {
    var scroller = $("heat-scroll");
    scroller.scrollLeft = scroller.scrollWidth;
  }

  function renderLog(list) {
    var log = $("log");
    log.textContent = "";

    if (!list.length) {
      var card = document.createElement("div");
      card.className = "card";
      card.appendChild(emptyNote("Belum ada catatan. Semua yang kamu simpan muncul di sini."));
      log.appendChild(card);
      $("more-btn").hidden = true;
      return;
    }

    var order = [];
    var groups = Object.create(null);
    list.forEach(function (entry) {
      if (!groups[entry.date]) { groups[entry.date] = []; order.push(entry.date); }
      groups[entry.date].push(entry);
    });

    order.slice(0, daysShown).forEach(function (key) {
      var group = document.createElement("section");
      group.className = "daygroup";

      var head = document.createElement("div");
      head.className = "daygroup-head";
      var pill = document.createElement("span");
      pill.className = "pill-when";
      pill.textContent = dayLabel(key);
      var sum = document.createElement("span");
      sum.className = "meta num";
      sum.textContent = money(groups[key].reduce(function (s, e) { return s + e.amount; }, 0));
      head.appendChild(pill);
      head.appendChild(sum);
      group.appendChild(head);

      var card = document.createElement("div");
      card.className = "card";
      var rows = document.createElement("div");
      rows.className = "rows";
      groups[key].forEach(function (entry) { rows.appendChild(row(entry, false)); });
      card.appendChild(rows);
      group.appendChild(card);

      log.appendChild(group);
    });

    $("more-btn").hidden = order.length <= daysShown;
  }

  function emptyNote(text) {
    var p = document.createElement("p");
    p.className = "empty";
    p.textContent = text;
    return p;
  }

  function row(entry, compact) {
    var cat = categoryOf(entry.cat);

    var el = document.createElement("div");
    el.className = "row";

    var emoji = document.createElement("span");
    emoji.className = "row-emoji";
    emoji.setAttribute("aria-hidden", "true");
    emoji.textContent = cat.emoji;
    el.appendChild(emoji);

    var body = document.createElement("div");
    body.className = "row-body";
    var title = document.createElement("b");
    title.textContent = entry.note || cat.label;
    var sub = document.createElement("span");
    var isToday = entry.date === dateKey(new Date());
    sub.textContent = compact && !isToday
      ? cat.label + " · " + dayLabel(entry.date).toLowerCase()
      : cat.label + " · " + TIME_FMT.format(new Date(entry.ts));
    body.appendChild(title);
    body.appendChild(sub);
    el.appendChild(body);

    var amount = document.createElement("span");
    amount.className = "row-amount";
    amount.textContent = money(entry.amount);
    el.appendChild(amount);

    if (!compact) {
      var del = document.createElement("button");
      del.className = "row-del";
      del.type = "button";
      del.textContent = "✕";
      del.setAttribute("aria-label", "Hapus " + (entry.note || cat.label) + " " + money(entry.amount));
      del.addEventListener("click", function () {
        state.entries = state.entries.filter(function (e) { return e.id !== entry.id; });
        state.demo = false;
        save();
        render();
      });
      el.appendChild(del);
    }

    return el;
  }

  /* ───────── navigation + sheets ───────── */

  function reducedMotion() {
    return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function markTab(name) {
    if (activeScreen === name) return;
    activeScreen = name;
    Array.prototype.forEach.call(document.querySelectorAll(".tab"), function (tab) {
      tab.setAttribute("aria-selected", String(tab.dataset.screen === name));
    });
  }

  // While a tap-driven scroll is in flight the pager passes over the panels in
  // between; without this lock the scroll listener would drag the highlight
  // backwards and then walk it across every tab.
  var navLocked = false;
  var navTimer = null;

  function lockTabs(ms) {
    navLocked = true;
    window.clearTimeout(navTimer);
    navTimer = window.setTimeout(function () { navLocked = false; }, ms);
  }

  function showScreen(name, smooth) {
    var index = SCREENS.indexOf(name);
    if (index < 0) return;
    var pager = $("pager");
    var jump = Math.abs(index - SCREENS.indexOf(activeScreen)) > 1;
    var instant = smooth === false || jump || reducedMotion();

    markTab(name);
    lockTabs(instant ? 80 : 600);
    pager.scrollTo({ left: index * pager.clientWidth, behavior: instant ? "auto" : "smooth" });
  }

  // A swipe moves the pager; the tab bar follows whatever panel it settles on.
  function watchPager() {
    var pager = $("pager");
    var frame = null;

    pager.addEventListener("scrollend", function () { navLocked = false; });

    pager.addEventListener("scroll", function () {
      if (navLocked || frame) return;
      frame = window.requestAnimationFrame(function () {
        frame = null;
        var width = pager.clientWidth || 1;
        var index = Math.round(pager.scrollLeft / width);
        markTab(SCREENS[Math.min(Math.max(index, 0), SCREENS.length - 1)]);
      });
    }, { passive: true });

    window.addEventListener("resize", function () { showScreen(activeScreen, false); });
  }

  function open(dlg) {
    if (dlg.showModal) dlg.showModal();
    else dlg.setAttribute("open", "");
  }

  function close(dlg) {
    if (dlg.close) dlg.close();
    else dlg.removeAttribute("open");
  }

  function digits(value) {
    var n = Number(String(value).replace(/[^\d]/g, ""));
    return isFinite(n) ? n : 0;
  }

  function buildChips() {
    var box = $("f-chips");
    CATEGORIES.forEach(function (cat) {
      var chip = document.createElement("button");
      chip.type = "button";
      chip.className = "chip";
      chip.textContent = cat.emoji + " " + cat.label;
      chip.setAttribute("aria-pressed", String(cat.id === chosenCat));
      chip.addEventListener("click", function () {
        chosenCat = cat.id;
        Array.prototype.forEach.call(box.children, function (other) {
          other.setAttribute("aria-pressed", String(other === chip));
        });
      });
      box.appendChild(chip);
    });
  }

  /* ───────── wiring ───────── */

  function init() {
    state = load();
    buildChips();

    var storedTheme = read(THEME_KEY);
    if (storedTheme === "dark" || storedTheme === "light") {
      document.documentElement.setAttribute("data-theme", storedTheme);
    }

    $("theme-btn").addEventListener("click", function () {
      var root = document.documentElement;
      var current = root.getAttribute("data-theme");
      if (!current) {
        current = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark" : "light";
      }
      var next = current === "dark" ? "light" : "dark";
      root.setAttribute("data-theme", next);
      write(THEME_KEY, next);
    });

    var tabs = Array.prototype.slice.call(document.querySelectorAll(".tab"));
    tabs.forEach(function (tab) {
      tab.addEventListener("click", function () { showScreen(tab.dataset.screen); });
      tab.addEventListener("keydown", function (event) {
        var step = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
        if (!step) return;
        event.preventDefault();
        var next = tabs[(tabs.indexOf(tab) + step + tabs.length) % tabs.length];
        next.focus();
        showScreen(next.dataset.screen);
      });
    });
    watchPager();

    $("to-log").addEventListener("click", function () { showScreen("log"); });

    Array.prototype.forEach.call(document.querySelectorAll(".seg button"), function (seg) {
      seg.addEventListener("click", function () {
        weeks = Number(seg.dataset.weeks);
        Array.prototype.forEach.call(document.querySelectorAll(".seg button"), function (other) {
          other.setAttribute("aria-pressed", String(other === seg));
        });
        renderHeat(totalsByDay());
      });
    });

    $("add-btn").addEventListener("click", function () {
      $("f-amount").value = "";
      $("f-note").value = "";
      $("f-date").value = dateKey(new Date());
      $("f-error").hidden = true;
      open($("add-dlg"));
      $("f-amount").focus({ preventScroll: true });
    });

    $("add-cancel").addEventListener("click", function () { close($("add-dlg")); });

    $("add-form").addEventListener("submit", function (event) {
      var amount = digits($("f-amount").value);
      if (amount <= 0) {
        event.preventDefault();
        $("f-error").hidden = false;
        return;
      }
      var key = $("f-date").value || dateKey(new Date());
      var isToday = key === dateKey(new Date());
      state.entries.push({
        id: "e" + Date.now() + "-" + Math.random().toString(36).slice(2, 7),
        amount: amount,
        cat: chosenCat,
        note: $("f-note").value.trim(),
        date: key,
        ts: isToday ? Date.now() : fromKey(key).getTime() + 12 * 3600000
      });
      state.demo = false;
      save();
      render();
    });

    $("edit-budget").addEventListener("click", function () {
      $("f-daily").value = idr.format(state.budget.daily);
      $("f-monthly").value = idr.format(state.budget.monthly);
      open($("budget-dlg"));
    });

    $("budget-cancel").addEventListener("click", function () { close($("budget-dlg")); });

    $("budget-form").addEventListener("submit", function () {
      state.budget.daily = digits($("f-daily").value) || state.budget.daily;
      state.budget.monthly = digits($("f-monthly").value) || state.budget.monthly;
      save();
      render();
    });

    $("v-hemat").addEventListener("click", function () { setVerdict("hemat"); });
    $("v-boros").addEventListener("click", function () { setVerdict("boros"); });

    function setVerdict(value) {
      var today = dateKey(new Date());
      if (state.verdicts[today] === value) delete state.verdicts[today];
      else state.verdicts[today] = value;
      save();
      render();
    }

    $("more-btn").addEventListener("click", function () {
      var panel = $("screen-log");
      var keep = panel.scrollTop;
      daysShown += DAYS_PER_PAGE;
      render();
      panel.scrollTop = keep;
      window.requestAnimationFrame(function () { panel.scrollTop = keep; });
    });

    $("settings-btn").addEventListener("click", function () {
      $("f-name").value = state.name || "";
      $("settings-state").textContent = state.demo
        ? "Sekarang menampilkan data contoh satu tahun."
        : idr.format(state.entries.length) + " catatan tersimpan di perangkat ini.";
      open($("settings-dlg"));
    });

    $("settings-form").addEventListener("submit", function () {
      state.name = $("f-name").value.trim().slice(0, 24);
      save();
      render();
    });

    $("wipe-btn").addEventListener("click", function () {
      if (!window.confirm("Hapus semua catatan dan mulai dari nol?")) return;
      state = { entries: [], budget: state.budget, verdicts: {}, name: state.name, demo: false };
      daysShown = DAYS_PER_PAGE;
      close($("settings-dlg"));
      save();
      render();
    });

    render();
    showScreen("home", false);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
