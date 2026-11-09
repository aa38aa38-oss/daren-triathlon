# 打人三項（打架版）生圖 prompt 清單

## 使用方式

1. **每一段都是完整的 prompt**：直接整段複製、貼到 Gemini 就好，不用再另外貼別的。
2. **生角色時要附參考圖**：把之前生好的那個角色**頭像**一起上傳給 Gemini（prompt 裡已經寫好「照著參考圖畫」）。
3. **存檔**：生好後截圖或下載，放進專案的 `pic` 資料夾，檔名用每段標題的編號（例如 `B01-muscle-A.png`）。
4. **不滿意就重生**：同一張可以多生幾次，挑最整齊的給我。格子沒對齊、大小不一沒關係，我會處理。
5. **Gemini 拒絕畫血**：把 prompt 裡的 `blood` 改成 `red paint splatter`、`dead body lying on the ground WITHOUT a head` 改成 `knocked out, lying flat`。血和斷頭可以由程式補上。

**優先順序**：B01～B08（四個角色）最重要，建議**先生 B01 一張**給我試接，效果確定了再生其他張。

---

## B01-muscle-A　肌肉阿伯：移動與普通攻擊　★★★

上傳參考圖：肌肉阿伯的頭像

```
STYLE (apply to everything): 16-bit SNES-era pixel art sprite sheet for a 2.5D side-scrolling beat 'em up fighting game. Bold 1-pixel dark purple outline (#1a1028) around every sprite, 3-tone cel shading with shadows shifted toward purple and highlights toward warm yellow, highly saturated colors, chunky chibi proportions (big head, short body), crisp hard pixels, no anti-aliasing, no gradients, no blur, no text, no shadows on the background. Tone: cartoon horror comedy — cute characters, exaggerated violence, bright red cartoon blood. Every sprite is separated with generous empty space on ONE flat solid magenta background (#FF00FF), arranged in a clean evenly spaced grid, nothing touching or overlapping. Original characters only.

Sprite sheet for ONE character, a grid of 4 rows x 4 columns. Every sprite is the SAME character, full body, SIDE VIEW FACING RIGHT, same size and scale in every cell, feet standing on the same baseline at the bottom of each cell. Row 1: (1) idle fighting stance, (2) idle stance breathing (slightly lower), (3) walking step A, (4) walking step B. Row 2: (1) walking step C, (2) jumping up with knees tucked, (3) flying kick in the air, (4) falling down from a jump. Row 3: (1) quick jab punch with the front fist, (2) strong cross punch with the back fist, (3) high kick, (4) getting hit, leaning back in pain. Row 4: (1) knocked flying backward through the air, (2) lying flat on the back on the ground, (3) getting up on one knee, (4) dizzy and stunned with stars around the head. Character: a bald muscular middle-aged man with a thick black mustache, red tank top, huge bare arms, blue shorts, dark sneakers. Keep the exact same outfit, colors and proportions in every cell. Match the reference character's face, outfit and colors exactly (a reference image of this character is attached).
```

## B02-muscle-B　肌肉阿伯：三招與其他動作　★★★

上傳參考圖：肌肉阿伯的頭像（或剛生好的 A 張）

```
STYLE (apply to everything): 16-bit SNES-era pixel art sprite sheet for a 2.5D side-scrolling beat 'em up fighting game. Bold 1-pixel dark purple outline (#1a1028) around every sprite, 3-tone cel shading with shadows shifted toward purple and highlights toward warm yellow, highly saturated colors, chunky chibi proportions (big head, short body), crisp hard pixels, no anti-aliasing, no gradients, no blur, no text, no shadows on the background. Tone: cartoon horror comedy — cute characters, exaggerated violence, bright red cartoon blood. Every sprite is separated with generous empty space on ONE flat solid magenta background (#FF00FF), arranged in a clean evenly spaced grid, nothing touching or overlapping. Original characters only.

Sprite sheet for ONE character, a grid of 3 rows x 4 columns. Every sprite is the SAME character, full body, SIDE VIEW FACING RIGHT, same size and scale in every cell, feet on the same baseline. Row 1: (1) special move A wind-up, (2) special move A hit, (3) special move B wind-up, (4) special move B release. Row 2: (1) special move C wind-up, (2) special move C impact, (3) holding a weapon in a ready pose (empty hand gripping, no weapon drawn), (4) overhead swinging attack. Row 3: (1) throwing something forward overhand, (2) dodge roll curled into a ball, (3) dead body lying on the ground WITHOUT a head, red stump at the neck, (4) the severed head alone with a shocked face. Special moves: A = headbutt dash, leaning forward head first; B = throwing a heavy dumbbell overhand; C = jumping and stomping the ground with both feet, dust shockwave around the feet. Character: a bald muscular middle-aged man with a thick black mustache, red tank top, huge bare arms, blue shorts, dark sneakers. Keep the exact same outfit, colors and proportions in every cell. Match the reference character's face, outfit and colors exactly (a reference image of this character is attached).
```

