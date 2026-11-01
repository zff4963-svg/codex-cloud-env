/**
 * Xinghuo healthy engagement rewards (vanilla IIFE).
 * XP / level / streak / badges / daily goal — no loot-box gambling.
 * Exposes window.XinghuoReward
 * Spec: docs/engagement-reward.md
 */
(function (global) {
  "use strict";

  var KEY = "xinghuo-reward-v1";
  var LEVELS = [
    { level: 1, xp: 0, title: "初学星火" },
    { level: 2, xp: 100, title: "勤记学子" },
    { level: 3, xp: 250, title: "经络行者" },
    { level: 4, xp: 500, title: "方证学人" },
    { level: 5, xp: 900, title: "三基通达" },
    { level: 6, xp: 1500, title: "辨证有方" },
    { level: 7, xp: 2400, title: "杏林新秀" },
    { level: 8, xp: 3600, title: "博闻医士" },
    { level: 9, xp: 5200, title: "慎思明辨" },
    { level: 10, xp: 7000, title: "星火传灯" }
  ];

  var BADGE_DEFS = {
    first_clear: { name: "初试锋芒", desc: "任意游戏首次完成" },
    streak_3: { name: "三日不断", desc: "连续学习 ≥ 3 天" },
    streak_7: { name: "七日星火", desc: "连续学习 ≥ 7 天" },
    perfect_run: { name: "满贯一局", desc: "一局准确率 100%" },
    xp_500: { name: "积学五百", desc: "累计 XP ≥ 500" },
    polymath: { name: "五科探路", desc: "五个专业轨道都逛过" },
    prevention_rookie: { name: "公卫入门", desc: "完成预防医学测验" },
    anatomy_rookie: { name: "西基入门", desc: "完成解剖生理闯关" },
    formula_rookie: { name: "方药入门", desc: "完成方剂闪卡" },
    meridian_rookie: { name: "腧穴入门", desc: "完成经络配对或取穴拖拽" }
  };

  function todayKey() {
    var d = new Date();
    var m = d.getMonth() + 1;
    var day = d.getDate();
    return (
      d.getFullYear() +
      "-" +
      (m < 10 ? "0" : "") +
      m +
      "-" +
      (day < 10 ? "0" : "") +
      day
    );
  }

  function yesterdayKey() {
    var d = new Date();
    d.setDate(d.getDate() - 1);
    var m = d.getMonth() + 1;
    var day = d.getDate();
    return (
      d.getFullYear() +
      "-" +
      (m < 10 ? "0" : "") +
      m +
      "-" +
      (day < 10 ? "0" : "") +
      day
    );
  }

  function emptyState() {
    return {
      xp: 0,
      streak: 0,
      lastPlayDate: null,
      dailyXp: 0,
      dailyDate: null,
      dailyGoalDone: false,
      badges: [],
      majorsVisited: [],
      teachToday: {},
      playsTotal: 0,
      updatedAt: null
    };
  }

  function loadState() {
    try {
      var raw = global.localStorage && global.localStorage.getItem(KEY);
      if (!raw) return emptyState();
      var data = JSON.parse(raw);
      if (!data || typeof data !== "object") return emptyState();
      var base = emptyState();
      var k;
      for (k in base) {
        if (Object.prototype.hasOwnProperty.call(base, k) && data[k] != null) {
          base[k] = data[k];
        }
      }
      if (!Array.isArray(base.badges)) base.badges = [];
      if (!Array.isArray(base.majorsVisited)) base.majorsVisited = [];
      if (!base.teachToday || typeof base.teachToday !== "object") base.teachToday = {};
      return base;
    } catch (e) {
      return emptyState();
    }
  }

  function saveState(patch) {
    var cur = loadState();
    var next = {};
    var k;
    for (k in cur) {
      if (Object.prototype.hasOwnProperty.call(cur, k)) next[k] = cur[k];
    }
    if (patch && typeof patch === "object") {
      for (k in patch) {
        if (Object.prototype.hasOwnProperty.call(patch, k)) next[k] = patch[k];
      }
    }
    next.updatedAt = new Date().toISOString();
    try {
      if (global.localStorage) {
        global.localStorage.setItem(KEY, JSON.stringify(next));
      }
    } catch (e) {
      /* ignore */
    }
    return next;
  }

  function getLevel(xp) {
    var x = typeof xp === "number" ? xp : loadState().xp;
    var i;
    var cur = LEVELS[0];
    for (i = 0; i < LEVELS.length; i++) {
      if (x >= LEVELS[i].xp) cur = LEVELS[i];
    }
    var next = null;
    for (i = 0; i < LEVELS.length; i++) {
      if (LEVELS[i].level === cur.level + 1) {
        next = LEVELS[i];
        break;
      }
    }
    return {
      level: cur.level,
      title: cur.title,
      xp: x,
      nextXp: next ? next.xp : null,
      progress:
        next && next.xp > cur.xp
          ? Math.max(0, Math.min(1, (x - cur.xp) / (next.xp - cur.xp)))
          : 1
    };
  }

  function ensureDaily(state) {
    var t = todayKey();
    if (state.dailyDate !== t) {
      state.dailyDate = t;
      state.dailyXp = 0;
      state.dailyGoalDone = false;
      state.teachToday = {};
    }
    return state;
  }

  function celebrate(message, flags) {
    if (!global.document || !global.document.body) return;
    flags = flags || {};
    var el = global.document.getElementById("rewardToast");
    if (!el) {
      el = global.document.createElement("div");
      el.id = "rewardToast";
      el.className = "reward-toast";
      el.setAttribute("role", "status");
      global.document.body.appendChild(el);
    }
    var text = message || "";
    var levelUp = !!flags.levelUp || text.indexOf("升级") >= 0;
    var streakMark =
      !!flags.streak ||
      text.indexOf("三日不断") >= 0 ||
      text.indexOf("七日星火") >= 0;
    el.textContent = text;
    el.classList.toggle("is-level", levelUp);
    el.classList.toggle("is-streak", streakMark);
    el.classList.toggle("is-celebrate", levelUp || streakMark);
    el.classList.add("is-pop");
    if (global.clearTimeout) global.clearTimeout(el._hideTimer);
    el._hideTimer = global.setTimeout
      ? global.setTimeout(function () {
          el.classList.remove("is-pop");
        }, 2800)
      : null;
  }

  function unlockBadge(state, id, unlocked) {
    if (!BADGE_DEFS[id]) return;
    if (state.badges.indexOf(id) >= 0) return;
    state.badges = state.badges.concat([id]);
    unlocked.push({ id: id, name: BADGE_DEFS[id].name });
  }

  function grantGameComplete(gameId, opts) {
    opts = opts || {};
    var state = ensureDaily(loadState());
    var reviewMode = !!opts.reviewMode;
    var accuracy =
      typeof opts.accuracy === "number"
        ? Math.max(0, Math.min(1, opts.accuracy))
        : opts.maxScore
          ? Math.max(0, Math.min(1, (Number(opts.score) || 0) / opts.maxScore))
          : 1;

    var today = todayKey();
    var yday = yesterdayKey();
    var isFirstToday = state.lastPlayDate !== today;

    if (isFirstToday) {
      if (state.lastPlayDate === yday) state.streak = (state.streak || 0) + 1;
      else state.streak = 1;
      state.lastPlayDate = today;
    }

    var baseXP = reviewMode ? 8 : 20;
    var accuracyBonus = Math.floor(accuracy * (reviewMode ? 15 : 30));
    var perfectBonus = !reviewMode && accuracy >= 1 ? 15 : 0;
    var streakBonus = Math.min(state.streak || 0, 7) * 2;
    var dailyFirstBonus = !reviewMode && isFirstToday ? 10 : 0;
    var grantedXP =
      baseXP + accuracyBonus + perfectBonus + streakBonus + dailyFirstBonus;

    var prevLevel = getLevel(state.xp).level;
    state.xp = (state.xp || 0) + grantedXP;
    state.dailyXp = (state.dailyXp || 0) + grantedXP;
    state.playsTotal = (state.playsTotal || 0) + 1;

    if (opts.major) {
      var maj = String(opts.major);
      if (state.majorsVisited.indexOf(maj) < 0) {
        state.majorsVisited = state.majorsVisited.concat([maj]);
      }
    }

    var unlocked = [];
    if (state.playsTotal === 1 || (state.badges.indexOf("first_clear") < 0 && state.playsTotal >= 1)) {
      unlockBadge(state, "first_clear", unlocked);
    }
    if (state.streak >= 3) unlockBadge(state, "streak_3", unlocked);
    if (state.streak >= 7) unlockBadge(state, "streak_7", unlocked);
    if (!reviewMode && accuracy >= 1) unlockBadge(state, "perfect_run", unlocked);
    if (state.xp >= 500) unlockBadge(state, "xp_500", unlocked);
    if (state.majorsVisited.length >= 5) unlockBadge(state, "polymath", unlocked);

    if (gameId === "prevention-quiz") unlockBadge(state, "prevention_rookie", unlocked);
    if (gameId === "anatomy-quiz") unlockBadge(state, "anatomy_rookie", unlocked);
    if (gameId === "formula-flash") unlockBadge(state, "formula_rookie", unlocked);
    if (gameId === "meridian-match" || gameId === "acupoint-drag") {
      unlockBadge(state, "meridian_rookie", unlocked);
    }

    var goalJustDone = false;
    if (!state.dailyGoalDone && (state.dailyXp >= 50 || (!reviewMode && isFirstToday))) {
      /* daily goal: 50 XP OR at least one non-review clear today — mark when XP hits 50 or after first clear + some xp */
      if (state.dailyXp >= 50) {
        state.dailyGoalDone = true;
        goalJustDone = true;
      }
    }
    /* Also complete daily goal on first non-review clear if we treat "1 clear" as enough: */
    if (!state.dailyGoalDone && !reviewMode) {
      state.dailyGoalDone = true;
      goalJustDone = true;
    }

    state = saveState(state);
    var levelInfo = getLevel(state.xp);
    var msgs = [];
    msgs.push("+" + grantedXP + " XP");
    if (levelInfo.level > prevLevel) {
      msgs.push("升级 Lv." + levelInfo.level + "「" + levelInfo.title + "」");
    }
    if (goalJustDone) msgs.push("今日目标达成");
    var bi;
    for (bi = 0; bi < unlocked.length; bi++) {
      msgs.push("徽章「" + unlocked[bi].name + "」");
    }
    celebrate(msgs.join(" · "), {
      levelUp: levelInfo.level > prevLevel,
      streak: isFirstToday && (state.streak || 0) >= 2
    });

    return {
      grantedXP: grantedXP,
      state: state,
      level: levelInfo,
      unlockedBadges: unlocked,
      streak: state.streak,
      dailyGoalDone: state.dailyGoalDone
    };
  }

  function grantTeachView(moduleId) {
    if (!moduleId) return null;
    var state = ensureDaily(loadState());
    var id = String(moduleId);
    if (state.teachToday[id]) {
      return { grantedXP: 0, state: state, already: true };
    }
    state.teachToday[id] = true;
    state.xp = (state.xp || 0) + 5;
    state.dailyXp = (state.dailyXp || 0) + 5;
    state = saveState(state);
    celebrate("+5 XP · 读完要点");
    return { grantedXP: 5, state: state, already: false };
  }

  function markMajorVisit(majorId) {
    if (!majorId) return loadState();
    var state = loadState();
    var maj = String(majorId);
    if (state.majorsVisited.indexOf(maj) < 0) {
      state.majorsVisited = state.majorsVisited.concat([maj]);
      var unlocked = [];
      if (state.majorsVisited.length >= 5) unlockBadge(state, "polymath", unlocked);
      state = saveState(state);
      if (unlocked.length) celebrate("徽章「" + unlocked[0].name + "」");
    }
    return state;
  }

  function listBadges() {
    var state = loadState();
    var out = [];
    var id;
    for (id in BADGE_DEFS) {
      if (Object.prototype.hasOwnProperty.call(BADGE_DEFS, id)) {
        out.push({
          id: id,
          name: BADGE_DEFS[id].name,
          desc: BADGE_DEFS[id].desc,
          owned: state.badges.indexOf(id) >= 0
        });
      }
    }
    return out;
  }

  function renderHud(containerEl) {
    if (!containerEl) return;
    var state = ensureDaily(loadState());
    saveState(state);
    var lv = getLevel(state.xp);
    var dailyPct = Math.max(0, Math.min(1, (state.dailyXp || 0) / 50));
    containerEl.innerHTML = "";
    if ((" " + (containerEl.className || "") + " ").indexOf(" reward-hud ") < 0) {
      containerEl.className = ((containerEl.className || "") + " reward-hud").trim();
    }
    containerEl.innerHTML =
      '<div class="reward-hud-row">' +
      '<span class="reward-pill">Lv.<strong>' +
      lv.level +
      "</strong> " +
      lv.title +
      "</span>" +
      '<span class="reward-pill">XP <strong>' +
      state.xp +
      "</strong>" +
      (lv.nextXp != null ? " / " + lv.nextXp : "") +
      "</span>" +
      '<span class="reward-pill">连胜 <strong>' +
      (state.streak || 0) +
      "</strong> 天</span>" +
      '<span class="reward-pill">' +
      (state.dailyGoalDone ? "今日目标 ✓" : "今日 " + (state.dailyXp || 0) + "/50 XP") +
      "</span>" +
      "</div>" +
      '<div class="reward-daily-bar" aria-hidden="true"><span style="width:' +
      Math.round(dailyPct * 100) +
      '%"></span></div>';
  }

  global.XinghuoReward = {
    KEY: KEY,
    LEVELS: LEVELS,
    BADGE_DEFS: BADGE_DEFS,
    loadState: loadState,
    saveState: saveState,
    getLevel: getLevel,
    grantGameComplete: grantGameComplete,
    grantTeachView: grantTeachView,
    markMajorVisit: markMajorVisit,
    listBadges: listBadges,
    renderHud: renderHud,
    celebrate: celebrate,
    todayKey: todayKey
  };
})(typeof window !== "undefined" ? window : this);
