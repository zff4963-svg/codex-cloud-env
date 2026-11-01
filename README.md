# 星火学院（Xinghuo Academy）

面向中医针灸、医疗 + AI 与综合学习的静态学院站点。设计语言参考纸感 / 玉色 / 圆角 Bento 卡片，**原创文案与占位内容**，覆盖：

- 中医 / 针灸
- 医疗 + AI
- 综合学习平台（课件馆、**多专业记忆游戏 · 教·学·玩 · 健康奖励**）

纯 HTML / CSS / JS，无需构建。根目录共享 `styles.css` 与 `main.js`；游戏另有 `games/games.css`、`games/games-kit.js`、`games/reward-kit.js`。

**教学占位，非诊疗建议。** 穴位、方药、解剖与公卫题目只供自学记忆，不构成诊断、处方或防治方案。

## 仓库布局

源压缩包把站点包在 `xinghuo-academy/` 目录里。解压时已去掉这一层，**站点文件就在本仓库根目录**（与本 README 同级），没有嵌套的 `xinghuo-academy/` 文件夹。

在仓库根目录启动静态服务器后，`index.html` 即首页，`games/` 即专业枢纽，`docs/` 即说明文档。页面之间的相对路径按这一层布局书写。

## 本地预览

游戏通过 `fetch` 读取 `data/*.json`。用 `file://` 直接打开 HTML 时，浏览器会拦截这些请求，题目加载失败。请在仓库根目录起一个静态服务器：

```bash
python -m http.server 8080
```

然后在浏览器打开：

- 首页：<http://127.0.0.1:8080/>
- 专业游戏枢纽：<http://127.0.0.1:8080/games/>
- 某一小游戏示例：<http://127.0.0.1:8080/games/prevention-quiz/>

若本机只有 `python3` 命令，把上面换成 `python3 -m http.server 8080`，模块相同。默认不写端口时是 `8000`，URL 里的端口要和命令一致。

也可从首页导航「记忆游戏」进入同一枢纽。在「五专业轨道」Tab 切换中医学 / 针灸推拿 / 临床医学 / 预防医学 / 中西医结合，点模块进入教·学·玩；页下方可直达全部小游戏。

## 页面结构

| 路径 | 说明 |
| --- | --- |
| `index.html` | 首页 |
| `learning/index.html` | 学习中心 |
| `acupuncture/index.html` | 针灸专区 |
| `medai/index.html` | 医疗 AI |
| `courseware/index.html` | 课件馆 |
| **`games/index.html`** | **专业游戏枢纽（五专业 Tab + 奖励 HUD + 全部游戏）** |
| `games/meridian-match/` | 穴位/经络翻卡配对 |
| `games/formula-flash/` | 中药/方剂闪卡 |
| `games/anatomy-quiz/` | 西医解剖/生理选择题 |
| `games/acupoint-drag/` | 针灸取穴拖拽 |
| `games/prevention-quiz/` | 预防医学 MCQ |
| `games/tracks/<major>/<module>/` | **教→学→玩** 模块页（每专业 2 个：1 个示例 + 1 个短占位） |
| `docs/curriculum-game-map.md` | 课程→游戏地图（含预防医学第 8 节） |
| `docs/engagement-reward.md` | XP / 连胜 / 徽章 / 禁则说明 |
| `about/index.html` | 关于我们 |

### 示例轨道（教·学·玩）

| 专业 | 示例模块 | 路径 |
| --- | --- | --- |
| 中医学 | 方剂学入门 / 中药学入门（占位） | `games/tracks/tcm/fangji/` · `zhongyao/` |
| 针灸推拿 | 经络腧穴 / 刺法灸法入门（占位） | `games/tracks/acupuncture/jingluo/` · `cifa/` |
| 临床医学 | 解剖生理 / 诊断学入门（占位） | `games/tracks/clinical/anatomy/` · `diagnostics/` |
| 预防医学 | 流行病学入门 / 卫生统计学入门（占位） | `games/tracks/prevention/epidemiology/` · `biostat/` |
| 中西医结合 | 结合内科对照 / 结合外科入门（占位） | `games/tracks/integrated/neike/` · `waike/` |

各游戏数据在对应目录 `data/*.json`（教学占位，**非诊疗建议**）。

## 奖励与进度（本机）

- 游戏进度：`localStorage` 键 `xinghuo-game-<id>`（`games/games-kit.js`）
- 奖励状态：`xinghuo-reward-v1`（`games/reward-kit.js`：XP、等级、连胜、徽章、每日目标）
- 五款小游戏只在整局结束（`finish` / `finishAll`）时调用 `window.XinghuoReward.grantGameComplete`（`accuracy` 或 `score`/`maxScore`，以及 `reviewMode`、`major`）。结算面板写「本局 +N XP」；toast 仍由奖励组件弹出
- 枢纽页用 `loadState` / `getLevel` / `todayKey` 显示奖励摘要芯片（等级称号、XP、连胜、今日目标）
- 教·学·玩模块页的「读完要点」调用 `XinghuoReward.grantTeachView`（每模块每日最多 1 次，+5 XP）；打开模块页会 `markMajorVisit`
- 设计说明与「不要做什么」：`docs/engagement-reward.md`

## 如何改站名 / 文案

| 想改什么 | 改哪里 |
| --- | --- |
| 站名「星火学院」 | 各页 `.brand-text`、`<title>`、页脚 |
| 专业 Tab / 模块卡片 | `games/index.html` |
| 教·学·玩文案 | `games/tracks/.../index.html` |
| 游戏题目 | 各游戏 `data/*.json` |
| XP / 徽章规则 | `docs/engagement-reward.md` + `games/reward-kit.js` |
| 课程优先级地图 | `docs/curriculum-game-map.md` |
| 配色 | `styles.css` 顶部 `:root` |

修改后刷新即可。
