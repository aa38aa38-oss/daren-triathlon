# 打人三項

游泳 → 單車 → 跑步 → 血池決戰的 3D 競速＋吃雞網頁遊戲。

## 怎麼玩

在這個資料夾打開終端機，執行：

```
npm install
npm run dev
```

然後用瀏覽器打開 http://localhost:5173

## 操作

| 按鍵 | 功能 |
|---|---|
| W A S D／方向鍵 | 移動 |
| F 或 J | 揍人 |
| 空白鍵 | 使用道具 |
| Enter | 幽靈模式時快轉 |

手機：左邊搖桿（會自動往前跑，往下拉是煞車），右邊「揍」和「道具」按鈕。

## 想改遊戲？

- 關卡長度、速度、時間、每關道具：`src/config.js`
- 道具效果與傷害：`src/game/combat.js`
- 電腦選手的行為：`src/game/ai.js`
- 淘汰、復活、幽靈、縮圈等規則：`src/game/sim.js`
- 噴血特效：`src/render/gore.js`
- 四張地圖：`src/levels/`

## 發佈

`npm run build` 會產生 `dist/` 資料夾，把裡面的檔案放到 GitHub Pages 就能讓朋友用網址玩。
