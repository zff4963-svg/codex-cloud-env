/**
 * Xinghuo Games shared helpers (vanilla IIFE, no modules).
 * Exposes window.XinghuoGames
 */
(function (global) {
  "use strict";

  var PREFIX = "xinghuo-game-";

  function storageKey(gameId) {
    return PREFIX + String(gameId || "unknown");
  }

  function emptyProgress() {
    return {
      bestScore: null,
      lastScore: null,
      plays: 0,
      wrong: [],
      updatedAt: null
    };
  }

  function loadProgress(gameId) {
    var key = storageKey(gameId);
    try {
      var raw = global.localStorage && global.localStorage.getItem(key);
      if (!raw) return emptyProgress();
      var data = JSON.parse(raw);
      if (!data || typeof data !== "object") return emptyProgress();
      return {
        bestScore: data.bestScore != null ? data.bestScore : null,
        lastScore: data.lastScore != null ? data.lastScore : null,
        plays: typeof data.plays === "number" ? data.plays : 0,
        wrong: Array.isArray(data.wrong) ? data.wrong : [],
        updatedAt: data.updatedAt || null,
        bestMoves: data.bestMoves != null ? data.bestMoves : null,
        bestTime: data.bestTime != null ? data.bestTime : null,
        lastRound: data.lastRound != null ? data.lastRound : null,
        bestAccuracy: data.bestAccuracy != null ? data.bestAccuracy : null,
        lastKnow: data.lastKnow != null ? data.lastKnow : null,
        lastFuzzy: data.lastFuzzy != null ? data.lastFuzzy : null,
        lastForgot: data.lastForgot != null ? data.lastForgot : null
      };
    } catch (e) {
      return emptyProgress();
    }
  }

  function saveProgress(gameId, patch) {
    var cur = loadProgress(gameId);
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
        global.localStorage.setItem(storageKey(gameId), JSON.stringify(next));
      }
    } catch (e) {
      /* ignore quota / private mode */
    }
    return next;
  }

  function recordWrong(gameId, item) {
    if (!item) return loadProgress(gameId);
    var cur = loadProgress(gameId);
    var wrong = cur.wrong.slice();
    var id = item.id != null ? String(item.id) : null;
    var i;
    var found = -1;
    if (id) {
      for (i = 0; i < wrong.length; i++) {
        if (wrong[i] && String(wrong[i].id) === id) {
          found = i;
          break;
        }
      }
    }
    var entry = {
      id: id || item.prompt || String(Date.now()),
      prompt: item.prompt || "",
      answer: item.answer || "",
      note: item.note || ""
    };
    if (found >= 0) {
      wrong[found] = entry;
    } else {
      wrong.push(entry);
    }
    return saveProgress(gameId, { wrong: wrong });
  }

  function clearWrong(gameId) {
    return saveProgress(gameId, { wrong: [] });
  }

  function getWrong(gameId) {
    return loadProgress(gameId).wrong || [];
  }

  function ensureAnnounceEl() {
    var el = global.document && global.document.getElementById("gameAnnounce");
    if (el) return el;
    if (!global.document || !global.document.body) return null;
    el = global.document.createElement("div");
    el.id = "gameAnnounce";
    el.className = "visually-hidden";
    el.setAttribute("aria-live", "polite");
    el.setAttribute("aria-atomic", "true");
    global.document.body.appendChild(el);
    return el;
  }

  function announce(elOrId, text) {
    var el = null;
    if (typeof elOrId === "string") {
      el = global.document && global.document.getElementById(elOrId);
    } else if (elOrId && elOrId.nodeType === 1) {
      el = elOrId;
    }
    if (!el) el = ensureAnnounceEl();
    if (!el) return;
    el.textContent = "";
    /* force re-announce identical text */
    setTimeout(function () {
      el.textContent = text || "";
    }, 20);
  }

  function prefersReducedMotion() {
    try {
      return !!(
        global.matchMedia &&
        global.matchMedia("(prefers-reduced-motion: reduce)").matches
      );
    } catch (e) {
      return false;
    }
  }

  function setProgressBar(fillElOrId, ratio) {
    var el =
      typeof fillElOrId === "string"
        ? global.document && global.document.getElementById(fillElOrId)
        : fillElOrId;
    if (!el) return;
    var r = Math.max(0, Math.min(1, Number(ratio) || 0));
    el.style.width = Math.round(r * 100) + "%";
  }

  function renderReviewList(container, items, emptyText) {
    if (!container) return;
    container.innerHTML = "";
    if (!items || !items.length) {
      var p = global.document.createElement("p");
      p.className = "game-review-empty";
      p.textContent = emptyText || "本局没有错题。";
      container.appendChild(p);
      return;
    }
    var ul = global.document.createElement("ul");
    ul.className = "game-review-list";
    items.forEach(function (it) {
      var li = global.document.createElement("li");
      var title = global.document.createElement("strong");
      title.textContent = it.prompt || it.id || "条目";
      li.appendChild(title);
      if (it.answer) {
        var ans = global.document.createElement("span");
        ans.className = "game-review-answer";
        ans.textContent = " → " + it.answer;
        li.appendChild(ans);
      }
      if (it.note) {
        var note = global.document.createElement("div");
        note.className = "game-review-note";
        note.textContent = it.note;
        li.appendChild(note);
      }
      ul.appendChild(li);
    });
    container.appendChild(ul);
  }

  /**
   * Thin hook into XinghuoReward (load reward-kit.js before or after this file).
   * Call from each game finish() after saveProgress.
   * opts: { score, maxScore, accuracy, reviewMode, major }
   */
  function grantCompletionReward(gameId, opts) {
    if (global.XinghuoReward && typeof global.XinghuoReward.grantGameComplete === "function") {
      try {
        return global.XinghuoReward.grantGameComplete(gameId, opts || {});
      } catch (e) {
        return null;
      }
    }
    return null;
  }

  /**
   * Paint the done-panel XP line from a grantGameComplete() result.
   * Toast stays in the reward kit; this line is the on-page receipt.
   */
  function paintXpLine(el, reward) {
    if (!el) return;
    if (!reward || typeof reward.grantedXP !== "number") {
      el.textContent = "";
      return;
    }
    var title = reward.level && reward.level.title ? reward.level.title : "";
    var text = "本局 +" + reward.grantedXP + " XP";
    if (title) text += " · " + title;
    text += " · 连胜 " + (reward.streak || 0) + " 天";
    if (reward.dailyGoalDone) text += " · 今日目标已达成";
    el.textContent = text;
  }

  global.XinghuoGames = {
    storageKey: storageKey,
    loadProgress: loadProgress,
    saveProgress: saveProgress,
    recordWrong: recordWrong,
    clearWrong: clearWrong,
    getWrong: getWrong,
    announce: announce,
    prefersReducedMotion: prefersReducedMotion,
    setProgressBar: setProgressBar,
    renderReviewList: renderReviewList,
    grantCompletionReward: grantCompletionReward,
    paintXpLine: paintXpLine
  };
})(typeof window !== "undefined" ? window : this);
