(function () {
  "use strict";

  var GAME_ID = "anatomy-quiz";
  var G = window.XinghuoGames || null;

  var qnumEl = document.getElementById("qnum");
  var totalEl = document.getElementById("total");
  var scoreEl = document.getElementById("score");
  var accEl = document.getElementById("acc");
  var promptEl = document.getElementById("prompt");
  var choicesEl = document.getElementById("choices");
  var feedbackEl = document.getElementById("feedback");
  var btnNext = document.getElementById("btnNext");
  var quizEl = document.getElementById("quiz");
  var doneEl = document.getElementById("done");
  var doneMsg = document.getElementById("doneMsg");
  var bestMsg = document.getElementById("bestMsg");
  var reviewEl = document.getElementById("review");
  var btnRestart = document.getElementById("btnRestart");
  var btnAgain = document.getElementById("btnAgain");
  var btnReview = document.getElementById("btnReview");
  var progFill = document.getElementById("progFill");

  var questions = [];
  var index = 0;
  var score = 0;
  var answered = 0;
  var locked = false;
  var cache = [];
  var sessionWrong = [];
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
    var ratio = questions.length ? Math.min(index, questions.length) / questions.length : 0;
    if (locked && index < questions.length) {
      ratio = (index + 1) / questions.length;
    }
    if (G && G.setProgressBar) G.setProgressBar(progFill, ratio);
    else if (progFill) progFill.style.width = Math.round(ratio * 100) + "%";
  }

  function updateStats() {
    qnumEl.textContent = String(Math.min(index + 1, questions.length));
    totalEl.textContent = String(questions.length);
    scoreEl.textContent = String(score);
    if (answered === 0) {
      accEl.textContent = "—";
    } else {
      accEl.textContent = Math.round((score / answered) * 100) + "%";
    }
    setProg();
  }

  function finish() {
    quizEl.hidden = true;
    doneEl.hidden = false;
    var acc = questions.length ? Math.round((score / questions.length) * 100) : 0;
    doneMsg.textContent =
      "得分 " +
      score +
      " / " +
      questions.length +
      "（正确率 " +
      acc +
      "%）。" +
      (reviewMode ? "错题再练完成。" : "可再闯一次巩固。");
    qnumEl.textContent = String(questions.length);
    setProg();

    if (G) {
      var prev = G.loadProgress(GAME_ID);
      var patch = {
        lastScore: score,
        plays: (prev.plays || 0) + 1,
        bestAccuracy: prev.bestAccuracy
      };
      if (!reviewMode && (prev.bestScore == null || score > prev.bestScore)) {
        patch.bestScore = score;
        patch.bestAccuracy = acc;
      } else if (!reviewMode && prev.bestScore === score && (prev.bestAccuracy == null || acc > prev.bestAccuracy)) {
        patch.bestAccuracy = acc;
      }
      var saved = G.saveProgress(GAME_ID, patch);
      if (bestMsg) {
        bestMsg.textContent =
          saved.bestScore != null
            ? "本机最高分：" +
              saved.bestScore +
              (saved.bestAccuracy != null ? " · " + saved.bestAccuracy + "%" : "")
            : "";
      }
      var rewardOpts = {
        score: score,
        maxScore: questions.length,
        accuracy: questions.length ? score / questions.length : 0,
        reviewMode: reviewMode,
        major: "clinical"
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
      h.textContent = "错题列表";
      reviewEl.appendChild(h);
      var wrap = document.createElement("div");
      reviewEl.appendChild(wrap);
      G.renderReviewList(wrap, sessionWrong, "本局全对，太棒了！");
    }
    if (btnReview) btnReview.hidden = sessionWrong.length === 0;
    announce("闯关结束，得分 " + score);
  }

  function showQuestion() {
    if (index >= questions.length) {
      finish();
      return;
    }
    quizEl.hidden = false;
    doneEl.hidden = true;
    locked = false;
    var q = questions[index];
    promptEl.textContent = q.prompt;
    feedbackEl.hidden = true;
    feedbackEl.textContent = "";
    feedbackEl.classList.remove("is-ok", "is-bad");
    btnNext.hidden = true;
    choicesEl.innerHTML = "";
    q.choices.forEach(function (text, i) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "aq-choice";
      btn.textContent = String.fromCharCode(65 + i) + ". " + text;
      btn.setAttribute("data-choice", String(i));
      btn.addEventListener("click", function () {
        onChoose(i);
      });
      choicesEl.appendChild(btn);
    });
    updateStats();
    announce("第 " + (index + 1) + " 题");
  }

  function onChoose(choiceIndex) {
    if (locked) return;
    locked = true;
    answered += 1;
    var q = questions[index];
    var buttons = choicesEl.querySelectorAll(".aq-choice");
    buttons.forEach(function (b, i) {
      b.disabled = true;
      if (i === q.answer) {
        b.classList.add("is-correct");
        if (!reduced) b.classList.add("is-pulse-ok");
      }
      if (i === choiceIndex && i !== q.answer) {
        b.classList.add("is-wrong");
        if (!reduced) b.classList.add("is-shake");
      }
    });
    if (choiceIndex === q.answer) {
      score += 1;
      feedbackEl.textContent = "正确。" + (q.explain || "");
      feedbackEl.classList.add("is-ok");
      announce("回答正确");
    } else {
      feedbackEl.textContent =
        "不正确。参考：" + q.choices[q.answer] + "。" + (q.explain || "");
      feedbackEl.classList.add("is-bad");
      var item = {
        id: q.id || "q" + index,
        prompt: q.prompt,
        answer: q.choices[q.answer],
        note: q.explain || ""
      };
      var exists = false;
      for (var wi = 0; wi < sessionWrong.length; wi++) {
        if (sessionWrong[wi].id === item.id) {
          exists = true;
          break;
        }
      }
      if (!exists) sessionWrong.push(item);
      if (G && G.recordWrong) G.recordWrong(GAME_ID, item);
      announce("回答错误");
    }
    feedbackEl.hidden = false;
    btnNext.hidden = false;
    btnNext.focus();
    updateStats();
  }

  function next() {
    if (!locked) return;
    index += 1;
    showQuestion();
  }

  function reset(list, isReview) {
    questions = shuffle(list);
    index = 0;
    score = 0;
    answered = 0;
    locked = false;
    reviewMode = !!isReview;
    if (!isReview) sessionWrong = [];
    showQuestion();
  }

  function startReview() {
    if (!sessionWrong.length) return;
    var ids = {};
    sessionWrong.forEach(function (w) {
      ids[w.id] = true;
    });
    var subset = cache.filter(function (q) {
      return ids[q.id];
    });
    if (!subset.length) return;
    sessionWrong = [];
    reset(subset, true);
  }

  fetch("data/questions.json")
    .then(function (r) {
      return r.json();
    })
    .then(function (data) {
      cache = data.questions || [];
      reset(cache, false);
    })
    .catch(function () {
      promptEl.textContent = "无法加载 data/questions.json，请用静态服务器打开。";
    });

  btnNext.addEventListener("click", next);
  btnRestart.addEventListener("click", function () {
    if (cache.length) reset(cache, false);
  });
  btnAgain.addEventListener("click", function () {
    if (cache.length) reset(cache, false);
  });
  if (btnReview) btnReview.addEventListener("click", startReview);

  document.addEventListener("keydown", function (e) {
    if (doneEl && !doneEl.hidden) return;
    var tag = (e.target && e.target.tagName) || "";
    if (tag === "INPUT" || tag === "TEXTAREA") return;

    if (!locked) {
      var map = { "1": 0, "2": 1, "3": 2, "4": 3, a: 0, b: 1, c: 2, d: 3, A: 0, B: 1, C: 2, D: 3 };
      if (map[e.key] != null) {
        var q = questions[index];
        if (q && map[e.key] < q.choices.length) {
          e.preventDefault();
          onChoose(map[e.key]);
        }
      }
    } else if (e.key === "Enter") {
      e.preventDefault();
      next();
    }
  });
})();
