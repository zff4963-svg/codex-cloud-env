# 健康参与感与奖励机制（教 · 学 · 玩）

> 星火学院记忆游戏的「成瘾感」指**可持续的学习习惯回路**，不是暗黑模式。  
> 实现：`games/reward-kit.js` + `games.css` 钩子；进度存本机 `localStorage`。  
> 生成：2026-11-02（Asia/Shanghai）

---

## 1. 设计原则

| 要做 | 不要做 |
|------|--------|
| 清晰反馈：完成就给 XP / 连胜 / 徽章 | 把核心教学内容锁在付费墙后 |
| 每日小目标可完成（约 5–15 分钟） | 无限开箱、随机稀有掉落赌运气 |
| 连胜鼓励「回来学一点」 | 惩罚性断连（清零恐吓、羞辱文案） |
| 徽章表彰真实学习行为 | 假装「差一点就出货」的赌博时间表 |
| 教 → 学 → 玩 闭环可见 | 强制看广告才能继续下一题 |

**一句话**：奖励是为了**记住与复查**，不是为了掏钱包或刷虚假时长。

---

## 2. 教 → 学 → 玩（有教有学有玩）

每个专业模块页（`games/tracks/<major>/<module>/`）固定三栏：

1. **教**：30–90 秒可读的要点提示（教学占位，非诊疗建议）
2. **学**：闪卡 / 选择题 / 拖拽等「刻意练习」入口
3. **玩**：同一知识点的游戏化关卡（现有四游戏或预防 MCQ）

完成「玩」或「学」关卡后，由 `XinghuoReward.grantGameComplete` 发奖；浏览「教」可记一次轻量 `grantTeachView`（可选，防刷：每模块每日最多计 1 次）。

---

## 3. XP 公式

存储键：`xinghuo-reward-v1`

```
baseXP        = 20                         # 完成一局非复习模式
accuracyBonus = floor(accuracy01 * 30)     # 正确率 0–1 → 最多 +30
perfectBonus  = accuracy01 >= 1 ? 15 : 0   # 全对
streakBonus   = min(streakDays, 7) * 2     # 连胜加成，封顶 +14
dailyFirstBonus = 是今日首局 ? 10 : 0
teachBonus    = grantTeachView ? 5 : 0     # 每日每模块最多一次

grantedXP = baseXP + accuracyBonus + perfectBonus + streakBonus + dailyFirstBonus
```

复习模式（错题再练）建议：`baseXP = 8`，无 `dailyFirstBonus`，准确率加成减半。

若调用方只传 `score` / `maxScore`，则 `accuracy01 = score / maxScore`；配对类可用 `accuracy01 = 1`（清台）或按失误折算。

---

## 4. 等级（Level）

| 等级 | 累计 XP 下限 | 称号（中文 UI） |
|------|--------------|-----------------|
| 1 | 0 | 初学星火 |
| 2 | 100 | 勤记学子 |
| 3 | 250 | 经络行者 |
| 4 | 500 | 方证学人 |
| 5 | 900 | 三基通达 |
| 6 | 1500 | 辨证有方 |
| 7 | 2400 | 杏林新秀 |
| 8 | 3600 | 博闻医士 |
| 9 | 5200 | 慎思明辨 |
| 10 | 7000 | 星火传灯 |

升级时弹出庆祝 toast（尊重 `prefers-reduced-motion`）。

---

## 5. 每日连胜（Streak）

- 时区按用户本地日（`YYYY-MM-DD`）。
- 当日首次「有效完成」（非空局）→ 若昨日也有完成则 `streak += 1`，否则 `streak = 1`。
- 中断超过 1 个自然日 → 下次从 1 重新计；**不**恐吓清零动画。
- UI 展示「连续学习 N 天」。

---

## 6. 每日目标（Daily Goal）

默认目标（可本地调整，当前实现写死友好默认）：

- 获得 **50 XP**，或
- 完成 **1** 次游戏通关

进度条在专业枢纽与奖励条显示；完成后给一次「今日目标达成」toast（每日一次）。

---

## 7. 徽章（Badges）

| id | 名称 | 条件 |
|----|------|------|
| first_clear | 初试锋芒 | 任意游戏首次完成 |
| streak_3 | 三日不断 | 连胜 ≥ 3 |
| streak_7 | 七日星火 | 连胜 ≥ 7 |
| perfect_run | 满贯一局 | 任一局准确率 100% |
| xp_500 | 积学五百 | 累计 XP ≥ 500 |
| polymath | 五科探路 | 在 5 个专业轨道各打开过模块（本地标记） |
| prevention_rookie | 公卫入门 | 完成 `prevention-quiz` 一局 |
| anatomy_rookie | 西基入门 | 完成 `anatomy-quiz` 一局 |
| formula_rookie | 方药入门 | 完成 `formula-flash` 一局 |
| meridian_rookie | 腧穴入门 | 完成 `meridian-match` 或 `acupoint-drag` |

徽章只解锁一次；解锁时 toast + 写入 `badges[]`。

---

## 8. API 钩子（实现对照）

```js
// games/reward-kit.js → window.XinghuoReward
loadState()
saveState(patch)
getLevel(xp)
grantGameComplete(gameId, { score, maxScore, accuracy, reviewMode, major })
grantTeachView(moduleId)
renderHud(containerEl)   // 等级 / XP / 连胜 / 今日目标
celebrate(message)
listBadges()
```

`games-kit.js` 提供薄封装 `XinghuoGames.grantCompletionReward(...)`，在各游戏 `finish` 中于 `saveProgress` 之后调用。

---

## 9. 明确禁止的模式（实现自检清单）

- [ ] 无随机付费开箱 / 抽卡决定能否学到下一知识点
- [ ] 无「能量耗尽等 8 小时」硬锁核心内容（可用温和提醒，不可锁死教材要点）
- [ ] 无暗黑 FOMO 倒计时强迫当日出分
- [ ] 无伪装胜率的转盘、老虎机动效发奖
- [ ] 文案不羞辱用户（避免「你又忘了」「失败者」）

---

## 10. 修订记录

| 日期（Asia/Shanghai） | 说明 |
|----------------------|------|
| 2026-11-02 | 初版：XP / 连胜 / 等级 / 徽章 / 每日目标 / 教学玩 / 禁则 |