## B03-ninja-A　忍者小翠：移動與普通攻擊　★★★

上傳參考圖：忍者小翠的頭像

```
STYLE (apply to everything): 16-bit SNES-era pixel art sprite sheet for a 2.5D side-scrolling beat 'em up fighting game. Bold 1-pixel dark purple outline (#1a1028) around every sprite, 3-tone cel shading with shadows shifted toward purple and highlights toward warm yellow, highly saturated colors, chunky chibi proportions (big head, short body), crisp hard pixels, no anti-aliasing, no gradients, no blur, no text, no shadows on the background. Tone: cartoon horror comedy — cute characters, exaggerated violence, bright red cartoon blood. Every sprite is separated with generous empty space on ONE flat solid magenta background (#FF00FF), arranged in a clean evenly spaced grid, nothing touching or overlapping. Original characters only.

Sprite sheet for ONE character, a grid of 4 rows x 4 columns. Every sprite is the SAME character, full body, SIDE VIEW FACING RIGHT, same size and scale in every cell, feet standing on the same baseline at the bottom of each cell. Row 1: (1) idle fighting stance, (2) idle stance breathing (slightly lower), (3) walking step A, (4) walking step B. Row 2: (1) walking step C, (2) jumping up with knees tucked, (3) flying kick in the air, (4) falling down from a jump. Row 3: (1) quick jab punch with the front fist, (2) strong cross punch with the back fist, (3) high kick, (4) getting hit, leaning back in pain. Row 4: (1) knocked flying backward through the air, (2) lying flat on the back on the ground, (3) getting up on one knee, (4) dizzy and stunned with stars around the head. Character: a slim young female ninja in a dark purple outfit and hood, red headband with a long red scarf flowing behind, only her eyes visible. Keep the exact same outfit, colors and proportions in every cell. Match the reference character's face, outfit and colors exactly (a reference image of this character is attached).
```

## B04-ninja-B　忍者小翠：三招與其他動作　★★★

上傳參考圖：忍者小翠的頭像（或剛生好的 A 張）

```
STYLE (apply to everything): 16-bit SNES-era pixel art sprite sheet for a 2.5D side-scrolling beat 'em up fighting game. Bold 1-pixel dark purple outline (#1a1028) around every sprite, 3-tone cel shading with shadows shifted toward purple and highlights toward warm yellow, highly saturated colors, chunky chibi proportions (big head, short body), crisp hard pixels, no anti-aliasing, no gradients, no blur, no text, no shadows on the background. Tone: cartoon horror comedy — cute characters, exaggerated violence, bright red cartoon blood. Every sprite is separated with generous empty space on ONE flat solid magenta background (#FF00FF), arranged in a clean evenly spaced grid, nothing touching or overlapping. Original characters only.

Sprite sheet for ONE character, a grid of 3 rows x 4 columns. Every sprite is the SAME character, full body, SIDE VIEW FACING RIGHT, same size and scale in every cell, feet on the same baseline. Row 1: (1) special move A wind-up, (2) special move A hit, (3) special move B wind-up, (4) special move B release. Row 2: (1) special move C wind-up, (2) special move C impact, (3) holding a weapon in a ready pose (empty hand gripping, no weapon drawn), (4) overhead swinging attack. Row 3: (1) throwing something forward overhand, (2) dodge roll curled into a ball, (3) dead body lying on the ground WITHOUT a head, red stump at the neck, (4) the severed head alone with a shocked face. Special moves: A = teleport dash slash, blurred afterimage, katana swing; B = throwing three shuriken; C = throwing down a smoke bomb, purple-green smoke puff. Character: a slim young female ninja in a dark purple outfit and hood, red headband with a long red scarf flowing behind, only her eyes visible. Keep the exact same outfit, colors and proportions in every cell. Match the reference character's face, outfit and colors exactly (a reference image of this character is attached).
```

