# 2026-07-24 修行小遊戲最新交接

本文件是修行小遊戲的最新交接。若旧文件、舊程式註解或先前對話與本文件衝突，以本文件及 `WORK_QUEUE.md` 的最新段落為準。

## 完成、未實機驗收

- `CultivationCountdownOverlay.ts`：砍竹「凝神／聚力／開始」、挑水「穩心／提擔／開始」、清心訣「靜心／入定／開始」。倒數期間控制器是 `countdown`，時間、輸入、判定及平衡物理鎖定；暫停保存剩餘時間。
- `StreakCounter.ts`：砍竹傳「連擊」，清心訣傳「共鳴」，共用位置、淡金數字、分級、進場與歸零淡出。
- `streakAcceleration.ts`：0／3／6／10／15／20 成功對應 1300／1120／980／860／760／680ms，最低650ms。砍竹與清心訣已接入；不需加速的節奏玩法設 `streakAccelerationEnabled: false`。
- `CultivationGameHUD.ts`：砍竹、挑水、清心訣已接入新版 HUD。暫停開啟與「機關」相同的系統選單；返回依進度結算。
- `CultivationResultPanel.ts`：砍竹、挑水、清心訣已使用共用宣紙、標題、中文列名、固定右緣數值欄及共用按鈕。修為封頂時停用再次修行並提示先突破。
- 清心訣經脈改為百會至氣海再原路返回，規格見 `docs/systems/training-games/清心訣經脈共鳴小遊戲規格.md`。
- `npm run build`、`validate:assets`、`validate:landscape`、`validate:balance` 通過；尚未完成瀏覽器與觸控實測。

## 挑水最高版本

- 玩法最高版本：使用者最後提供的《九劫問仙》挑水修行小遊戲正式實作規格；不是跑酷，也不是光圈QTE。
- 畫面比對：`art/references/gameplay/water-carry/water-carry-gameplay-layout-reference-v2.png`。
- 資產與角色架構：`docs/systems/training-games/挑水小遊戲美術資產與角色架構.md`。
- HUD raw：`art/raw/ui/cultivation-hud/`。
- HUD processed：`art/processed/ui/cultivation-hud/`。
- HUD runtime：`game/public/assets/ui/cultivation-hud/`。
- 場景候選：`art/candidates/scenes/water-carry-well-bright-landscape-v3.png`。
- 男女整身姿勢參考：`art/candidates/characters/water-carry/`；不得各自拆成兩套正式動畫。
- 正式人物只做一套共用身體、服裝、四張負重踏步、手腳、扁擔、繩索、水桶與水面；男女只換頭、前髮、後髮及必要髮帶。
- 資產規格已加入 `assets-spec/ui.yaml`、`assets-spec/scenes.yaml`。

## 下一模型依序執行

1. 實機驗收砍竹、挑水、清心訣 HUD：1200×675、960×540、640×360；測試倒數暫停、遊戲暫停、返回結算、重複點擊及封頂提示。
2. 顧藥園與吐納仍是舊型原型。先補控制器生命週期，再接入共用 HUD、倒數與結算；不得只覆蓋圖片。
3. 挑水按正式規格重構持續平衡物理、輸入清理、外力延遲、左右桶獨立擺動、水面回正、灑水及一次性獎勵鎖。
4. 挑水建立共用身體四張負重踏步與男女頭髮替換；完成重組差異驗收後才可進 active。
5. 倒數音效未接入。只可使用可商用免費的木魚／竹節、玉石／木磬、短吐息實錄；禁止emoji、電子嗶聲與振盪器。保存素材頁、檔名與授權證明。
6. 小遊戲NPC目前不接入。後續建立NPC隨機池、性別／稱謂條件與場景台詞；對話在倒數前播放，結束後不得遮住玩法HUD。

## 2026-07-24 砍竹 HUD 最新修正（已完成／未驗收）

