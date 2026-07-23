# NTSI 資產規格

每個新資產先在對應 YAML 建立或更新規格，再產生 Prompt。YAML 的 `id` 是永久識別碼；檔名改版時不得更換同一資產的 `id`。

## 類別

- `characters.yaml`：玩家、NPC、服裝版本與表情基準。
- `props.yaml`：問仙石、竹子、水桶、藥材及其他獨立物件。
- `scenes.yaml`：16:9 場景與時段版本。
- `activity-cards.yaml`：砍竹、挑水、藥園、心法、吐納等劇情玩法卡。
- `ui.yaml`：獨立面板、圖示及經核准的文字美術。
- `vfx.yaml`：透明特效圖層。
- `animations.yaml`：Phaser 程式動畫與少量圖層切換動畫。

## 內建生成

本專案不提供 Image API 腳本。Codex 應先執行：

```powershell
python tools/compose_prompt.py --spec assets-spec/characters.yaml --id player_male_mortal_001
```

將輸出 Prompt 與 YAML 指定的 reference 一起交給 Codex 內建圖片生成工具。原始輸出存入 `art/raw`，篩選後移到 `art/candidates`。

## 去背

候選未定案前不得去背。使用者選定後，以瀏覽器開啟：

```text
tools/去背工具.html
```

完成去背的 PNG 存入 `art/processed`，再執行驗證。

