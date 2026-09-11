/* VRAX Spend Tracking — daily spend tracker.
   Everything lives in localStorage; nothing leaves the browser. */

(function () {
  "use strict";

  var KEY = "vrax-spend:v1";
  var THEME_KEY = "vrax-spend:theme";
  var DAY = 86400000;

  var CATEGORIES = [
    { id: "makan",     emoji: "🍜", label: "Makan" },
    { id: "transport", emoji: "🛵", label: "Transport" },
    { id: "belanja",   emoji: "🛍️", label: "Belanja" },
    { id: "tagihan",   emoji: "🧾", label: "Tagihan" },
    { id: "hiburan",   emoji: "🎮", label: "Hiburan" },
    { id: "lainnya",   emoji: "✨", label: "Lainnya" }
  ];

  var $ = function (id) { return document.getElementById(id); };

  /* ---------- storage ---------- */

  function read(key) {
    try { return window.localStorage.getItem(key); } catch (e) { return null; }
  }
  function write(key, value) {
    try { window.localStorage.setItem(key, value); } catch (e) { /* private mode */ }
  }

  var state = null;

  function load() {
    var raw = read(KEY);
    if (raw) {
      try {
        var parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.entries)) {
          parsed.budget = parsed.budget || { daily: 150000, monthly: 4500000 };
          parsed.verdicts = parsed.verdicts || {};
          return parsed;
        }
      } catch (e) { /* fall through to a fresh seed */ }
    }
    return { entries: seed(), budget: { daily: 150000, monthly: 4500000 }, verdicts: seedVerdicts(), demo: true };
  }

  function save() {
    write(KEY, JSON.stringify(state));
  }

  /* ---------- demo data (deterministic, so the page looks alive on first open) ---------- */

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
    for (var back = 181; back >= 0; back--) {
      var date = new Date(today.getTime() - back * DAY);
      var weekend = date.getDay() === 0 || date.getDay() === 6;
      if (rand() < (weekend ? 0.28 : 0.34)) continue; // quiet days keep the map honest
      var count = 1 + Math.floor(rand() * (weekend ? 3 : 2.4));
      var pool = back <= 1 ? CATEGORIES.slice(0, 2) : CATEGORIES;
      for (var i = 0; i < count; i++) {
        var cat = pool[Math.floor(rand() * pool.length)];
        var notes = SEED_NOTES[cat.id];
        var base = cat.id === "tagihan" ? 180000 : cat.id === "belanja" ? 120000 : 28000;
        var amount = Math.round((base + rand() * base * 2.4) / 500) * 500;
        out.push({
          id: "d" + back + "-" + i,
          amount: amount,
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
    for (var back = 181; back >= 1; back--) {
      var key = dateKey(new Date(today.getTime() - back * DAY));
      out[key] = rand() < 0.72 ? "hemat" : "boros";
    }
    return out;
  }

  /* ---------- dates + money ---------- */

  function startOfDay(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }

  function dateKey(d) {
    var m = String(d.getMonth() + 1).padStart(2, "0");
    var day = String(d.getDate()).padStart(2, "0");
    return d.getFullYear() + "-" + m + "-" + day;
  }

  function fromKey(key) {
    var p = key.split("-");
    return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
  }

  var idr = new Intl.NumberFormat("id-ID");

  function money(n) { return "Rp " + idr.format(Math.round(n)); }

  function moneyShort(n) {
    if (n >= 1000000) return "Rp " + idr.format(Math.round(n / 100000) / 10) + "jt";
    if (n >= 1000) return "Rp " + Math.round(n / 1000) + "rb";
    return money(n);
  }

  var DATE_FMT = new Intl.DateTimeFormat("id-ID", {
    day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"
  });

  var DAY_FMT = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" });

  function stamp(ts) { return DATE_FMT.format(new Date(ts)) + " WIB"; }

  function relative(ts) {
    var mins = Math.round((Date.now() - ts) / 60000);
    if (mins < 2) return "baru saja";
    if (mins < 60) return mins + " menit lalu";
    var hours = Math.round(mins / 60);
    if (hours < 24) return hours + " jam lalu";
    var days = Math.floor((startOfDay(new Date()) - startOfDay(new Date(ts))) / DAY);
    if (days <= 1) return "kemarin";
    if (days < 7) return days + " hari lalu";
    var weeks = Math.floor(days / 7);
    return weeks === 1 ? "1 minggu lalu" : weeks + " minggu lalu";
  }

  function categoryOf(id) {
    for (var i = 0; i < CATEGORIES.length; i++) if (CATEGORIES[i].id === id) return CATEGORIES[i];
    return CATEGORIES[CATEGORIES.length - 1];
  }

  /* ---------- derived numbers ---------- */

  function totalsByDay() {
    var map = Object.create(null);
    state.entries.forEach(function (e) {
      map[e.date] = (map[e.date] || 0) + e.amount;
    });
    return map;
  }

  function sorted() {
    return state.entries.slice().sort(function (a, b) { return b.ts - a.ts; });
  }

  /* ---------- rendering ---------- */

  var expanded = false;

  function render() {
    var today = dateKey(new Date());
    var byDay = totalsByDay();
    var todayTotal = byDay[today] || 0;
    var daily = state.budget.daily || 1;

    // budget watch
    var pct = Math.round((todayTotal / daily) * 100);
    $("watch-pct").textContent = pct + "%";
    var left = daily - todayTotal;
    $("watch-sub").textContent = (left >= 0 ? "Sisa " + money(left) : "Lewat " + money(-left)) +
      " · dari " + money(daily) + " · reset 00:00 WIB";

    var todayEntries = state.entries.filter(function (e) { return e.date === today; });
    if (todayEntries.length) {
      var top = todayEntries.reduce(function (a, b) { return b.amount > a.amount ? b : a; });
      var cat = categoryOf(top.cat);
      $("top-note").textContent = cat.emoji + " " + cat.label + " — " + (top.note || "tanpa catatan");
      $("top-amount").textContent = money(top.amount);
    } else {
      $("top-note").textContent = "Belum ada catatan hari ini. Tekan “catat pengeluaran” untuk mulai.";
      $("top-amount").textContent = money(0);
    }

    // verdict tally
    var hemat = 0, boros = 0;
    Object.keys(state.verdicts).forEach(function (k) {
      if (state.verdicts[k] === "hemat") hemat++;
      else if (state.verdicts[k] === "boros") boros++;
    });
    $("c-hemat").textContent = idr.format(hemat);
    $("c-boros").textContent = idr.format(boros);
    var todayVerdict = state.verdicts[today] || null;
    $("v-hemat").setAttribute("aria-pressed", String(todayVerdict === "hemat"));
    $("v-boros").setAttribute("aria-pressed", String(todayVerdict === "boros"));
    $("verdict-state").textContent = todayVerdict
      ? "Tersimpan · hari ini ditandai " + todayVerdict
      : "Belum dinilai";

    // latest expense
    var list = sorted();
    if (list.length) {
      $("latest-rel").textContent = relative(list[0].ts);
      $("latest-date").textContent = stamp(list[0].ts);
    } else {
      $("latest-rel").textContent = "belum ada";
      $("latest-date").textContent = "Catat transaksi pertamamu →";
    }
    $("today-total").textContent = money(todayTotal);

    // stat tiles
    var activeDays = Object.keys(byDay).length;
    var grand = state.entries.reduce(function (sum, e) { return sum + e.amount; }, 0);
    var biggest = state.entries.reduce(function (m, e) { return Math.max(m, e.amount); }, 0);
    $("s-count").textContent = idr.format(state.entries.length);
    $("s-avg").textContent = activeDays ? moneyShort(grand / activeDays) : money(0);
    $("s-max").textContent = biggest ? moneyShort(biggest) : money(0);

    renderMonthlyBudget(byDay);
    renderHeat(byDay);
    renderLog(list);
  }

  function renderMonthlyBudget(byDay) {
    var now = new Date();
    var prefix = dateKey(now).slice(0, 7);
    var used = 0;
    Object.keys(byDay).forEach(function (k) { if (k.indexOf(prefix) === 0) used += byDay[k]; });

    var cap = state.budget.monthly || 1;
    var ratio = Math.min(used / cap, 1);
    var lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    var daysLeft = lastDay - now.getDate() + 1;

    $("budget-fill").style.width = (ratio * 100).toFixed(1) + "%";
    $("budget-used").textContent = money(used);
    $("budget-cap").textContent = money(cap);
    $("budget-track").setAttribute("aria-label",
      "Budget bulanan terpakai " + Math.round(ratio * 100) + " persen");
    $("budget-left-days").textContent = "sisa " + daysLeft + " hari";
    $("budget-state").textContent = used > cap
      ? "lewat " + money(used - cap)
      : "aman " + money(cap - used) + " · " + moneyShort((cap - used) / daysLeft) + "/hari";
  }

  var MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
  var DAY_NAMES = ["Sen", "", "Rab", "", "Jum", "", "Min"];

  function level(total) {
    var daily = state.budget.daily || 1;
    if (!total) return 0;
    if (total <= daily * 0.6) return 1;
    if (total <= daily * 1.1) return 2;
    return 3;
  }

  function renderHeat(byDay) {
    var heat = $("heat");
    heat.textContent = "";

    var today = startOfDay(new Date());
    // Monday-first grid: walk back to the Monday 25 weeks before this week.
    var offset = (today.getDay() + 6) % 7;
    var thisMonday = new Date(today.getTime() - offset * DAY);
    var start = new Date(thisMonday.getTime() - 25 * 7 * DAY);

    var nameCol = document.createDocumentFragment();
    var corner = document.createElement("span"); // masks scrolled cells above the day names
    corner.className = "heat-dayname";
    nameCol.appendChild(corner);
    DAY_NAMES.forEach(function (name) {
      var el = document.createElement("span");
      el.className = "heat-dayname";
      el.textContent = name;
      nameCol.appendChild(el);
    });
    heat.appendChild(nameCol);

    var lastMonth = -1;
    for (var week = 0; week < 26; week++) {
      var monday = new Date(start.getTime() + week * 7 * DAY);
      var monthLabel = document.createElement("span");
      monthLabel.className = "heat-month";
      var sunday = new Date(monday.getTime() + 6 * DAY);
      if (sunday.getMonth() !== lastMonth) {
        lastMonth = sunday.getMonth();
        monthLabel.textContent = MONTHS[lastMonth];
      }
      heat.appendChild(monthLabel);

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
        heat.appendChild(cell);
      }
    }

    // the newest weeks are the point — start scrolled to today
    var scroller = heat.parentNode;
    scroller.scrollLeft = scroller.scrollWidth;
  }

  function renderLog(list) {
    var log = $("log");
    log.textContent = "";

    if (!list.length) {
      var empty = document.createElement("p");
      empty.className = "empty";
      empty.textContent = "Belum ada catatan. Semua yang kamu simpan muncul di sini.";
      log.appendChild(empty);
      $("more-btn").hidden = true;
      return;
    }

    var shown = expanded ? list : list.slice(0, 3);
    shown.forEach(function (entry) {
      log.appendChild(bubble(entry));
    });

    $("more-btn").hidden = list.length <= 3;
    $("more-btn").textContent = expanded
      ? "Tampilkan lebih sedikit ↑"
      : "Tampilkan semua " + idr.format(list.length) + " catatan ↓";
  }

  function bubble(entry) {
    var cat = categoryOf(entry.cat);

    var row = document.createElement("div");
    row.className = "entry";

    var avatar = document.createElement("div");
    avatar.className = "avatar";
    avatar.setAttribute("aria-hidden", "true");
    avatar.textContent = cat.emoji;
    row.appendChild(avatar);

    var box = document.createElement("div");
    box.className = "bubble";

    var top = document.createElement("div");
    top.className = "bubble-top";
    var pill = document.createElement("span");
    pill.className = "pill-when";
    pill.textContent = relative(entry.ts);
    var when = document.createElement("span");
    when.className = "meta";
    when.textContent = stamp(entry.ts);
    top.appendChild(pill);
    top.appendChild(when);
    box.appendChild(top);

    var text = document.createElement("p");
    text.className = "bubble-text";
    var amount = document.createElement("b");
    amount.textContent = money(entry.amount);
    text.appendChild(amount);
    text.appendChild(document.createTextNode(" · " + cat.label + (entry.note ? " — " + entry.note : "")));
    box.appendChild(text);

    var foot = document.createElement("div");
    foot.className = "bubble-foot";
    var del = document.createElement("button");
    del.className = "link";
    del.type = "button";
    del.textContent = "Hapus catatan ✕";
    del.addEventListener("click", function () {
      state.entries = state.entries.filter(function (e) { return e.id !== entry.id; });
      state.demo = false;
      save();
      render();
    });
    foot.appendChild(del);
    box.appendChild(foot);

    row.appendChild(box);
    return row;
  }

  /* ---------- dialogs ---------- */

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

  var chosenCat = "makan";

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

  /* ---------- wiring ---------- */

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
        var systemDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
        current = systemDark ? "dark" : "light";
      }
      var next = current === "dark" ? "light" : "dark";
      root.setAttribute("data-theme", next);
      write(THEME_KEY, next);
    });

    $("add-btn").addEventListener("click", function () {
      $("f-amount").value = "";
      $("f-note").value = "";
      $("f-date").value = dateKey(new Date());
      $("f-error").hidden = true;
      open($("add-dlg"));
      $("f-amount").focus();
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

    $("budget-btn").addEventListener("click", function () {
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
      state.verdicts[today] = state.verdicts[today] === value ? undefined : value;
      if (!state.verdicts[today]) delete state.verdicts[today];
      save();
      render();
    }

    $("more-btn").addEventListener("click", function () {
      expanded = !expanded;
      render();
      if (!expanded) $("log").scrollIntoView({ block: "start", behavior: "smooth" });
    });

    $("jump-log").addEventListener("click", function () {
      $("log").scrollIntoView({ block: "start", behavior: "smooth" });
    });

    $("about-btn").addEventListener("click", function () {
      $("about-seed").textContent = state.demo
        ? "Sekarang menampilkan data contoh 26 minggu. Hapus lewat “mulai dari nol” kapan saja."
        : "Menampilkan datamu sendiri — " + idr.format(state.entries.length) + " catatan tersimpan.";
      open($("about-dlg"));
    });
    $("about-close").addEventListener("click", function () { close($("about-dlg")); });

    $("wipe-btn").addEventListener("click", function () {
      if (!window.confirm("Hapus semua catatan dan mulai dari nol?")) return;
      state = { entries: [], budget: state.budget, verdicts: {}, demo: false };
      expanded = false;
      save();
      render();
    });

    render();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
