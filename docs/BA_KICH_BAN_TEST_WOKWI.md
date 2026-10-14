# Ba ca kiem thu Wokwi - he thong tuoi mot ESP32

Tai lieu thao tac cho `diagram.json`, `src/main.cpp` va cau hinh `esp32doit-devkit-v1` hien tai. Ghi ket qua thuc te sau khi chay; cac muc duoi day la **ket qua mong doi**, chua phai bien ban da dat.

## Chuan bi chung

1. Build bang `Ctrl+Shift+B` hoac `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/build.ps1 -Environment esp32doit-devkit-v1`.
2. Trong VS Code, **Stop Simulator**, sau do **Wokwi: Start Simulator** de nap lai firmware va `diagram.json`. Mo Serial Monitor o **115200 baud**.
3. Dat bien tro `potSoil` (DO AM DAT) 50%, `pot1` (MUA) 0%. Cong tac `sw1` o AUTO. Neu dung lenh Serial, `a` = AUTO, `m` = MANUAL, `p` = bat/tat bom tay, `s` = in trang thai, `l` = nhat ky.
4. Xac nhan ban dau: LCD hien `AUTO BOM:OFF`; relay NO mo; goc `pump1` dung yen trong vai giay. Serial phai bat dau moi dong tu le trai nhu mau:

   ```text
   [INFO] He thong san sang | WOKWI

   [INFO] TRANG THAI | 3s
     Dat: 50% | Mua: 0% (KHONG MUA)
     Nhiet do: 24.0 C | Do am KK: 40.0%
     Che do: AUTO | Bom: TAT
   ```

   So do va thoi gian co the khac mau. Firmware in khi co thay doi, khi go `s`, va nhac lai moi 30 giay; khong in trang thai moi vong `loop()`.

## Ca 1 - AUTO: dat kho bat bom, dat du am tat bom

**Bat dau:** mưa 0%, AUTO, dat 50%, bom OFF.

| Buoc | Thao tac | Ket qua mong doi |
|---|---|---|
| 1 | Van `potSoil` xuong khoang 20% (<35%) | Trong toi da 0,5 giay doc cam bien, relay NO dong, LCD `AUTO BOM:ON`, `pump1` quay. Serial: `[INFO] Bom BAT | ly do: dat kho`. |
| 2 | Van `potSoil` len khoang 70% (>=60%) truoc 20 giay | Relay NO mo, LCD `AUTO BOM:OFF`, goc motor dung thay doi. Serial: `[INFO] Bom TAT | ly do: dat du am`. |
| 3 | Go `s` | Mot khoi `TRANG THAI` moi, `Dat` gan 70% va `Bom: TAT`. |

**Dat neu:** dong thoi dung ca relay, LCD, motor va Serial. [ ] Dat [ ] Chua dat. Anh/log: __________

## Ca 2 - Mua: dung bom va thong bao dat tang

**Bat dau:** Stop/Start Simulator, mưa 0%, AUTO. Dat `potSoil` khoang 20% de bom dang chay. Neu tiep tuc ngay sau ca 1, cho du **10 giay nghi AUTO** sau lan tat bom.

| Buoc | Thao tac | Ket qua mong doi |
|---|---|---|
| 1 | Van `pot1` len khoang 80% (>=50%) | LED do sang; relay mo; motor dung; LCD `MUA ... BOM:OFF`. Serial co `[WARN] Phat hien troi mua` va `[WARN] Bom TAT | ly do: troi mua`. |
| 2 | Giu mưa 80%, tang `potSoil` tu 20% len 30% | Serial co `[INFO] Mua lam do am dat tang`; bom van OFF. Thong bao xuat hien khi dat tang it nhat 5 diem phan tram ke tu moc thong bao truoc. |
| 3 | Van `pot1` ve 0% (<=40%) | LED do tat; Serial co `[INFO] Troi da tanh`; bom khong tu bat neu dat da >=35%. |

**Dat neu:** bom tat khi mua, motor dung, LED va thong bao dung. [ ] Dat [ ] Chua dat. Anh/log: __________

## Ca 3 - MANUAL: chan dat uot, bat/tat tay va nhat ky

**Bat dau:** Stop/Start Simulator, mưa 0%. Gui `m` qua Serial hoac gat `sw1` sang MANUAL; xac nhan `[INFO] Che do: MANUAL`.

| Buoc | Thao tac | Ket qua mong doi |
|---|---|---|
| 1 | Dat `potSoil` 70%, doi 0,7 giay, gui `p` | Serial `[WARN] Tu choi bat bom: dat da du am`; relay mo, motor dung. |
| 2 | Dat `potSoil` 50%, doi 0,7 giay, gui `p` hoac nhan `btn1` | Serial `[INFO] Bom BAT | ly do: bat tay`; relay dong, LCD `MAN  BOM:ON`, motor quay. |
| 3 | Gui `p` hoac nhan `btn1` lan nua truoc 20 giay | Serial `[INFO] Bom TAT | ly do: tat tay`; motor dung, LCD `MAN  BOM:OFF`. |
| 4 | Gui `l` | `[INFO] NHAT KY TUOI` co mot luot MANUAL, thoi diem bat, so giay chay, dat truoc/sau va ly do `bat tay -> tat tay`. |

**Dat neu:** lenh dat uot bi chan, bom bat/tat dung va nhat ky co ban ghi. [ ] Dat [ ] Chua dat. Anh/log: __________

## Kiem tra terminal va reset

- Moi dong `[INFO]`/`[WARN]` va dong trang thai phai bat dau o le trai; chi cac dong du lieu duoc thut vao 2 dau cach. Neu van lech, Stop/Start Simulator sau khi build de nap firmware moi.
- Dong `ets Jul 29 2019...` va `rst:0x1 (POWERON_RESET)` la thong bao khoi dong cua ESP32, khong phai dong firmware co the dinh dang. Neu chung lap lai **khi khong bam Restart/Stop-Start**, ghi lai thoi diem, thao tac truoc do va toan bo log de tim nguyen nhan reset; dung danh dau ca test Dat khi motor hoac firmware tu khoi dong lai.
- File `wokwi-scenarios/core.test.yaml` mo ta ba chuoi thao tac tu dong; ket qua dien vao cac o tren can kiem chung bang lan chay Wokwi thuc te.
