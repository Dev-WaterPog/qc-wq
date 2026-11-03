# ความเสี่ยงคุณภาพน้ำ โครงการ WTP

Dashboard ประเมินความเสี่ยงคุณภาพน้ำจากผลแลป (pH, TDS, ความขุ่น) ของแต่ละโครงการ
หน้าเว็บคือไฟล์ `index.html` ไฟล์เดียว เปิดในเบราว์เซอร์ได้เลย หรือดูผ่าน GitHub Pages

## เกณฑ์

| ค่า | ผ่านเกณฑ์ | เฝ้าระวัง |
|---|---|---|
| pH | 6.5–8.5 | ต่ำกว่า 6.8 หรือสูงกว่า 8.2 |
| TDS | ≤ 600 mg/L | ตั้งแต่ 480 mg/L |
| ความขุ่น | ≤ 5 NTU | ตั้งแต่ 4 NTU |

ระดับของโครงการประเมินจากค่าน้ำผ่านกรองจากผลแลป เกณฑ์อยู่ใน `app/src/lib/quality.ts`

## อัปเดตข้อมูล

ต้องมี Python (`pip install openpyxl`) และ Node.js วางไฟล์ Excel ใหม่ในโฟลเดอร์นี้ แล้วรัน

```bash
python build_dashboard.py
```

สคริปต์จะอ่านไฟล์ `.xlsx` ที่ใหม่ที่สุด แล้ว build `index.html` ใหม่ จากนั้น commit และ push เพื่ออัปเดตหน้า GitHub Pages

## พัฒนา

```bash
cd app
npm install
npm run dev
```

โค้ดเป็น React + TypeScript (Vite) อยู่ใน `app/`
