# Laundry MJU — ระบบจัดการร้านซักรีดออนไลน์

ระบบรับ-ส่งผ้าซักรีดครบวงจร เชื่อมลูกค้า พนักงานร้าน ไรเดอร์ และผู้ดูแลระบบ
เข้าด้วยกันบนเว็บเดียว พร้อมติดตามสถานะออเดอร์และตำแหน่งไรเดอร์แบบเรียลไทม์

🔗 **Live demo:** https://laudryproject-improvefromprojectgro.vercel.app
🔗 **API:** https://laundry-shop-api.onrender.com/api

---

## About

ร้านซักรีดทั่วไปรับออเดอร์ผ่านโทรศัพท์หรือแชท ทำให้ลูกค้าไม่รู้ว่าผ้าอยู่ขั้นตอนไหน
ร้านจดคิวมือ และไม่มีข้อมูลสรุปยอดขาย โปรเจกต์นี้แก้ปัญหาโดยย้ายทั้งกระบวนการ
ขึ้นเว็บ ตั้งแต่ลูกค้าสร้างออเดอร์และปักหมุดที่อยู่ ไรเดอร์รับงานและนำทางด้วยแผนที่
พนักงานร้านอัปเดตสถานะซัก-อบ ไปจนถึงผู้ดูแลระบบดูสรุปรายได้

ผู้ใช้แบ่งเป็น 4 บทบาท แต่ละบทบาทเห็นหน้าจอและสิทธิ์ต่างกัน

| บทบาท | ใช้ทำอะไร |
| --- | --- |
| **Customer** | สร้างออเดอร์ แนบรูปผ้า ปักหมุดที่อยู่ ติดตามสถานะ ดูประวัติ จ่ายผ่าน Wallet |
| **Rider** | รับงาน นำทางด้วยแผนที่ อัปเดตสถานะรับ-ส่ง ส่งตำแหน่งเรียลไทม์ |
| **Employee** | ดูออเดอร์ของร้าน กดเริ่มซัก/ซักเสร็จ/อบเสร็จ ขอเข้าร่วมร้าน |
| **Admin** | อนุมัติร้านและพนักงาน จัดการผู้ใช้ทุกบทบาท ปักหมุดร้าน ดูสรุปรายได้ |

## Features

- **ระบบสมาชิก 4 บทบาท** — สมัคร/เข้าสู่ระบบด้วย JWT (access + refresh token), แฮชรหัสผ่านด้วย Argon2, ลืมรหัสผ่านผ่านอีเมล
- **สร้างและติดตามออเดอร์** — เลือกประเภทซัก/อบ แนบรูปได้สูงสุด 10 รูป นัดรับทันทีหรือตั้งเวลา
- **แผนที่และคำนวณค่าส่ง** — ปักหมุดจุดรับ-ส่งบน OpenStreetMap, คำนวณระยะทางและเส้นทางถนนจริงผ่าน OSRM/Valhalla, ค้นหาร้านใกล้เคียงด้วย geospatial query
- **ติดตามไรเดอร์เรียลไทม์** — ส่งตำแหน่งและอัปเดตสถานะออเดอร์ผ่าน WebSocket (Socket.IO) แยกห้องตามผู้ใช้/ร้าน/บทบาท
- **สถานะงานครบวงจร** — pending → accepted → picked_up → washing → drying → completed พร้อมยกเลิกได้
- **จัดการร้านและพนักงาน** — พนักงานส่งคำขอเข้าร่วมร้าน แอดมินอนุมัติ/ปฏิเสธ
- **Wallet และคูปอง** — เติมเงิน จ่ายค่าบริการ ใช้คูปองส่วนลด เก็บประวัติธุรกรรม *(เติมเงินเป็นการจำลอง ยังไม่ต่อ payment gateway)*
- **Dashboard สรุปยอด** — รายได้รวม รายได้วันนี้ จำนวนออเดอร์ตามสถานะ
- **รีวิวและให้คะแนน** — ลูกค้ารีวิวร้านและไรเดอร์
- **อัปโหลดรูปขึ้น Cloudinary** — รูปไม่หายเมื่อ redeploy พร้อมย่อขนาดอัตโนมัติ

## Tech Stack

**Frontend** — Next.js 16.1.6 (App Router) · React 19.2.3 · TypeScript 5 · Tailwind CSS 4 · Leaflet 1.9 + react-leaflet 5 · socket.io-client 4.8

**Backend** — NestJS 11 · TypeScript · Mongoose 9 · Passport + JWT · Argon2 · Socket.IO 4.8 · class-validator · Helmet · Throttler · Nodemailer · Cloudinary SDK 2.11

**Database** — MongoDB Atlas (7 collections, ใช้ 2dsphere index สำหรับค้นหาตามพิกัด)

