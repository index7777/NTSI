# NPC 模組化角色與提詞管理規範

本規範是所有 NPC 生成、修改、場景卡與對話演出的前置必讀文件。

## 共用身材模組

所有 NPC 只能選用三種共用身材模組：

1. `body_module_adult_male_001`：成年男性。
2. `body_module_adult_female_001`：成年女性。
3. `body_module_child_001`：孩童。

同一身材模組必須鎖定骨架、肩寬、四肢長度、手掌比例、頭身比、攝影機與光源。建立新 NPC 時不得重新自由設計身材。

人物差異只允許替換頭部、髮型、服裝與配飾。

## 朝向規則

- 需要相反朝向時，使用 Phaser `setFlipX(true)`、CSS `scaleX(-1)` 或引擎等價功能。
- 不得為了左右朝向重新生成圖片。
- 文字與 UI 底板不得跟著角色反轉；角色、對話框與文字必須保持獨立圖層。

## 固定提詞欄位

每次生成前必須從 `assets-spec/characters.yaml` 組裝提詞，至少包含：

- `body_module`
- `identity_reference`
- `head`
- `hairstyle`
- `outfit`
- `accessories`
- `expression`
- `pose`
- `camera`
- `lighting`
- `transparent_background`
- `identity_locked`
- `constraints`

不得以自由描述取代上述欄位。沒有指定的欄位沿用角色母版，不得自行變更。

提詞組裝順序固定為：

1. 選擇 `body_module`。
2. 載入 `identity_reference` 與既有角色母版。
3. 套用 `head`、`hairstyle`、`outfit`、`accessories`。
4. 描述本次用途需要的 `expression` 與 `pose`。
5. 重申鎖定的 `camera`、`lighting`、`transparent_background` 與 `identity_locked`。
6. 最後附加共用 `constraints` 與固定負面限制。

朝向不屬於生成差異。提詞只記錄母版原始朝向；實機所需的另一方向由 runtime flip 處理。

## 固定負面限制

- 不改身材比例、頭身比、鏡頭或光源
- 不烙入背景、對話框或文字
- 不因朝向重新生成
- 不裁切頭髮、配飾、手部或服裝外緣

## 資產目錄

每名 NPC 必須放入自己的資料夾：

`art/active/characters/<character-id>/`

執行資產放入：

`game/public/assets/characters/<character-id>/`

不同用途再分 `portrait/`、`minigame/`、`scene-card/`、`outfits/` 與 `expressions/`。不得把不同人物集中放在未分類的 `minigame-npc/`。
