(function () {
  "use strict";

  var GAME_ID = "acupoint-drag";
  var G = window.XinghuoGames || null;

  var roundEl = document.getElementById("round");
  var roundTotalEl = document.getElementById("roundTotal");
  var correctEl = document.getElementById("correct");
  var slotTotalEl = document.getElementById("slotTotal");
  var scoreEl = document.getElementById("score");
  var roundTitle = document.getElementById("roundTitle");
  var slotsEl = document.getElementById("slots");
  var bankEl = document.getElementById("bank");
  var msgEl = document.getElementById("msg");
  var btnCheck = document.getElementById("btnCheck");
  var btnNext = document.getElementById("btnNext");
  var btnRestart = document.getElementById("btnRestart");
  var btnAgain = document.getElementById("btnAgain");
  var btnReview = document.getElementById("btnReview");
  var playEl = document.getElementById("play");
  var doneEl = document.getElementById("done");
  var doneMsg = document.getElementById("doneMsg");
  var bestMsg = document.getElementById("bestMsg");
  var reviewEl = document.getElementById("review");
  var helpText = document.getElementById("helpText");
  var tapHint = document.getElementById("tapHint");
  var progFill = document.getElementById("progFill");

  var rounds = [];
  var ri = 0;
  var score = 0;
  var placements = {};
  var selectedLabel = null;
  var checked = false;
  var cache = [];
  var sessionWrong = [];
  var reviewMode = false;
  var focusedSlotId = null;
  var reduced = G && G.prefersReducedMotion ? G.prefersReducedMotion() : false;

  try {
    if (window.matchMedia && window.matchMedia("(pointer: coarse)").matches) {
      if (tapHint) tapHint.hidden = false;
      if (helpText) helpText.textContent = "点选模式：先点标签，再点槽位（也可拖拽）。";
    }
  } catch (e) {
    /* ignore */
  }

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
    var totalRounds = rounds.length || 1;
    var ratio = ri / totalRounds;
    if (checked) ratio = (ri + 1) / totalRounds;
    if (G && G.setProgressBar) G.setProgressBar(progFill, ratio);
    else if (progFill) progFill.style.width = Math.round(ratio * 100) + "%";
  }

  function updateStats() {
    roundEl.textContent = String(ri + 1);
    roundTotalEl.textContent = String(rounds.length);
    var round = rounds[ri];
    var n = round ? round.slots.length : 0;
    slotTotalEl.textContent = String(n);
    var c = 0;
    if (round && checked) {
      round.slots.forEach(function (s) {
        if (placements[s.id] === s.answer) c += 1;
      });
    }
    correctEl.textContent = String(c);
    scoreEl.textContent = String(score);
    setProg();
  }

  function clearSelection() {
    selectedLabel = null;
    bankEl.querySelectorAll(".ad-chip").forEach(function (ch) {
      ch.classList.remove("is-selected");
    });
  }

  function place(slotId, label) {
    if (checked) return;
    Object.keys(placements).forEach(function (k) {
      if (placements[k] === label) delete placements[k];
    });
    placements[slotId] = label;
    clearSelection();
    renderRound(false);
    announce("已放入：" + label);
  }

  function clearSlot(slotId) {
    if (checked) return;
    delete placements[slotId];
    renderRound(false);
    announce("已清空槽位");
  }

  function renderRound(resetMsg) {
    var round = rounds[ri];
    if (!round) return;
    playEl.hidden = false;
    doneEl.hidden = true;
    roundTitle.textContent = round.title;
    if (resetMsg) {
      msgEl.hidden = true;
      msgEl.textContent = "";
      btnNext.hidden = true;
      checked = false;
    }

    var used = {};
    Object.keys(placements).forEach(function (k) {
      used[placements[k]] = true;
    });

    slotsEl.innerHTML = "";
    round.slots.forEach(function (slot) {
      var wrap = document.createElement("div");
      wrap.className = "ad-slot";
      wrap.dataset.slotId = slot.id;
      wrap.tabIndex = checked ? -1 : 0;
      wrap.setAttribute("role", "button");
      wrap.setAttribute(
        "aria-label",
        slot.label + (placements[slot.id] ? "，已填 " + placements[slot.id] : "，空槽位")
      );
      if (focusedSlotId === slot.id) wrap.classList.add("is-focus");
      if (checked) {
        var ok = placements[slot.id] === slot.answer;
        wrap.classList.add(ok ? "is-correct" : "is-wrong");
        if (!reduced) {
          wrap.classList.add(ok ? "is-pulse-ok" : "is-shake");
        }
      }
      var lab = document.createElement("div");
      lab.className = "ad-slot-label";
      lab.textContent = slot.label;
      var drop = document.createElement("div");
      drop.className = "ad-slot-drop";
      if (placements[slot.id]) {
        var placed = document.createElement("span");
        placed.className = "ad-placed";
        placed.textContent = placements[slot.id];
        if (!checked) {
          var clr = document.createElement("button");
          clr.type = "button";
          clr.className = "ad-clear";
          clr.setAttribute("aria-label", "清除");
          clr.textContent = "×";
          clr.addEventListener("click", function (e) {
            e.stopPropagation();
            clearSlot(slot.id);
          });
          placed.appendChild(clr);
        }
        drop.appendChild(placed);
      } else {
        drop.textContent = "放这里";
        drop.style.opacity = "0.45";
        drop.style.fontSize = "0.85rem";
      }
      wrap.appendChild(lab);
      wrap.appendChild(drop);

      wrap.addEventListener("dragover", function (e) {
        e.preventDefault();
        wrap.classList.add("is-over");
      });
      wrap.addEventListener("dragleave", function () {
        wrap.classList.remove("is-over");
      });
      wrap.addEventListener("drop", function (e) {
        e.preventDefault();
        wrap.classList.remove("is-over");
        var label = e.dataTransfer.getData("text/plain");
        if (label) place(slot.id, label);
      });
      wrap.addEventListener("click", function () {
        focusedSlotId = slot.id;
        if (selectedLabel) place(slot.id, selectedLabel);
        else renderRound(false);
      });
      wrap.addEventListener("focus", function () {
        focusedSlotId = slot.id;
      });

      slotsEl.appendChild(wrap);
    });

    bankEl.innerHTML = "";
    var labels = round._shuffledLabels || round.labels;
    labels.forEach(function (label) {
      var chip = document.createElement("button");
      chip.type = "button";
      chip.className = "ad-chip";
      chip.textContent = label;
      chip.draggable = !used[label] && !checked;
      chip.tabIndex = used[label] || checked ? -1 : 0;
      if (used[label]) chip.classList.add("is-placed");
      if (selectedLabel === label) chip.classList.add("is-selected");
      chip.addEventListener("dragstart", function (e) {
        if (used[label] || checked) {
          e.preventDefault();
          return;
        }
        e.dataTransfer.setData("text/plain", label);
      });
      chip.addEventListener("click", function () {
        if (used[label] || checked) return;
        if (selectedLabel === label) {
          clearSelection();
          announce("已取消选中");
        } else {
          selectedLabel = label;
          bankEl.querySelectorAll(".ad-chip").forEach(function (ch) {
            ch.classList.toggle("is-selected", ch.textContent === label);
          });
          announce("已选中：" + label);
        }
      });
      bankEl.appendChild(chip);
    });

    updateStats();
  }

  function finishAll() {
    playEl.hidden = true;
    doneEl.hidden = false;
    doneMsg.textContent =
      "总分 " + score + "。" + (reviewMode ? "错题再练完成。" : "建议对照图谱再核对一次取穴。");
    setProg();

    if (G) {
      var prev = G.loadProgress(GAME_ID);
      var patch = {
        lastScore: score,
        lastRound: rounds.length,
        plays: (prev.plays || 0) + 1
      };
      if (!reviewMode && (prev.bestScore == null || score > prev.bestScore)) {
        patch.bestScore = score;
      }
      var saved = G.saveProgress(GAME_ID, patch);
      if (bestMsg) {
        bestMsg.textContent =
          saved.bestScore != null ? "本机最高分：" + saved.bestScore : "";
      }
      var maxS = 0;
      var si;
      for (si = 0; si < rounds.length; si++) {
        maxS += (rounds[si].slots && rounds[si].slots.length) || 0;
      }
      if (!maxS) maxS = Math.max(score, 1);
      var rewardOpts = {
        score: score,
        maxScore: maxS,
        accuracy: maxS ? score / maxS : 0,
        reviewMode: reviewMode,
        major: "acupuncture"
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
      h.textContent = "错题槽位";
      reviewEl.appendChild(h);
      var wrap = document.createElement("div");
      reviewEl.appendChild(wrap);
      G.renderReviewList(wrap, sessionWrong, "本局没有错槽，很棒！");
    }
    if (btnReview) btnReview.hidden = sessionWrong.length === 0;
    announce("全部关卡完成，总分 " + score);
  }

  function loadRound() {
    if (ri >= rounds.length) {
      finishAll();
      return;
    }
    placements = {};
    selectedLabel = null;
    focusedSlotId = null;
    checked = false;
    rounds[ri]._shuffledLabels = shuffle(rounds[ri].labels.slice());
    renderRound(true);
    announce("第 " + (ri + 1) + " 关：" + rounds[ri].title);
  }

  function check() {
    var round = rounds[ri];
    if (!round || checked) return;
    var filled = 0;
    round.slots.forEach(function (s) {
      if (placements[s.id]) filled += 1;
    });
    if (filled < round.slots.length) {
      msgEl.hidden = false;
      msgEl.textContent = "请先填满所有槽位再核对。";
      announce("请先填满所有槽位");
      return;
    }
    checked = true;
    var c = 0;
    round.slots.forEach(function (s) {
      if (placements[s.id] === s.answer) {
        c += 1;
      } else {
        var item = {
          id: s.id,
          prompt: s.label,
          answer: s.answer,
          note: "你的答案：" + (placements[s.id] || "空")
        };
        var exists = false;
        for (var i = 0; i < sessionWrong.length; i++) {
          if (sessionWrong[i].id === item.id) {
            exists = true;
            break;
          }
        }
        if (!exists) sessionWrong.push(item);
        if (G && G.recordWrong) G.recordWrong(GAME_ID, item);
      }
    });
    score += c;
    msgEl.hidden = false;
    msgEl.textContent = "本轮正确 " + c + " / " + round.slots.length + "。";
    btnNext.hidden = false;
    if (ri >= rounds.length - 1) {
      btnNext.textContent = "查看总结";
    } else {
      btnNext.textContent = "下一关";
    }
    renderRound(false);
    updateStats();
    announce("本轮正确 " + c + " 题");
  }

  function next() {
    if (!checked) return;
    ri += 1;
    loadRound();
  }

  function resetAll(list, isReview) {
    rounds = list;
    ri = 0;
    score = 0;
    reviewMode = !!isReview;
    if (!isReview) sessionWrong = [];
    loadRound();
  }

  function buildReviewRound() {
    if (!sessionWrong.length) return null;
    var slots = [];
    var labels = [];
    var seen = {};
    sessionWrong.forEach(function (w, i) {
      slots.push({
        id: w.id || "rw" + i,
        label: w.prompt,
        answer: w.answer
      });
      if (w.answer && !seen[w.answer]) {
        labels.push(w.answer);
        seen[w.answer] = true;
      }
    });
    /* distractors from cache */
    cache.forEach(function (r) {
      (r.labels || []).forEach(function (lb) {
        if (!seen[lb] && labels.length < slots.length + 2) {
          labels.push(lb);
          seen[lb] = true;
        }
      });
    });
    return {
      id: "review",
      title: "错题再练",
      slots: slots,
      labels: labels
    };
  }

  function startReview() {
    var round = buildReviewRound();
    if (!round || !round.slots.length) return;
    sessionWrong = [];
    resetAll([round], true);
  }

  fetch("data/slots.json")
    .then(function (r) {
      return r.json();
    })
    .then(function (data) {
      cache = data.rounds || [];
      resetAll(cache, false);
    })
    .catch(function () {
      roundTitle.textContent = "无法加载 data/slots.json，请用静态服务器打开。";
    });

  btnCheck.addEventListener("click", check);
  btnNext.addEventListener("click", next);
  btnRestart.addEventListener("click", function () {
    if (cache.length) resetAll(cache, false);
  });
  btnAgain.addEventListener("click", function () {
    if (cache.length) resetAll(cache, false);
  });
  if (btnReview) btnReview.addEventListener("click", startReview);

  document.addEventListener("keydown", function (e) {
    if (doneEl && !doneEl.hidden) return;
    if (checked) return;
    var tag = (e.target && e.target.tagName) || "";
    if (tag === "INPUT" || tag === "TEXTAREA") return;

    if (e.key === "Escape") {
      clearSelection();
      announce("已取消选中");
      return;
    }

    if ((e.key === "Delete" || e.key === "Backspace") && focusedSlotId) {
      var active = document.activeElement;
      if (active && active.classList && active.classList.contains("ad-slot")) {
        e.preventDefault();
        clearSlot(focusedSlotId);
      }
      return;
    }

    if (e.key === "Enter" || e.key === " ") {
      var el = document.activeElement;
      if (!el) return;
      if (el.classList && el.classList.contains("ad-chip") && selectedLabel && focusedSlotId) {
        e.preventDefault();
        place(focusedSlotId, selectedLabel);
        return;
      }
      if (el.classList && el.classList.contains("ad-slot") && selectedLabel) {
        e.preventDefault();
        place(el.dataset.slotId, selectedLabel);
        return;
      }
      if (el.classList && el.classList.contains("ad-chip") && !el.classList.contains("is-placed")) {
        /* chip click already selects; Enter toggles via click simulation */
        e.preventDefault();
        el.click();
      }
    }
  });
})();