**Deploy** — Frontend บน Vercel · Backend บน Render (Blueprint / render.yaml) · รูปภาพบน Cloudinary

## Screenshots

> ยังไม่มีภาพประกอบในรีโป — เพิ่มไฟล์ไว้ที่ `docs/screenshots/` แล้วลิงก์ตรงนี้
> แนะนำ: หน้าสร้างออเดอร์ของลูกค้า, หน้าแผนที่ไรเดอร์, Dashboard ของแอดมิน

## How to run

ต้องมี Node.js 22, บัญชี MongoDB Atlas และ (ถ้าต้องการให้รูปไม่หาย) บัญชี Cloudinary

```bash
git clone https://github.com/DolVolo/laundry-mju.git
cd laundry-mju
```

**1) Backend — พอร์ต 3000**

```bash
cd backend
cp .env.example .env     # ใส่ MONGO_URI และ JWT secrets
npm install
npm run start:dev
```

**2) Frontend — พอร์ต 3001**

```bash
cd frontend
cp .env.example .env.local    # ตั้ง NEXT_PUBLIC_API_URL=http://localhost:3000
npm install
npm run dev -- -p 3001
```

ต้องใช้พอร์ต 3001 เพราะ CORS allowlist ใน `backend/src/main.ts` กำหนดไว้

### Environment variables

`backend/.env` — ดูตัวอย่างเต็มที่ [backend/.env.example](backend/.env.example)

| ตัวแปร | คำอธิบาย |
| --- | --- |
| `MONGO_URI` | MongoDB Atlas connection string (ใส่ชื่อ database ด้วย) |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | สตริงสุ่มความยาวมาก |
| `JWT_ACCESS_EXPIRATION` / `JWT_REFRESH_EXPIRATION` | หน่วยวินาที (900 / 604800) |
| `FRONTEND_URL` | รายการ origin ที่อนุญาต CORS คั่นด้วย comma |
| `CLOUDINARY_URL` | ที่เก็บรูป ถ้าไม่ตั้งจะเขียนลงดิสก์ (หายเมื่อ redeploy) |
| `GMAIL_USER` / `GMAIL_APP_PASSWORD` / `MAIL_FROM` | อีเมลสำหรับลืมรหัสผ่าน |
| `MONGO_AUTO_INDEX` | `false` เพื่อข้ามการสร้าง index ตอนเริ่มระบบ |

`frontend/.env.local` — ดู [frontend/.env.example](frontend/.env.example)

| ตัวแปร | คำอธิบาย |
| --- | --- |
| `NEXT_PUBLIC_API_URL` | URL ของ API ไม่ต้องมี `/` หรือ `/api` ต่อท้าย |

## Project structure

```
backend/                NestJS REST API + WebSocket gateway
  src/auth/             สมัคร เข้าสู่ระบบ JWT guards และ strategies
  src/users/            โมดูลแยกตามบทบาท customer / rider / employee / admin
  src/map/              ร้านค้า ที่อยู่ ระยะทาง ค่าส่ง เส้นทางถนน
  src/orders/           schema และ controller ของออเดอร์
  src/realtime/         Socket.IO gateway แจ้งเตือนออเดอร์
  src/storage/          อัปโหลดรูปขึ้น Cloudinary (fallback เป็นดิสก์)
frontend/               Next.js App Router
  app/customer/         หน้าฝั่งลูกค้า
  app/rider/            หน้าฝั่งไรเดอร์
  app/employee/         หน้าฝั่งพนักงานร้าน
  app/admin/            หน้าฝั่งผู้ดูแลระบบ
  components/           แผนที่และ navbar ที่ใช้ร่วมกัน
  lib/                  API client, คำนวณราคา, เส้นทางถนน
render.yaml             Blueprint สำหรับ deploy backend บน Render
```

## Deployment

- **Frontend → Vercel** — import repo, ตั้ง Root Directory เป็น `frontend`, ใส่ `NEXT_PUBLIC_API_URL`
- **Backend → Render** — import `render.yaml` เป็น Blueprint, กรอกค่า secret ที่ระบุเป็น `sync: false`

Backend ต้องรันเป็น process ที่อยู่ตลอด เพราะมี Socket.IO gateway และ connection pool
ของ Mongoose จึงใช้ Render ไม่ใช่ serverless

> หมายเหตุ: Render แพ็กเกจฟรีจะหยุดทำงานเมื่อไม่มีทราฟฟิก 15 นาที
> คำขอแรกหลังจากนั้นจะใช้เวลาราว 50 วินาที

## Testing

```bash
cd backend && npm test
```

ปัจจุบันมี unit test 4 ไฟล์ และยังไม่ผ่านทั้งหมด (3 จาก 4 suite ล้มเหลว) — เป็นงานที่ค้างอยู่

## License

UNLICENSED — โปรเจกต์เพื่อการศึกษา
