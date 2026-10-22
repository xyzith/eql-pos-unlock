# eql-pos-unlock

日期：2026-10-21  
狀態：已核准。工作清單是 `docs/superpowers/plans/2026-10-22-eql-pos-unlock.md`。  
範圍：獨立靜態頁。使用者在瀏覽器裡選 EverQuest Legends 的成就匯出和裝備匯出，頁面列出 Plane of Sky 職業解鎖還沒交的東西。  
不在 family-bot 裡。不讀 personal-bot，不部署到 agent。

來源清單是 personal console 檢視頁 `cafb8749-7d8d-4ef8-b0c5-dae824a9d4ec` 的十六職業正文。那份正文對過這台電腦的 `Eland_freeport-Achievements.txt`：95 個獎勵名都有對應的 Obtain。成就檔多出來的名字只有 Beastlord 的 Spirit Render，它和 Windhowl 是同一筆試煉。

## 問題

職業解鎖的進度在兩份客戶端匯出裡，單看一份會算錯。成就檔的 Obtain 勾了，代表試煉已交，獎勵之後刪掉也算完成。裝備檔看得到已經拿在身上、包包、銀行或 KeyRing 的交物，但看不出哪些已經交過又刪了。兩份一起讀，才分得出「還沒打」、「拿了一部分」、「齊了還沒交」。

## 目標與成功標準

1. 公開 repo `xyzith/eql-pos-unlock`。GitHub Pages 從 `main` 根目錄提供這一頁。
2. 頁面能讀 `*-Achievements.txt` 和 `*-Inventory.txt`。檔案只在瀏覽器裡解析。
3. 兩個分頁：依職業、依島。依職業是預設。
4. 成就與裝備都有時：職業列是 C 的不展開；職業列是 I 的沒勾 Obtain 展開成交物，並標已有或還缺。齊了還沒交的不進島頁。
5. 只選一個檔仍出清單，並顯示下面決策 7 的那句。
6. `node --test` 用短假檔覆蓋決策 9 列出的情況。真實匯出不進 git。
7. 實作完成後用靜態伺服器打開頁面，載入一組成對的假檔，確認職業頁和島頁跟 `diff` 的結果一致。

## 非目標

- 島鑰、Conqueror、神祇解鎖、種族解鎖
- 獎勵的屬性、效果、wiki 全文
- 一次比較多個角色，或把結果存回伺服器
- 開頁時再抓 eqlegendstools 或 eqlwiki
- 在頁面上編輯目錄
- family-bot、personal console、成就同步、裝備同步

## 決策

### 1. Repo 與頁面

本機目錄 `/home/lain/workspace/eql-pos-unlock`。`gh repo create eql-pos-unlock --public`，擁有者 `xyzith`。Pages 用 `main` 的 `/`。沒有建置步驟。`catalog.json` 用相對網址載入，所以用 Pages 或靜態伺服器打開。`file://` 不在支援範圍。

檔案：

| 檔 | 職責 |
| --- | --- |
| `index.html` | 兩個檔案欄、分頁、結果 |
| `site.css` | 版面 |
| `catalog.json` | 95 筆試煉與十個出處 |
| `src/parse.js` | 兩種 txt |
| `src/diff.js` | 對名字、算狀態、分組 |
| `src/app.js` | 畫面。不在 `node --test` 裡 |
| `package.json` | `"type": "module"`，`"test": "node --test"`，沒有依賴 |
| `test/diff.test.js` | 假檔與目錄形狀 |
| `test/fixtures/` | 短 txt |
| `README.md` | 怎麼開、檔案不離機 |

介面繁中。道具、怪物、NPC 用遊戲裡的英文。`<html lang="zh-Hant">`。

檔案欄旁固定這句：「這兩個檔只在這台瀏覽器裡讀，不會送出。」選了新檔就換掉同一個欄位裡的舊檔。欄位下顯示檔名。

### 2. 目錄

`catalog.json`：

