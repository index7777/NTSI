# NTSI 資產管線風格入口

本檔是規格驅動生成的入口，不取代既有美術母板。每次組裝生成 Prompt 前必須依序讀取：

1. `AGENTS.md`
2. `docs/art/UI_STYLE_GUIDE.md`
3. `docs/art/CHARACTER_PORTRAIT_STANDARD.md`
4. `docs/art/角色美術與境界演出母板.md`
5. `art/README.md`
6. 對應的 `assets-spec/*.yaml`

## 固定規則

- 遊戲原生畫面為 1200×675、16:9。
- 角色、場景、UI、VFX 必須拆層；只有使用者明確核准的小型場景插圖可烙入人物。
- 圖片內不得生成遊戲文字；使用者明確要求的書法文字資產除外，且必須獨立透明輸出。
- 未驗收輸出只能進 `art/raw` 或 `art/candidates`。
- 備選圖確定採用後才執行去背。
- 人工去背使用 `tools/去背工具.html`；輸出進 `art/processed`。
- 通過驗證與人工驗收後才可進 `art/active`，再複製到 `game/public/assets`。
- 圖片生成使用 Codex 內建圖片工具，不建立或呼叫專案 Image API 腳本。
- Prompt 必須由 YAML 欄位與上位母板組裝，不得忽略 identity lock、constraints 或 manual checks 自由發揮。

## 資產生命週期

`raw → candidates → processed → reviews → active`

不採用的版本移入 `rejected`；被新版本取代但仍需追溯的正式資產移入 `archive`。

