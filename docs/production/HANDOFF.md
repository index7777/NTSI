# 《九劫問仙》開發交接

最後更新：2026-07-22

## 接手方式

```powershell
git clone https://github.com/index7777/NTSI.git
cd NTSI\game
npm ci
npm run dev
```

正式建置：

```powershell
cd NTSI\game
npm run build
```

完成一項任務後，先更新 docs/production/HANDOFF.md，再於專案根目錄執行：

```bat
sync.bat "本次工作摘要"
```

## 目前可玩範圍

- 首圖、存檔繼續、新的開始與「道心崩了」。
- 男女選角、輸入姓名、問仙石、靈根與四維資質。
- 入門修行、練氣一至九層、重修與失敗跌層。
- 柳如煙贈送筑基丹、裸衝／服丹、筑基一層。
- 四個修行小遊戲已具有操作原型：滑切砍竹、水位平衡、限時藥園、記憶小周天。

## 最近完成

- 遊戲正式方向改為 1200×675、16:9 橫式；直式場景列為 legacy-portrait 參考，尚待全部重製。
- `art/references/ui/game-interface-style-v1.png` 定為 UI／UX／HUD 配置母板；`scene-card-transition-style-v1.png` 定為主場景、場景卡、小遊戲與結算流程母板。
- 新增根目錄 `AGENTS.md`、橫式 UI 規格、人物頭像規格與 UI 資產拆分清單；母板禁止整張實裝，功能與資產必須分層製作。
- 新增 ESC 系統選單、右下場景移動鎖定提示、入門日數與卯／午／酉時段存檔欄位。
- 靈根揭示文案、初期砍竹／心法限制、三段引氣入體與慕清璃吐納教學已開始改版。
- 小遊戲統一規格為 30 秒倒數；時間到未達成功條件判定失敗。
- 圖片生成目前暫停；現有活動插圖只作候選與構圖參考，尚未核准為正式場景卡。

- 角色畫風改為精緻水墨3.5～4頭身Q版。
- 建立新版角色同框比例驗收與拆圖重組P0規格。
- 首圖改為無名入宗者單人背影，不在首圖強調男女選角。
- 移除Logo閃電動畫；保留青玉雲紋呼吸。
- 加入三段音樂流程：Menu、Game Start、進入雜役處後的三首日常循環。
- 平時修行失誤仍依操作分數取得12～48修為。
- 筑基一至九層已接入修行、修為門檻、突破與失敗跌落流程；四維逐項獨立成長並受本層上限限制。
- 筑基九層修為滿後已可進入九重雷劫第一版可玩原型，包含閃避、彈反、護盾、生命歸零跌落與Demo Ending。
- 雷劫已加入第一版鏡頭速度感：預警拉遠、出手推近、成功回彈、受擊短震；HUD按鈕維持固定。

## 音樂流程

1. 首圖：`OST 001 NTSI menu`，首次音訊互動後漸入。
2. 選角、取名、問仙石與資質揭示：`OST 0001 NTSI game start`。
3. 點擊「前往雜役處」後：停止Game Start曲，三首日常音樂依序循環並漸入。

瀏覽器會限制未經互動的自動播放，因此Menu曲最早會在玩家首次點擊或按鍵後開始。

## 新版角色素材狀態

- `art/active/characters/player-male-master.png`：男玩家畫風基準。
- `art/candidates/characters/player-female-v2.png`：女玩家中性站姿候選，尚未完成正式拆圖重組驗收。
- `art/active/characters/liu-ruyan-v1.png`：柳如煙造型基準。
- `art/candidates/characters/mu-qingli-v2.png`：冷眼持劍修正版候選。
- `art/active/characters/sect-elder.png`：收徒執事。
- `art/candidates/characters/outer-sect-steward.png`：後續外門資源NPC，Demo暫不實裝。
- `art/reviews/character-scale-review-v1.png`：第一版同框驗收。
- `art/active/ui/title-traveler-v1.png`：首圖單人背影素材。

未通過原圖重組與同場景比例驗收的素材只能視為候選，不得標記正式完成。

## 素材搬移對照

第一階段圖片舊檔名與英文新路徑，統一查閱 docs/production/ASSET_MIGRATION_MAP.md。

## 強制人物美術與對話規範

凡涉及人物、服裝、表情、劇情對話或生成美術，動工前必須先讀取根目錄 `AGENTS.md` 與 `docs/art/CHARACTER_PORTRAIT_STANDARD.md`。角色資產狀態統一登錄於 `game/src/config/characters.ts`；沒有通過母板、比例及表情驗收的素材不得標記正式完成。

## 主要規格文件

- `gdd.md`
- `numbers.md`
- `breakthrough.md`
- `docs/narrative/遊戲開局演出與劇本_v1.md`
- `docs/art/角色美術與境界演出母板.md`
- `docs/systems/training-games/練氣修行小遊戲規格.md`
- `docs/production/PROJECT_MEMO.md`

只使用Markdown正式文件；不以舊TXT內容作為規格來源。

## 目前待辦

1. 依橫式母板拆分 HUD、紙卷、木框、圖示、按鈕狀態與進度元件，不得整張使用母板。
2. 重做橫式首圖、選角、問仙石、宗門主庭院、洞天與築基洞府；核心場景需卯時、午時、酉時三版本。
3. 接入「宗門主庭院 → 場景卡 → 小遊戲 → 結算 → 時段推進」正式流程。
4. 完成外門壞執事贈送《納氣訣》劇情與人物／表情資產驗收。
5. 完成修行、渡劫、突破、跌境與遊玩時數統計介面。
6. 將全部小遊戲倒數統一為 30 秒並補齊逾時失敗判定。

- 待跨境服裝正式驗收後，補齊男女玩家各境界的活動劇情場景卡；卡片演出隨境界升級，小遊戲操作暫時一致。

1. 將雷劫原型補成每劫精確道數、追蹤雷、小雷、全螢幕第九劫與神識預判。
2. 加入回血丹使用、百分比回復、不中斷雷劫的操作與筑基丹正式素材。
3. 驗收新版單人背影在實際首圖的大小、站位與按鈕遮擋。
4. 完成玩家正式拆圖、重組疊合與數值驗收。
5. 製作首圖前景草、雲海、宗門光與景深分層；不使用閃電動畫。
6. 重製問仙石場景角色與宣紙資質UI。
7. 為四個修行小遊戲補齊水墨背景、角色動作與互動素材。
8. 實機測試觸控滑切、挑水平衡、周天描線與雷劫QTE。

## 驗證要求

- 每次修改程式後執行 `npm run build`。
- 角色同場景必須輸出比例驗收截圖。
- 拆圖必須重組比對原圖；沒有比對不算合格。
- 手機以至少360px寬畫面驗證，網頁同步驗證滑鼠操作。
- 每次完成使用者指派工作後更新本文件，再執行同步。