```json
{
  "drops": [
    { "id": "protector", "label": "Protector of Sky" },
    { "id": "gorgalosk", "label": "Gorgalosk" },
    { "id": "keeper", "label": "Keeper of Souls" },
    { "id": "spiroc", "label": "The Spiroc Lord" },
    { "id": "bazzt", "label": "Bazzt Zzzt" },
    { "id": "sister", "label": "Sister of the Spire" },
    { "id": "eye", "label": "Eye of Veeshan" },
    { "id": "isle7trash", "label": "Sphinx、Drakes、Undine Spirits" },
    { "id": "bees", "label": "bees" },
    { "id": "efreeti", "label": "Noble Dojorn、Overseer of Air、the Hand of Veeshan" }
  ],
  "tests": [
    {
      "class": "Shadow Knight",
      "npc": "Sarkis Ebonblade",
      "rewards": ["Khyldorn the Blood Drinker"],
      "rune": "Wind Rune Kala",
      "items": [{ "name": "Efreeti War Spear", "drop": "efreeti" }]
    }
  ]
}
```

`drops` 的順序就是島頁的順序。風之符文不在 `drops` 裡，島頁最後另成一段，標題是「雜兵」。

十六個職業、筆數、NPC：

| 職業 | NPC | 筆數 |
| --- | --- | --- |
| Bard | Cilin Spellsinger | 6 |
| Beastlord | Animist Kratho | 5 |
| Berserker | Stragen The Hewer | 6 |
| Cleric | Josin Faithbringer | 6 |
| Druid | Strandar Pinemist | 6 |
| Enchanter | Enchanter Jolas | 6 |
| Magician | Magus Frinon | 7 |
| Monk | Holwin | 6 |
| Necromancer | Drakis Bloodcaster | 6 |
| Paladin | Dason Goldblade | 4 |
| Ranger | Ranger Spirit | 6 |
| Rogue | Thalik Silenthand | 6 |
| Shadow Knight | Sarkis Ebonblade | 7 |
| Shaman | Medicine Man Veetra | 6 |
| Warrior | Torgon Blademaster | 6 |
| Wizard | Wizard Schrock | 6 |

Beastlord 的 Windhowl 那筆 `rewards` 是 `["Windhowl", "Spirit Render"]`。交物仍是 Brass Knuckles、Mithril Bands、Sphinx Claw。其餘每筆一個獎勵名。

出處從檢視頁裡帶「掉落」的那句抄。同一件交物後面省略掉落的，沿用有掉落的那句。Druid 的 Efreeti Statuette 那句是小寫的三隻 Efreeti 王，`drop` 用 `efreeti`。每筆都有 `rune`，也都至少一件 `items`。獎勵名在整份目錄裡不重複。同一件交物的名字只對一個 `drop`。`drop` 必須是上面十個 `id` 之一。

目錄不收屬性、效果、網址。

### 3. 成就檔

UTF-8。有 BOM 就去掉。LF 與 CRLF 都接受。解不出 UTF-8：整份失敗。

空行略過。不以 `C` 或 `I` 開頭的列略過，例如 `Untapped Potential: Classes`。

以 `C` 或 `I` 開頭的列用 tab 拆開，去掉列尾一個空欄之後：

- 兩欄：`C` 或 `I`，加上名稱。名稱以 `Primary Class Unlock - ` 開頭的是職業列。其餘兩欄略過，例如種族解鎖。
- 三欄，而且中間那欄是空的：子列。文字以 `Obtain ` 開頭的才用。其餘子列略過，包含 Token 和 “confirm your Primary Class”。
- 其他形狀：整份失敗。

職業名是前綴後面的原文，例如 `Shadowknight`。子列跟著上方最近的職業列。檔案裡沒有任何 `C`／`I` 加 tab 的列：整份失敗。有這種列、但沒有任何職業列：解析成功，職業陣列是空的。

一個職業的結果是：列上的 `C` 或 `I`、原始職業名、Obtain 子列。每條子列留著 `C` 或 `I` 和原始文字。

### 4. 裝備檔

UTF-8。有 BOM 就去掉。LF 與 CRLF 都接受。解不出 UTF-8：整份失敗。