- 砍竹只保留 `CultivationGameHUD`；舊時間條、舊返回／設定、舊左側程式紙框、舊底部提示與收式按鈕已移除，不得恢復第二套 HUD。
- 頂部時間使用沙漏與 `00:30`；目標移至頂部，顯示 `達成度：N / 10`。左側顯示 `今日剩餘 N / 3 次修行`，N 由玩家狀態帶入。
- `CircularChargeGauge` 在判定後立即歸 0%；自然到 100% 未輸入也立即重啟為 0%，禁止播放倒退動畫。
- 倒數移至頂部 HUD 下方的角色頭頂安全區。上、下、左側與 NPC 宣紙已由使用者更正為規則直邊、純宣紙、無水墨底圖；舊毛邊規則已過時。
- 已通過平衡、橫式、資產與正式建置驗證；內建瀏覽器 canvas 無 console error，但未能擷取 WebGL 畫面，仍須由 4173 預覽做人眼驗收。

## 2026-07-24 場景進場與直邊宣紙公版

- 新增 `game/src/ui/SceneIntroductionOverlay.ts`：全畫面黑色半透明遮罩、中央場景名與細底線；全部淡出後才執行後續動畫。
- 問仙石點擊「前往雜役處」後也必須使用同一個 `SceneIntroductionOverlay` 顯示「雜役處」；遮罩完整退場後才開始壞執事劇情，不得恢復舊版專用標題淡入。
- 標題與底線置於同一置中容器，底線寬度依標題實際顯示寬度計算；此規則同時適用「雜役處」與「小竹峰山下」。
- 場景進場標題是全專案共用公版：任何新場景不得自行建立另一套文字、底線或遮罩。小遊戲場景也使用同一公版，但目前保持關閉，待玩法定案後再逐一啟用。
- 雜役處劇情結束後先顯示純竹林與「小竹峰山下」，遮罩退場後才建立砍竹玩法；其他小遊戲目前不啟用。
- 砍竹頂部 HUD 高度由 92 提高為 112，時間、標題、達成度與控制錨點同步調整。
- 使用者已確認直邊純宣紙系列。這套資產只屬於小遊戲 HUD，正式來源在 `art/active/ui/cultivation-hud/`，runtime 全部位於 `game/public/assets/ui/cultivation-hud/`。
- 四張正式公版：`information-parchment-straight-v2.png`、`top-hud-parchment-straight-v2.png`、`bottom-hint-parchment-straight-v2.png`、`minigame-npc-information-parchment-straight-v2.png`。最後一張只供小遊戲內 NPC 提示資訊使用，不是劇情台詞底圖。
- 2026-07-24 最新替換：公版 HUD runtime 已改用無框線系列，active 位於 `art/active/ui/cultivation-hud/*-unframed-v1.png`；runtime 保持 `game/public/assets/ui/cultivation-hud/*-parchment-v1.png` 穩定路徑。有框線系列只保留作資產備選。
- 砍竹第一次進入會從 `game/public/assets/characters/minigame-npc/` 的慕清璃／柳如煙中隨機選一名；連擊首次達 5 時顯示「作得不錯。」。NPC 與資訊欄皆為獨立圖層，且此提示不得使用或改寫正式劇情 `xuan-dialogue-panel`。
- 上述 NPC runtime 已改放 `game/public/assets/characters/mu-qingli/` 與 `game/public/assets/characters/liu-ruyan/`；active 對應 `art/active/characters/<character-id>/minigame/`。
- 共用修行 HUD、倒數、返回確認與結算規則以 `CultivationGameHUD.ts`、`CultivationCountdownOverlay.ts`、`CultivationResultPanel.ts` 為唯一公版。返回確認必須暫停控制器、倒數、Tween 與角色動畫；提前離開不給關卡基礎保底。
- NPC 新規範固定在 `docs/art/NPC_MODULAR_CHARACTER_STANDARD.md` 與 `assets-spec/characters.yaml`：成人男／成人女／孩童三種身材模組，僅替換頭、髮型、服裝與配飾；左右朝向只能 runtime flip，禁止重新生成。
- 錯誤替換已撤銷：`game/public/assets/ui/dialogue/xuan-dialogue-panel-v1.png` 已恢復原始劇情素材，所有正式劇情台詞演出繼續使用它。禁止以小遊戲資訊欄覆蓋。
- 舊小遊戲範例拆圖版已封存於 `art/archive/ui/cultivation-hud/`，錯誤毛邊水墨版在 `art/rejected/ui/cultivation-hud/`。
- Contact Sheet：`art/reviews/ui/cultivation-hud/straight-parchment-family-v2-contact-sheet.png`。