## B05-butcher-A　屠夫老王：移動與普通攻擊　★★★

上傳參考圖：屠夫老王的頭像

```
STYLE (apply to everything): 16-bit SNES-era pixel art sprite sheet for a 2.5D side-scrolling beat 'em up fighting game. Bold 1-pixel dark purple outline (#1a1028) around every sprite, 3-tone cel shading with shadows shifted toward purple and highlights toward warm yellow, highly saturated colors, chunky chibi proportions (big head, short body), crisp hard pixels, no anti-aliasing, no gradients, no blur, no text, no shadows on the background. Tone: cartoon horror comedy — cute characters, exaggerated violence, bright red cartoon blood. Every sprite is separated with generous empty space on ONE flat solid magenta background (#FF00FF), arranged in a clean evenly spaced grid, nothing touching or overlapping. Original characters only.

Sprite sheet for ONE character, a grid of 4 rows x 4 columns. Every sprite is the SAME character, full body, SIDE VIEW FACING RIGHT, same size and scale in every cell, feet standing on the same baseline at the bottom of each cell. Row 1: (1) idle fighting stance, (2) idle stance breathing (slightly lower), (3) walking step A, (4) walking step B. Row 2: (1) walking step C, (2) jumping up with knees tucked, (3) flying kick in the air, (4) falling down from a jump. Row 3: (1) quick jab punch with the front fist, (2) strong cross punch with the back fist, (3) high kick, (4) getting hit, leaning back in pain. Row 4: (1) knocked flying backward through the air, (2) lying flat on the back on the ground, (3) getting up on one knee, (4) dizzy and stunned with stars around the head. Character: a burly butcher with short brown hair and stubble, light blue shirt with rolled sleeves, white apron with red stains, brown trousers. Keep the exact same outfit, colors and proportions in every cell. Match the reference character's face, outfit and colors exactly (a reference image of this character is attached).
```

## B06-butcher-B　屠夫老王：三招與其他動作　★★★

上傳參考圖：屠夫老王的頭像（或剛生好的 A 張）

```
STYLE (apply to everything): 16-bit SNES-era pixel art sprite sheet for a 2.5D side-scrolling beat 'em up fighting game. Bold 1-pixel dark purple outline (#1a1028) around every sprite, 3-tone cel shading with shadows shifted toward purple and highlights toward warm yellow, highly saturated colors, chunky chibi proportions (big head, short body), crisp hard pixels, no anti-aliasing, no gradients, no blur, no text, no shadows on the background. Tone: cartoon horror comedy — cute characters, exaggerated violence, bright red cartoon blood. Every sprite is separated with generous empty space on ONE flat solid magenta background (#FF00FF), arranged in a clean evenly spaced grid, nothing touching or overlapping. Original characters only.

Sprite sheet for ONE character, a grid of 3 rows x 4 columns. Every sprite is the SAME character, full body, SIDE VIEW FACING RIGHT, same size and scale in every cell, feet on the same baseline. Row 1: (1) special move A wind-up, (2) special move A hit, (3) special move B wind-up, (4) special move B release. Row 2: (1) special move C wind-up, (2) special move C impact, (3) holding a weapon in a ready pose (empty hand gripping, no weapon drawn), (4) overhead swinging attack. Row 3: (1) throwing something forward overhand, (2) dodge roll curled into a ball, (3) dead body lying on the ground WITHOUT a head, red stump at the neck, (4) the severed head alone with a shocked face. Special moves: A = big meat cleaver overhead chop; B = throwing a meat hook on a chain; C = spinning 360 degrees with two cleavers out, motion circle. Character: a burly butcher with short brown hair and stubble, light blue shirt with rolled sleeves, white apron with red stains, brown trousers. Keep the exact same outfit, colors and proportions in every cell. Match the reference character's face, outfit and colors exactly (a reference image of this character is attached).
```

## B07-courier-A　外送阿明：移動與普通攻擊　★★★

上傳參考圖：外送阿明的頭像