第一列去掉列尾空欄之後必須正好是 `Location`、`Name`、`ID`、`Count`、`Slots`。否則整份失敗。

其後每列先去掉一個列尾空欄，再要求五欄，直到空行或檔尾。`ID` 與 `Count` 必須是非負整數，否則整份失敗。`Slots` 不使用。`Name` 是 `Empty`，或 `Count` 是 0 的列不算持有。

空行之後可以什麼都沒有。若還有內容，下一個非空列去掉列尾空欄之後必須正好是 `KeyRing`、`Name`、`ID`。否則整份失敗。接著每列去掉列尾空欄之後正好三欄。`Name` 是 `Empty` 的不算持有。KeyRing 沒有數量，其餘的名字算持有。這裡再出現空行就略過。

持有集合是名字，不是數量。同一名字出現多次仍是持有。寵物裝備和 Currencies 裡的符文不會出現在這份匯出，這是客戶端限制，不另做解析。畫面寫「寵物身上的裝備不會被統計到。」和「Currencies的符文不會被統計到。」Dragon's Hoard 若在第一段五欄表裡，沿用同一套持有規則。獎勵名出現在裝備檔，代表那筆試煉已解過。它不把對應的交物算成已有，較長的成品名也不等於較短的材料名。成品不在裝備檔裡時，看不出是沒打過還是解完刪掉，這種要靠成就檔。

### 5. 對名字

道具名：

