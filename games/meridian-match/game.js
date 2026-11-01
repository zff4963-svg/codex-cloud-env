(function () {
  "use strict";

  var GAME_ID = "meridian-match";
  var G = window.XinghuoGames || null;

  var boardEl = document.getElementById("board");
  var matchedEl = document.getElementById("matched");
  var totalEl = document.getElementById("total");
  var movesEl = document.getElementById("moves");
  var timerEl = document.getElementById("timer");
  var doneEl = document.getElementById("done");
  var doneMsg = document.getElementById("doneMsg");
  var bestMsg = document.getElementById("bestMsg");
  var reviewEl = document.getElementById("review");
  var btnRestart = document.getElementById("btnRestart");
  var btnAgain = document.getElementById("btnAgain");
  var btnReview = document.getElementById("btnReview");
  var progFill = document.getElementById("progFill");

  var deck = [];
  var flipped = [];
  var lock = false;
  var matched = 0;
  var moves = 0;
  var pairCount = 0;
  var timer = 0;
  var timerId = null;
  var started = false;
  var sessionWrong = [];
  var pairsCache = [];
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
    if (G && G.setProgressBar) {
      G.setProgressBar(progFill, pairCount ? matched / pairCount : 0);
    } else if (progFill) {
      progFill.style.width = (pairCount ? Math.round((matched / pairCount) * 100) : 0) + "%";
    }
  }

  function stopTimer() {
    if (timerId) {
      clearInterval(timerId);
      timerId = null;
    }
  }

  function startTimer() {
    if (started) return;
    started = true;
    timerId = setInterval(function () {
      timer += 1;
      timerEl.textContent = String(timer);
    }, 1000);
  }

  function findPairMeta(pairId) {
    for (var i = 0; i < pairsCache.length; i++) {
      if (pairsCache[i].id === pairId) return pairsCache[i];
    }
    return null;
  }

  function trackWrong(pairId) {
    var meta = findPairMeta(pairId);
    var item = {
      id: pairId,
      prompt: meta ? meta.a : pairId,
      answer: meta ? meta.b : "",
      note: "配对失误"
    };
    var exists = false;
    for (var i = 0; i < sessionWrong.length; i++) {
      if (sessionWrong[i].id === pairId) {
        exists = true;
        break;
      }
    }
    if (!exists) sessionWrong.push(item);
    if (G && G.recordWrong) G.recordWrong(GAME_ID, item);
  }

  function pulseOk(el) {
    if (!el || reduced) {
      if (el) el.classList.add("is-glow-ok");
      return;
    }
    el.classList.remove("is-pulse-ok");
    void el.offsetWidth;
    el.classList.add("is-pulse-ok");
  }

  function shakeWrong(el) {
    if (!el || reduced) return;
    el.classList.remove("is-shake");
    void el.offsetWidth;
    el.classList.add("is-shake");
    setTimeout(function () {
      el.classList.remove("is-shake");
    }, 500);
  }

  function render() {
    boardEl.innerHTML = "";
    doneEl.hidden = true;
    boardEl.hidden = false;
    deck.forEach(function (card, index) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "mm-card";
      btn.dataset.index = String(index);
      btn.setAttribute("aria-label", "未翻开的卡片");
      btn.innerHTML =
        '<span class="mm-back" aria-hidden="true">✦</span>' +
        '<span class="mm-face"><span class="mm-kind">' +
        (card.side === "a" ? "穴名" : "定位") +
        "</span>" +
        card.text +
        "</span>";
      btn.addEventListener("click", function () {
        onFlip(index);
      });
      boardEl.appendChild(btn);
    });
  }

  function updateStats() {
    matchedEl.textContent = String(matched);
    totalEl.textContent = String(pairCount);
    movesEl.textContent = String(moves);
    timerEl.textContent = String(timer);
    setProg();
  }

  function finish() {
    stopTimer();
    boardEl.hidden = true;
    doneEl.hidden = false;

    var msg =
      "共用 " + moves + " 步、" + timer + " 秒完成 " + pairCount + " 对。";
    if (reviewMode) msg = "错题回顾完成：" + msg;
    doneMsg.textContent = msg;

    var bestLine = "";
    if (G) {
      var prev = G.loadProgress(GAME_ID);
      var patch = {
        lastScore: moves,
        plays: (prev.plays || 0) + 1
      };
      var isBest =
        prev.bestMoves == null ||
        moves < prev.bestMoves ||
        (moves === prev.bestMoves && (prev.bestTime == null || timer < prev.bestTime));
      if (!reviewMode && isBest) {
        patch.bestMoves = moves;
        patch.bestTime = timer;
        patch.bestScore = moves;
      }
      var saved = G.saveProgress(GAME_ID, patch);
      if (saved.bestMoves != null) {
        bestLine =
          "本机最佳：" +
          saved.bestMoves +
          " 步" +
          (saved.bestTime != null ? " / " + saved.bestTime + "s" : "");
      }
      if (G.grantCompletionReward) {
        var ideal = pairCount;
        var acc = ideal ? Math.max(0, Math.min(1, (ideal * 2) / Math.max(moves, ideal * 2))) : 1;
        G.grantCompletionReward(GAME_ID, {
          score: ideal,
          maxScore: ideal,
          accuracy: reviewMode ? acc : (sessionWrong.length === 0 ? 1 : acc),
          reviewMode: reviewMode,
          major: "acupuncture"
        });
      }
    }
    if (bestMsg) bestMsg.textContent = bestLine;

    if (reviewEl && G && G.renderReviewList) {
      reviewEl.hidden = false;
      var title = document.createElement("h3");
      title.textContent = "本局失误配对";
      reviewEl.innerHTML = "";
      reviewEl.appendChild(title);
      var listWrap = document.createElement("div");
      reviewEl.appendChild(listWrap);
      G.renderReviewList(listWrap, sessionWrong, "本局没有失误，很棒！");
    }

    if (btnReview) {
      btnReview.hidden = sessionWrong.length === 0;
    }
    announce("全部配对完成");
  }

  function onFlip(index) {
    if (lock) return;
    var card = deck[index];
    if (!card || card.matched) return;
    var btn = boardEl.children[index];
    if (!btn || btn.classList.contains("is-flipped")) return;

    startTimer();
    btn.classList.add("is-flipped");
    btn.setAttribute("aria-label", card.text);
    flipped.push(index);

    if (flipped.length < 2) {
      announce("已翻开：" + card.text);
      return;
    }

    moves += 1;
    updateStats();
    var i0 = flipped[0];
    var i1 = flipped[1];
    var c0 = deck[i0];
    var c1 = deck[i1];
    var b0 = boardEl.children[i0];
    var b1 = boardEl.children[i1];

    if (c0.pairId === c1.pairId && c0.side !== c1.side) {
      c0.matched = true;
      c1.matched = true;
      b0.classList.add("is-matched");
      b1.classList.add("is-matched");
      pulseOk(b0);
      pulseOk(b1);
      b0.disabled = true;
      b1.disabled = true;
      matched += 1;
      flipped = [];
      updateStats();
      announce("配对成功：" + c0.text + " 与 " + c1.text);
      if (matched >= pairCount) finish();
    } else {
      lock = true;
      shakeWrong(b0);
      shakeWrong(b1);
      trackWrong(c0.pairId);
      if (c1.pairId !== c0.pairId) trackWrong(c1.pairId);
      announce("配对失败");
      setTimeout(function () {
        b0.classList.remove("is-flipped");
        b1.classList.remove("is-flipped");
        b0.setAttribute("aria-label", "未翻开的卡片");
        b1.setAttribute("aria-label", "未翻开的卡片");
        flipped = [];
        lock = false;
      }, reduced ? 200 : 700);
    }
  }

  function buildDeck(pairs) {
    var cards = [];
    pairs.forEach(function (p) {
      cards.push({ pairId: p.id, side: "a", text: p.a, matched: false });
      cards.push({ pairId: p.id, side: "b", text: p.b, matched: false });
    });
    return shuffle(cards);
  }

  function reset(pairs, isReview) {
    stopTimer();
    started = false;
    timer = 0;
    moves = 0;
    matched = 0;
    flipped = [];
    lock = false;
    reviewMode = !!isReview;
    if (!isReview) sessionWrong = [];
    pairCount = pairs.length;
    deck = buildDeck(pairs);
    updateStats();
    render();
    announce(isReview ? "错题回顾开始" : "新一局开始");
  }

  function restart() {
    if (pairsCache.length) reset(pairsCache, false);
  }

  function startReview() {
    if (!sessionWrong.length) return;
    var ids = {};
    sessionWrong.forEach(function (w) {
      ids[w.id] = true;
    });
    var subset = pairsCache.filter(function (p) {
      return ids[p.id];
    });
    if (!subset.length) return;
    sessionWrong = [];
    reset(subset, true);
  }

  fetch("data/pairs.json")
    .then(function (r) {
      return r.json();
    })
    .then(function (data) {
      pairsCache = data.pairs || [];
      reset(pairsCache, false);
    })
    .catch(function () {
      boardEl.innerHTML = "<p>无法加载 data/pairs.json，请用本地静态服务器打开。</p>";
    });

  btnRestart.addEventListener("click", restart);
  btnAgain.addEventListener("click", restart);
  if (btnReview) btnReview.addEventListener("click", startReview);

  document.addEventListener("keydown", function (e) {
    if (doneEl && !doneEl.hidden) return;
    var tag = (e.target && e.target.tagName) || "";
    if (tag === "INPUT" || tag === "TEXTAREA") return;

    if (e.key === "Escape") {
      if (flipped.length === 1 && !lock) {
        var fi = flipped[0];
        var fb = boardEl.children[fi];
        if (fb) {
          fb.classList.remove("is-flipped");
          fb.setAttribute("aria-label", "未翻开的卡片");
        }
        flipped = [];
        announce("已取消选择");
      }
      return;
    }

    if (e.key === "Enter" || e.key === " ") {
      var active = document.activeElement;
      if (active && active.classList && active.classList.contains("mm-card")) {
        e.preventDefault();
        var idx = parseInt(active.dataset.index, 10);
        if (!isNaN(idx)) onFlip(idx);
      }
    }
  });
})();
