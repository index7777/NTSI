# 《九劫問仙》商業遊戲架構規劃

狀態：規劃鎖定；目前先完成橫式 demo 與美術驗收，demo 穩定後依本文件分階段搬遷。禁止繼續把新系統永久堆入 `OpeningScene.ts`。

## 架構目標

- 原生 1200×675 橫式、桌面與觸控共用輸入契約。
- 正式美術與版面基準為 1920×1080 safe area；遷移前 1200×675 僅作等比例邏輯座標，Canvas 必須依裝置像素比高解析渲染。非16:9瀏覽器視窗以同場景延伸霧景／暗色 bleed 填充，不得拉伸主畫面或顯示網頁感純色邊框。
- 場景、UI、資料、存檔、VFX、音訊與小遊戲互相解耦。
- 劇情與數值資料驅動，避免台詞、資產路徑和流程條件散落在場景程式。
- 支援存檔版本遷移、診斷、自動回歸、資產授權追蹤及正式版保護。
- 單一功能可測試、替換與維護，不以全域單例或場景私有函式互相穿透。

## 目錄邊界

```text
src/
  app/              # bootstrap、GameConfig、環境旗標、錯誤邊界
  scenes/           # 只管理場景生命週期與組裝
    title/
    character-create/
    question-stone/
    chore-office/
    courtyard/
    training/
  systems/          # Save、Audio、Input、Clock、Progression、Narrative
  ui/               # HUD、選單、對話框、場景卡、日誌、共用元件
  vfx/              # VFX 定義、發射器、遮罩、shader、鏡頭演出
  minigames/        # 各小遊戲插件與自檢
  data/             # 劇情、角色、平衡、資產 manifest
  state/            # GameState、事件、command、selector
  diagnostics/      # 開發診斷、自檢 runner、流程回歸
```

## 場景與流程

- 場景不得直接呼叫另一場景的私有方法；以 `SceneRouter`、command 或明確事件轉移。
- 每個場景實作 `enter(payload)`、`suspend()`、`resume()`、`exit()` 的等價生命週期。
- Title、CharacterCreate、QuestionStone、ChoreOffice、MainCourtyard 與各 TrainingGame 分離。
- 共用 HUD 為獨立 overlay scene／UI layer，不隨內容場景重建。
- 劇情演出使用 timeline 資料：文字、角色表情、音效、VFX、輸入鎖與下一節點可配置。

## 狀態與存檔

- `GameState` 是唯一真實來源；畫面只讀 selector，變更透過 command。
- Save schema 必須有版本號、遷移函式、校驗與損壞備援。
- 自動存檔只在穩定節點執行；小遊戲進行中保存 checkpoint，不寫半套結算。
- 開發診斷可建立測試存檔，但不得污染使用者 4173 的預覽存檔。

## UI／HUD 排程

- 共用角色 HUD：頭像、身份、宗門日、時段、境界、修為、人物、背包、日誌、設定。
- 遊戲內選單：繼續、修行紀錄、設定、回首頁；「道心崩了」只在設定深層觸發。
- 對話框、名稱牌、頭像、場景卡與按鈕狀態均使用母版元件，不烘進場景圖。
- 所有 UI 有 hover／pressed／disabled／focus／touch 狀態與安全區測試。

## VFX 與資產

- 資產經 `planned → candidate → approved → runtime`，manifest 記錄來源、授權、版本與用途。
- 正式 VFX 使用授權透明素材／圖集、遮罩、粒子、shader、混合模式及鏡頭 timeline。
- CSS、Phaser 幾何 Graphics 或簡單透明度只能 debug，不得作正式美術交付。
- 場景採遠景、建築、功能區、人物、前景、霧、光效分層；可單獨替換與季節化。

## 小遊戲插件契約

每個小遊戲實作一致介面：

- `canEnter(state)`：進入條件。
- `start(context)`：建立關卡與輸入。
- `pause/resume/reset/dispose`：完整生命週期。
- `getResult()`：成功、失敗、取消、獎勵與時間消耗。
- `runSelfCheck()`：回傳具名檢查結果，不只 `true/false`。

自檢至少覆蓋進入條件、滑鼠／觸控、成功／失敗、提早放開、重置、連續重玩、獎勵、時間推進、存檔恢復、橫式安全區、HUD 遮擋與異常中斷。全部場景完成後建立完整玩家流程回歸 runner。

## 診斷與正式版保護

- 開發版保留 FPS、場景、狀態、資產缺失與 VFX 診斷；正式版關閉。
- 全環境阻止右鍵選單、圖片拖曳與長按另存；正式版另阻止常見開發工具快捷鍵。
- 前端保護不能保證資產不可取得；正式版另採圖集、切片、版本雜湊與非語意檔名，文件不得宣稱絕對防下載。

## 搬遷順序

1. 鎖定可玩的橫式 demo、存檔 fixture 與畫面基準。
2. 抽出 `GameState`、Save、Audio、Input、SceneRouter，不改玩法。
3. 拆 Title／CharacterCreate／QuestionStone／ChoreOffice 場景。
4. 建共用 HUD overlay、對話與場景卡元件。
5. 將修行活動拆為小遊戲插件，接 `runSelfCheck()`。
6. 導入資產 manifest、VFX timeline 與授權稽核。
7. 跑存檔遷移、完整流程、自檢、效能與 1200×675 視覺回歸後，移除舊 `OpeningScene` 相容程式。

每一步都必須保持上一版可玩並通過 `validate:balance`、正式 build 與流程回歸；不得一次性重寫全部系統。
