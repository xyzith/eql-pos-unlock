# eql-pos-unlock

靜態頁。用 EverQuest Legends 的成就匯出和裝備匯出，看 Plane of Sky 十六個職業解鎖還缺哪些交物。

這兩個檔只在這台瀏覽器裡讀，不會送出。

開頁：<https://xyzith.github.io/eql-pos-unlock/>

本地：

```bash
python3 -m http.server 8765
```

然後開 <http://127.0.0.1:8765/>。不要用 `file://`。

成就檔是遊戲的 `*-Achievements.txt`。裝備檔是 `*-Inventory.txt`。只選一個也能看，頁面會寫哪裡不準。

目錄是 `catalog.json`。改掉落就改那份檔。

測試：`node --test`