```
STYLE (apply to everything): 16-bit SNES-era pixel art sprite sheet for a 2.5D side-scrolling beat 'em up fighting game. Bold 1-pixel dark purple outline (#1a1028) around every sprite, 3-tone cel shading with shadows shifted toward purple and highlights toward warm yellow, highly saturated colors, chunky chibi proportions (big head, short body), crisp hard pixels, no anti-aliasing, no gradients, no blur, no text, no shadows on the background. Tone: cartoon horror comedy — cute characters, exaggerated violence, bright red cartoon blood. Every sprite is separated with generous empty space on ONE flat solid magenta background (#FF00FF), arranged in a clean evenly spaced grid, nothing touching or overlapping. Original characters only.

Sprite sheet for ONE character, a grid of 4 rows x 4 columns. Every sprite is the SAME character, full body, SIDE VIEW FACING RIGHT, same size and scale in every cell, feet standing on the same baseline at the bottom of each cell. Row 1: (1) idle fighting stance, (2) idle stance breathing (slightly lower), (3) walking step A, (4) walking step B. Row 2: (1) walking step C, (2) jumping up with knees tucked, (3) flying kick in the air, (4) falling down from a jump. Row 3: (1) quick jab punch with the front fist, (2) strong cross punch with the back fist, (3) high kick, (4) getting hit, leaning back in pain. Row 4: (1) knocked flying backward through the air, (2) lying flat on the back on the ground, (3) getting up on one knee, (4) dizzy and stunned with stars around the head. Character: a skinny food delivery rider wearing a yellow helmet with a white stripe, green jacket, a big orange square delivery box backpack, dark blue jeans. Keep the exact same outfit, colors and proportions in every cell. Match the reference character's face, outfit and colors exactly (a reference image of this character is attached).
```

## B08-courier-B　外送阿明：三招與其他動作　★★★

上傳參考圖：外送阿明的頭像（或剛生好的 A 張）

```
STYLE (apply to everything): 16-bit SNES-era pixel art sprite sheet for a 2.5D side-scrolling beat 'em up fighting game. Bold 1-pixel dark purple outline (#1a1028) around every sprite, 3-tone cel shading with shadows shifted toward purple and highlights toward warm yellow, highly saturated colors, chunky chibi proportions (big head, short body), crisp hard pixels, no anti-aliasing, no gradients, no blur, no text, no shadows on the background. Tone: cartoon horror comedy — cute characters, exaggerated violence, bright red cartoon blood. Every sprite is separated with generous empty space on ONE flat solid magenta background (#FF00FF), arranged in a clean evenly spaced grid, nothing touching or overlapping. Original characters only.

Sprite sheet for ONE character, a grid of 3 rows x 4 columns. Every sprite is the SAME character, full body, SIDE VIEW FACING RIGHT, same size and scale in every cell, feet on the same baseline. Row 1: (1) special move A wind-up, (2) special move A hit, (3) special move B wind-up, (4) special move B release. Row 2: (1) special move C wind-up, (2) special move C impact, (3) holding a weapon in a ready pose (empty hand gripping, no weapon drawn), (4) overhead swinging attack. Row 3: (1) throwing something forward overhand, (2) dodge roll curled into a ball, (3) dead body lying on the ground WITHOUT a head, red stump at the neck, (4) the severed head alone with a shocked face. Special moves: A = smashing his delivery box down on someone's head; B = splashing a bowl of hot soup forward, steam; C = slamming the delivery box down and it explodes, sparks. Character: a skinny food delivery rider wearing a yellow helmet with a white stripe, green jacket, a big orange square delivery box backpack, dark blue jeans. Keep the exact same outfit, colors and proportions in every cell. Match the reference character's face, outfit and colors exactly (a reference image of this character is attached).
```

---

## B09-beach　沙灘關的道具與陷阱　★★

```
STYLE (apply to everything): 16-bit SNES-era pixel art sprite sheet for a 2.5D side-scrolling beat 'em up fighting game. Bold 1-pixel dark purple outline (#1a1028) around every sprite, 3-tone cel shading with shadows shifted toward purple and highlights toward warm yellow, highly saturated colors, chunky chibi proportions (big head, short body), crisp hard pixels, no anti-aliasing, no gradients, no blur, no text, no shadows on the background. Tone: cartoon horror comedy — cute characters, exaggerated violence, bright red cartoon blood. Every sprite is separated with generous empty space on ONE flat solid magenta background (#FF00FF), arranged in a clean evenly spaced grid, nothing touching or overlapping. Original characters only.

Sprite sheet, grid of 3 rows x 4 columns, each object centered in its cell, SIDE VIEW. Row 1: a fishing harpoon (long wooden spear with a metal barbed tip, horizontal), a pink surfboard with white stripe (horizontal), a brown coconut, a green beer bottle. Row 2: a great white shark falling nose-down from the sky with mouth wide open, a shark lying on the sand flopping (mouth closed), the same shark flopping with mouth open showing teeth, a grey shark fin sticking out of water with white ripples. Row 3: a wooden lifeguard tower, a striped beach umbrella standing in sand, a warning sign with a shark symbol, a red crab with big claws.
```