1. 去掉頭尾空白。
2. 把 `` ` ``、`'`、`’`、`‘`、`´` 換成 `'`。
3. 從尾端去掉一個 ` (Exaltation)` 和一個空白加 `+` 加十進位整數，各至多一次。現在貼在尾端的那個先去。
4. 去掉之後是空的：該列不算持有，裝備檔不因此失敗。
5. 英文大小寫不分。內部空白保留。

職業名另做一步：去掉全部空白，再不分大小寫。`Shadowknight` 對到 `Shadow Knight`。

Obtain 的正文是去掉前綴 `Obtain ` 和一個結尾句點之後的文字。先把整句依道具名規則對「該職業、且只有一個獎勵名」的試煉。對不上，再依 ` and ` 拆開，每一段各自正規化，對「該職業、獎勵名集合相同」的試煉。集合不分順序。對到兩筆以上，或對到零筆：這條 Obtain 算目錄沒有。不跨職業對。

### 6. 怎麼算還缺

成就檔有讀到，而且裡面有職業列時：

- 職業列是 C：這個職業已完成。底下沒勾的 Obtain 不列出。已完成數加一。
- 職業列是 I，而且每條 Obtain 都是 C：職業頁留這個職業，註記「試煉都勾了，職業列仍是未完成。」不列入已完成數。
- 職業列是 I，職業名對不到目錄：註記「目錄沒有這個職業：」加檔案裡的職業名。不展開 Obtain。
- 職業列是 I，其他情況：每條沒勾的 Obtain 展開。勾了的不展開。對到目錄、而且獎勵都沒持有的，列出該筆的每件交物和符文。對不到的，一行列「目錄沒有：」加原始 Obtain 文字，不編交物。
- 職業列是 I，沒勾的 Obtain 對到目錄，而且該筆任一獎勵名已持有：這條不展開。這個職業因此沒有還要列的試煉時，算已完成，已完成數加一，不留職業塊。目錄沒有的 Obtain 仍要留。

有裝備檔、而且這筆獎勵都沒持有時，對到目錄的試煉用三個狀態：

- 交物和符文全部持有：`ready`，畫面「齊了還沒交」。
- 持有其中一部分：`partial`，畫面「持有一部分」。
- 都沒持有：`none`，畫面「都還沒有」。

獎勵已持有的試煉不套這三態，直接當成解過，不進職業頁，也不進島頁。

每一件再標 `have`（已有）或 `need`（還缺）。沒有裝備檔時，狀態和件別標記都是空的，畫面不寫這三句，也不寫已有／還缺。島頁把這些件都當成還缺。

只有裝備檔時：獎勵沒持有的試煉都參與，持有規則同上。一個職業的每一筆獎勵都還在身上時，這個職業已完成，已完成數加一，不留職業塊。已完成數會顯示。橫幅仍寫已解完又刪掉的算還缺。

島頁只收還缺的件。`ready` 的試煉不進島頁。同一段裡，同一件道具只列一次；需要它的職業和獎勵名併在該列。順序照目錄：職業表的順序，然後該職業的試煉順序。段的順序照 `drops`，最後是「雜兵」。沒有列的段不顯示。一個列都沒有時，島頁寫「沒有還缺的交物。」

職業塊的順序照目錄的職業表。目錄沒有的職業，以及「試煉都勾了」的職業，排在後面，順序照成就檔。一塊裡面的試煉照該檔 Obtain 的順序。

職業頁沒有任何職業塊，而且已完成數有顯示時，寫「沒有還沒完成的試煉。」

裝備檔裡對不到目錄的名字不顯示。

### 7. 少檔與讀失敗

| 情況 | 清單 | 已完成數 | 額外句子 |
| --- | --- | --- | --- |
| 兩個都沒選 | 不出 | 不顯示 | 無 |
| 只有成就，讀成功，且有職業列 | 出 | 顯示 | 沒有裝備清單。看不出哪些已經持有，下面每件都先當成還缺。 |
| 只有裝備，讀成功 | 出 | 顯示。只計每個試煉的成品都還在身上的職業 | 沒有成就清單。已解完又刪掉的也算還缺。 |
| 成就失敗，裝備成功 | 照只有裝備 | 顯示，同只有裝備 | 再加「成就清單沒讀到。」 |
| 裝備失敗，成就成功且有職業列 | 照只有成就 | 顯示 | 再加「裝備清單沒讀到。」 |
| 兩份都失敗 | 不出 | 不顯示 | 兩句「沒讀到。」 |
| 成就成功但沒有職業列 | 不出 | 不顯示 | 這份成就檔裡沒有職業解鎖。裝備檔即使有讀到，也不另出缺件清單。裝備檔若失敗，再加「裝備清單沒讀到。」 |

「沒讀到。」的全句是「成就清單沒讀到。」和「裝備清單沒讀到。」

### 8. 畫面上的句子

這些句子用上面的字，不改寫：

- 這兩個檔只在這台瀏覽器裡讀，不會送出。
- 沒有裝備清單。看不出哪些已經持有，下面每件都先當成還缺。
- 沒有成就清單。已解完又刪掉的也算還缺。
- 成就清單沒讀到。
- 裝備清單沒讀到。
- 這份成就檔裡沒有職業解鎖。
- 試煉都勾了，職業列仍是未完成。
- 目錄沒有這個職業：
- 目錄沒有：
- 已完成 N 個職業
- 沒有還沒完成的試煉。
- 沒有還缺的交物。
- 齊了還沒交
- 持有一部分
- 都還沒有
- 已有
- 還缺
- 雜兵
- 依職業
- 依島
- 交給
- 寵物身上的裝備不會被統計到。
- Currencies的符文不會被統計到。

職業塊顯示目錄裡的職業名和 NPC。「交給」接 NPC。件別旁邊的出處用 `drops.label`，符文的出處寫「雜兵」。

### 9. `diff` 的結果

`src/diff.js` 輸出這個物件。測試斷言它，不斷言 DOM。

```json
{
  "banners": [],
  "showList": false,
  "completed": null,
  "classes": [],
  "islands": []
}
```

`showList` 為 false 時，`classes` 與 `islands` 是空陣列，`completed` 是 null。

`completed` 是數字時，畫面寫「已完成 N 個職業」。

職業塊：

```json
{
  "name": "Warrior",
  "npc": "Torgon Blademaster",
  "note": null,
  "tests": [
    {
      "rewards": ["Pauldrons of the Blue Sky"],
      "status": "partial",
      "unmatched": null,
      "lines": [
        {
          "name": "Spiroc Air Totem",
          "kind": "item",
          "mark": "have",
          "source": "The Spiroc Lord"
        },
        {
          "name": "Wind Rune Beza",
          "kind": "rune",
          "mark": "need",
          "source": "雜兵"
        }
      ]
    }
  ]
}
```

`status` 是 `ready`、`partial`、`none`，或沒有裝備檔時的 null。`mark` 同樣可以是 null。`note` 有字時，`tests` 是空的。`unmatched` 有字時，那一筆沒有 `lines`，`status` 是 null。

島頁一段：

```json
{
  "title": "雜兵",
  "rows": [
    {
      "name": "Wind Rune Beza",
      "kind": "rune",
      "holders": [
        { "class": "Warrior", "rewards": ["Pauldrons of the Blue Sky"] }
      ]
    }
  ]
}
```

### 10. 測試

`node --test`。假檔都放在 `test/fixtures/`。目錄形狀用真正的 `catalog.json`。比對用測試裡的小目錄，除了最後一項。

- 職業列 C，底下 Obtain 是 I：該職業不出現，已完成數包含它。
- 職業列 I：Obtain 是 C 的不出現，Obtain 是 I 的展開。Token 與 confirm 子列不產生試煉。
- `Obtain Windhowl and Spirit Render` 對到 rewards 含這兩個名字的同一筆。
- `Shadowknight` 對到 `Shadow Knight`。
- `` Al`Kabor's Cap of Binding `` 對到 `Al'Kabor's Cap of Binding`。
- 裝備列的 `+N`、`(Exaltation)`、反引號算持有。`Empty` 與數量 0 不算。
- 空行後的 KeyRing 三欄算持有。KeyRing 表頭多一個空欄可以。
- 交物齊了：`status` 是 `ready`，島頁沒有那些件。一部分、都沒有：島頁只有 `need`。
- 只有成就：決策 7 的那句，件別 `mark` 是 null，島頁仍列出那些件。
- 只有裝備：決策 7 的那句，獎勵已持有的試煉不出現。一個職業每一筆都這樣時計入 `completed`。還沒解的試煉裡，目錄有而裝備檔沒有的件是 `need`。持有成品不把材料標成 `have`。
- 任一獎勵名在持有集合（含 `+N`、`(Exaltation)`）：該試煉從職業頁和島頁拿掉。同一職業只解了一部分時，其餘試煉還在，這個職業不計入已完成數。只持有材料、沒持有成品：試煉還在。
- 成就檔把該筆標成未完成，但成品在裝備檔：仍拿掉。職業列 C 只計一次。
- 瀏覽器 `localStorage` 留兩份原文和檔名。再上傳同一欄只覆寫那一欄。解不出 UTF-8 時那一欄改存空字串。
- 成就檔沒有 C／I 加 tab：失敗句，不納入。
- 成就檔有 C／I 列但沒有 `Primary Class Unlock`：只有「這份成就檔裡沒有職業解鎖。」，`showList` 是 false。旁邊有一份讀得動的裝備檔時也一樣。
- 裝備檔表頭不對，或資料列欄數不對：失敗句，不納入。
- 對不到的 Obtain：`unmatched` 是「目錄沒有：」加原始文字。
- 對不到的職業名：`note` 是「目錄沒有這個職業：」加檔案裡的名字。
- 裝備檔多出來的名字不出現在 `classes` 或 `islands`。
- 職業列 I 且 Obtain 全是 C：`note` 是「試煉都勾了，職業列仍是未完成。」
- `catalog.json`：十六個職業、95 筆、上表的筆數與 NPC、Windhowl 的 rewards 含 Spirit Render、每筆都有符文和至少一件交物、每個 `drop` 都在十個 id 裡、獎勵名不重複、同一件交物名字只對一個 `drop`。

### 11. 顏色

道具（交物、符文）`#e0b15a`。裝備（獎勵名）`#e4d8ff`。怪物（出處，含雜兵）`#d08080`。交給的 NPC `#c4a6e0`。主控台把獎勵和交物塗成同一種金；這一頁把獎勵分開，裝備用主控台標詞的淡紫。
