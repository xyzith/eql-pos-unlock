# eql-pos-unlock

靜態頁。用 EverQuest Legends 的成就匯出和裝備匯出，看 Plane of Sky 十六個職業解鎖還缺哪些交物。

這兩個檔只在這台瀏覽器裡讀，不會送出。

開頁：<https://xyzith.github.io/eql-pos-unlock/>

本地：

```bash
python3 -m http.server 8765
```

然後開 <http://127.0.0.1:8765/>。不要用 `file://`。

成就檔：遊戲裡打 `/outputfile achievements`，不要加 Complete。安裝目錄寫出 `*-Achievements.txt`。

裝備檔：`/outputfile inventory`，也就是 `/output inventory`。安裝目錄寫出 `*-Inventory.txt`。銀行和 KeyRing 都算持有。

只選一個也能看，頁面會寫哪裡不準。畫面上的名字是要交的材料。銀行裡的成品不會把材料算成已有。已解完的職業要靠成就檔才會從清單拿掉。

目錄是 `catalog.json`。改掉落就改那份檔。

測試：`node --test`