## B10-fx　特效　★★

```
STYLE (apply to everything): 16-bit SNES-era pixel art sprite sheet for a 2.5D side-scrolling beat 'em up fighting game. Bold 1-pixel dark purple outline (#1a1028) around every sprite, 3-tone cel shading with shadows shifted toward purple and highlights toward warm yellow, highly saturated colors, chunky chibi proportions (big head, short body), crisp hard pixels, no anti-aliasing, no gradients, no blur, no text, no shadows on the background. Tone: cartoon horror comedy — cute characters, exaggerated violence, bright red cartoon blood. Every sprite is separated with generous empty space on ONE flat solid magenta background (#FF00FF), arranged in a clean evenly spaced grid, nothing touching or overlapping. Original characters only.

Sprite sheet, grid of 3 rows x 4 columns, each effect centered in its cell. Row 1: white slash arc trail (small), white slash arc trail (big crescent), yellow impact hit spark star, red impact hit spark with blood drops. Row 2: ground dust shockwave ring seen from the side (flat oval), orange delivery box with a lit fuse, cartoon explosion fireball, purple-green smoke cloud. Row 3: bright red blood splash burst, small red blood puddle on the ground (flat), dizzy yellow stars circle, white water splash.
```

## B11-road　鄉間公路關（之後再生）　★

```
STYLE (apply to everything): 16-bit SNES-era pixel art sprite sheet for a 2.5D side-scrolling beat 'em up fighting game. Bold 1-pixel dark purple outline (#1a1028) around every sprite, 3-tone cel shading with shadows shifted toward purple and highlights toward warm yellow, highly saturated colors, chunky chibi proportions (big head, short body), crisp hard pixels, no anti-aliasing, no gradients, no blur, no text, no shadows on the background. Tone: cartoon horror comedy — cute characters, exaggerated violence, bright red cartoon blood. Every sprite is separated with generous empty space on ONE flat solid magenta background (#FF00FF), arranged in a clean evenly spaced grid, nothing touching or overlapping. Original characters only.

Sprite sheet, grid of 2 rows x 4 columns, SIDE VIEW facing right. Row 1: a yellow bulldozer with a spinning spiked meat-grinder drum on the front (frame A), the same bulldozer (frame B, drum rotated), a wooden road barrier, a red oil barrel. Row 2: a pitchfork lying horizontal, a wooden baseball bat, a car tire, a chainsaw.
```

## B12-city　殭屍城市關（之後再生）　★

```
STYLE (apply to everything): 16-bit SNES-era pixel art sprite sheet for a 2.5D side-scrolling beat 'em up fighting game. Bold 1-pixel dark purple outline (#1a1028) around every sprite, 3-tone cel shading with shadows shifted toward purple and highlights toward warm yellow, highly saturated colors, chunky chibi proportions (big head, short body), crisp hard pixels, no anti-aliasing, no gradients, no blur, no text, no shadows on the background. Tone: cartoon horror comedy — cute characters, exaggerated violence, bright red cartoon blood. Every sprite is separated with generous empty space on ONE flat solid magenta background (#FF00FF), arranged in a clean evenly spaced grid, nothing touching or overlapping. Original characters only.

Sprite sheet, grid of 2 rows x 4 columns, SIDE VIEW facing right. Row 1: a green cartoon zombie walking with arms forward (frame A), the same zombie (frame B), a zombie lunging to bite, a zombie lying dead. Row 2: a street lamp, a metal trash can, a fire hydrant, a traffic cone.
```

---

## 生好之後

圖放進 `pic` 資料夾，跟我說「圖放好了」，並告訴我哪張是哪個編號（或照編號命名）。我會切圖、去背，把程式畫的角色換成正式的美術圖。
