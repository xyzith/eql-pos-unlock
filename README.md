# eql-pos-unlock

靜態頁。用 EverQuest Legends 的成就匯出和裝備匯出，看 Plane of Sky 十六個職業解鎖還缺哪些交物。

這兩個檔只在這台瀏覽器裡讀，不會送出。上次選的檔會留在這台瀏覽器，再上傳同一欄會換成新的。

開頁：<https://xyzith.github.io/eql-pos-unlock/>

本地：

```bash
python3 -m http.server 8765
```

然後開 <http://127.0.0.1:8765/>。不要用 `file://`。

`/outputfile achievements` 產生 `*-Achievements.txt`

`/outputfile inventory` 產生 `*-Inventory.txt`

寵物身上的裝備不會被統計到。

只選一個也能看，頁面會寫哪裡不準。身上有成品，那筆試煉算解過。材料不會因為有成品就變成已有。成品刪掉之後，要靠成就檔才會從清單拿掉。

目錄是 `catalog.json`。改掉落就改那份檔。

測試：`node --test`
