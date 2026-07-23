# NTSI 美術資產工具

## 安裝

```powershell
python -m pip install -r tools/requirements.txt
```

## 規格組 Prompt

```powershell
python tools/compose_prompt.py --spec assets-spec/scenes.yaml --id scene_character_selection_presect_morning_001
```

此工具不呼叫 Image API；輸出交由 Codex 內建圖片生成工具使用。

## 驗證單張圖片

```powershell
python tools/validate_asset.py art/processed/example.png `
  --spec assets-spec/ui.yaml `
  --id ui_title_mechanism_icon_001 `
  --report art/reviews/example-validation.json
```

程式驗證通過不代表人工驗收通過。`manual_checks` 必須由 Codex 視覺檢查與使用者定案。

## Contact Sheet

```powershell
python tools/make_contact_sheet.py art/candidates/example `
  --out art/reviews/example-contact-sheet-v1.png `
  --columns 2
```

若提供 `--validation-report`，只會收入報告中程式驗證通過的圖片。

## 去背

使用現有離線工具 `tools/去背工具.html`。備選圖確定採用後才處理，輸出進 `art/processed`。

## Sprite Sheet

只接受已驗證且人工核准的影格：

```powershell
python tools/make_sprite_sheet.py frame-01.png frame-02.png `
  --out art/processed/player-blink-v1.png `
  --meta art/processed/player-blink-v1.json `
  --validated
```

工具以腳底／底部置中，不用 AI 自由生成傳統逐幀動畫。

## Phaser runtime

```powershell
python tools/build_asset_manifest.py
python tools/validate_phaser_assets.py
```

第一個指令建立 runtime 資產清單；第二個檢查 TypeScript 中的 literal preload 路徑是否存在。

