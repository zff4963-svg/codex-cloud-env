(function () {
  "use strict";

  var GAME_ID = "formula-flash";
  var G = window.XinghuoGames || null;

  var progressEl = document.getElementById("progress");
  var totalEl = document.getElementById("total");
  var knowEl = document.getElementById("know");
  var fuzzyEl = document.getElementById("fuzzy");
  var forgotEl = document.getElementById("forgot");
  var hintEl = document.getElementById("hint");
  var frontEl = document.getElementById("front");
  var backEl = document.getElementById("back");
  var actionsFront = document.getElementById("actionsFront");
  var actionsRate = document.getElementById("actionsRate");
  var flashEl = document.getElementById("flash");
  var doneEl = document.getElementById("done");
  var doneMsg = document.getElementById("doneMsg");
  var bestMsg = document.getElementById("bestMsg");
  var reviewEl = document.getElementById("review");
  var btnReveal = document.getElementById("btnReveal");
  var btnRestart = document.getElementById("btnRestart");
  var btnAgain = document.getElementById("btnAgain");
  var btnReview = document.getElementById("btnReview");
  var progFill = document.getElementById("progFill");

  var cards = [];
  var index = 0;
  var scores = { know: 0, fuzzy: 0, forgot: 0 };
  var revealed = false;
  var cache = [];
  var sessionWeak = [];
  var reviewMode = false;
  var reduced = G && G.prefersReducedMotion ? G.prefersReducedMotion() : false;

  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i];
      a[i] = a[j];
      a[j] = t;
    }
    return a;
  }

  function announce(text) {
    if (G && G.announce) G.announce("gameAnnounce", text);
  }

  function setProg() {
    var done = Math.min(index + (revealed ? 1 : 0), cards.length);
    var ratio = cards.length ? done / cards.length : 0;
    if (G && G.setProgressBar) G.setProgressBar(progFill, ratio);
    else if (progFill) progFill.style.width = Math.round(ratio * 100) + "%";
  }

  function updateStats() {
    progressEl.textContent = String(Math.min(index + (revealed ? 1 : 0), cards.length));
    totalEl.textContent = String(cards.length);
    knowEl.textContent = String(scores.know);
    fuzzyEl.textContent = String(scores.fuzzy);
    forgotEl.textContent = String(scores.forgot);
    setProg();
  }

  function finish() {
    flashEl.hidden = true;
    doneEl.hidden = false;
    doneMsg.textContent =
      "记得 " +
      scores.know +
      " · 模糊 " +
      scores.fuzzy +
      " · 忘了 " +
      scores.forgot +
      "。" +
      (reviewMode ? "薄弱复习完成。" : "模糊与忘了的条目建议对照教材再记一轮。");
    progressEl.textContent = String(cards.length);
    setProg();

    if (G) {
      var prev = G.loadProgress(GAME_ID);
      var patch = {
        lastScore: scores.know,
        lastKnow: scores.know,
        lastFuzzy: scores.fuzzy,
        lastForgot: scores.forgot,
        plays: (prev.plays || 0) + 1
      };
      if (!reviewMode && (prev.bestScore == null || scores.know > prev.bestScore)) {
        patch.bestScore = scores.know;
      }
      var saved = G.saveProgress(GAME_ID, patch);
      if (bestMsg) {
        bestMsg.textContent =
          saved.bestScore != null
            ? "本机最佳「记得」：" + saved.bestScore
            : "";
      }
      var total = cards.length || 1;
      var rewardOpts = {
        score: scores.know,
        maxScore: total,
        accuracy: scores.know / total,
        reviewMode: reviewMode,
        major: "tcm"
      };
      var reward = null;
      try {
        if (window.XinghuoReward && typeof window.XinghuoReward.grantGameComplete === "function") {
          reward = window.XinghuoReward.grantGameComplete(GAME_ID, rewardOpts);
        } else if (G.grantCompletionReward) {
          reward = G.grantCompletionReward(GAME_ID, rewardOpts);
        }
      } catch (rewardErr) {
        reward = null;
      }
      if (G.paintXpLine) G.paintXpLine(document.getElementById("xpMsg"), reward);
    }

    if (reviewEl && G && G.renderReviewList) {
      reviewEl.hidden = false;
      reviewEl.innerHTML = "";
      var h = document.createElement("h3");
      h.textContent = "薄弱条目";
      reviewEl.appendChild(h);
      var wrap = document.createElement("div");
      reviewEl.appendChild(wrap);
      G.renderReviewList(wrap, sessionWeak, "本轮没有薄弱卡，继续保持！");
    }
    if (btnReview) btnReview.hidden = sessionWeak.length === 0;
    announce("本轮闪卡完成");
  }

  function showCard() {
    if (index >= cards.length) {
      finish();
      return;
    }
    flashEl.hidden = false;
    doneEl.hidden = true;
    var c = cards[index];
    revealed = false;
    hintEl.textContent = c.hint || "闪卡";
    frontEl.textContent = c.front;
    backEl.textContent = c.back;
    backEl.hidden = true;
    backEl.classList.remove("is-reveal");
    flashEl.classList.remove("is-flipping");
    actionsFront.hidden = false;
    actionsRate.hidden = true;
    updateStats();
    announce("卡片：" + c.front);
  }

  function reveal() {
    if (revealed || index >= cards.length) return;
    revealed = true;
    if (!reduced) {
      flashEl.classList.remove("is-flipping");
      void flashEl.offsetWidth;
      flashEl.classList.add("is-flipping");
    }
    backEl.hidden = false;
    backEl.classList.add("is-reveal");
    actionsFront.hidden = true;
    actionsRate.hidden = false;
    updateStats();
    announce("已揭晓答案");
  }

  function rate(kind) {
    if (!revealed) return;
    scores[kind] += 1;
    var c = cards[index];
    if (kind === "fuzzy" || kind === "forgot") {
      var item = {
        id: c.id || c.front,
        prompt: c.front,
        answer: c.back,
        note: kind === "fuzzy" ? "自评：模糊" : "自评：忘了"
      };
      var exists = false;
      for (var i = 0; i < sessionWeak.length; i++) {
        if (sessionWeak[i].id === item.id) {
          exists = true;
          break;
        }
      }
      if (!exists) sessionWeak.push(item);
      if (G && G.recordWrong) G.recordWrong(GAME_ID, item);
    }
    index += 1;
    revealed = false;
    updateStats();
    showCard();
  }

  function reset(list, isReview) {
    cards = shuffle(list);
    index = 0;
    scores = { know: 0, fuzzy: 0, forgot: 0 };
    revealed = false;
    reviewMode = !!isReview;
    if (!isReview) sessionWeak = [];
    showCard();
  }

  function startWeak() {
    if (!sessionWeak.length) return;
    var ids = {};
    sessionWeak.forEach(function (w) {
      ids[w.id] = true;
    });
    var subset = cache.filter(function (c) {
      return ids[c.id] || ids[c.front];
    });
    if (!subset.length) return;
    sessionWeak = [];
    reset(subset, true);
  }

  fetch("data/cards.json")
    .then(function (r) {
      return r.json();
    })
    .then(function (data) {
      cache = data.cards || [];
      reset(cache, false);
    })
    .catch(function () {
      frontEl.textContent = "无法加载 data/cards.json";
      hintEl.textContent = "请用静态服务器打开";
      actionsFront.hidden = true;
    });

  btnReveal.addEventListener("click", reveal);
  actionsRate.addEventListener("click", function (e) {
    var t = e.target.closest("[data-rate]");
    if (!t) return;
    rate(t.getAttribute("data-rate"));
  });
  btnRestart.addEventListener("click", function () {
    if (cache.length) reset(cache, false);
  });
  btnAgain.addEventListener("click", function () {
    if (cache.length) reset(cache, false);
  });
  if (btnReview) btnReview.addEventListener("click", startWeak);

  document.addEventListener("keydown", function (e) {
    if (doneEl && !doneEl.hidden) return;
    var tag = (e.target && e.target.tagName) || "";
    if (tag === "INPUT" || tag === "TEXTAREA") return;

    if (!revealed && (e.key === " " || e.key === "Enter")) {
      e.preventDefault();
      reveal();
      return;
    }
    if (revealed) {
      if (e.key === "1") {
        e.preventDefault();
        rate("know");
      } else if (e.key === "2") {
        e.preventDefault();
        rate("fuzzy");
      } else if (e.key === "3") {
        e.preventDefault();
        rate("forgot");
      }
    }
  });
})();
