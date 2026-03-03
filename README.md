# Shree_Aishwarya_Nrityalaya![Uploading image.png…]()
<img width="738" height="1600" alt="image" src="https://github.com/user-attachments/assets/06431e66-99ec-4b65-951d-36c8915e4a9c" />
<img width="738" height="1600" alt="image" src="https://github.com/user-attachments/assets/b60d0dd8-547a-4fc2-b752-1f936f212ddd" />
<img width="738" height="1600" alt="image" src="https://github.com/user-attachments/assets/0117ff8c-4825-4905-b8c8-c24aea1f9168" />
<img width="738" height="1600" alt="image" src="https://github.com/user-attachments/assets/0416a6b1-8356-4753-b57f-e3e6baac1a76" />

### Dance Academy Student Management System

A full-stack mobile application to manage students, fees, attendance, and income for **Shree Aishwarya Nrityalaya** dance academy.

---

## 📁 Project Structure

```
Shree_Aishwarya_Nrityalaya/
├── dance-backend/        # Node.js + Express REST API
│   └── server.js
├── danceapp/             # React Native (Expo) Mobile App
│   └── app/
│       ├── (tabs)/
│       │   ├── index.tsx          # Students list
│       │   ├── dashboard.tsx      # Income dashboard
│       │   └── _layout.tsx
│       ├── student-details.tsx
│       ├── add-student.tsx
│       ├── edit-student.tsx
│       ├── add-payment.tsx
│       ├── payment-history.tsx
│       ├── attendance.tsx
│       └── _layout.tsx
├── dance.sql             # MySQL database schema
└── package-lock.json
```

---

## ✨ Features

### 👩‍🎓 Student Management
- Add, edit, and delete students
- Track student status — **Active / Inactive**
- Class type — **Online / Offline**
- Store phone number, joining date, and monthly fee

### 💰 Fee & Payment Tracking
- Record monthly payments with **Cash / UPI / Card** modes
- **Partial payment** support — tracks balance due
- **Overpayment credit** — extra amount auto-credited to next month
- Full payment history per student with delete option
- Month-wise payment summary with progress bar

### 📅 Attendance
- Calendar view with month navigation
- Mark students as **Present / Absent** per class day
- Separate schedules for **Online** and **Offline** batches
- Manually configure which days of the week classes are held
- Monthly attendance summary (Present / Absent / Total)

### 📊 Dashboard
- **Overview** — Total income collected, pending balance, total dues, student counts
- **Month-wise** — Income breakdown per month with collection progress bar
- **Student-wise** — Total paid, balance due, and payment count per student

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Mobile App | React Native + Expo Router |
| Language | TypeScript |
| Backend | Node.js + Express.js |
| Database | MySQL |
| HTTP Client | Axios |
| Icons | Expo Vector Icons (Ionicons) |
| Local Storage | AsyncStorage (class schedules) |

---

## 🗄 Database Schema

```sql
-- Students
CREATE TABLE students (
  id            INT PRIMARY KEY AUTO_INCREMENT,
  name          VARCHAR(100) NOT NULL,
  phone         VARCHAR(15),
  joining_date  DATE NOT NULL,
  monthly_fee   DECIMAL(10,2) NOT NULL,
  class_type    ENUM('offline','online') DEFAULT 'offline',
  status        ENUM('active','inactive') DEFAULT 'active',
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Payments (supports partial + credit carry-forward)
CREATE TABLE payments (
  id                INT PRIMARY KEY AUTO_INCREMENT,
  student_id        INT NOT NULL,
  month             INT NOT NULL,
  year              INT NOT NULL,
  amount_paid       DECIMAL(10,2) NOT NULL,
  balance           DECIMAL(10,2) NOT NULL DEFAULT 0,
  credit_remaining  DECIMAL(10,2) NOT NULL DEFAULT 0,
  payment_mode      VARCHAR(50),
  payment_date      DATE NOT NULL,
  UNIQUE(student_id, month, year),
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

-- Attendance
CREATE TABLE attendance (
  id          INT PRIMARY KEY AUTO_INCREMENT,
  student_id  INT NOT NULL,
  date        DATE NOT NULL,
  status      ENUM('present','absent') NOT NULL,
  month       INT NOT NULL,
  year        INT NOT NULL,
  UNIQUE(student_id, date),
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js >= 16
- MySQL
- Expo CLI (`npm install -g expo-cli`)
- Expo Go app on your phone

### 1. Database Setup
```bash
mysql -u root -p
source dance.sql
```

### 2. Backend Setup
```bash
cd dance-backend
npm install
# Edit server.js — update MySQL password
node server.js
# Server runs on http://0.0.0.0:5000
```

### 3. Mobile App Setup
```bash
cd danceapp
npm install
# Edit BASE_URL in all screen files to your local IP
# e.g. const BASE_URL = "http://192.168.x.x:5000"
npx expo start
```

Scan the QR code with **Expo Go** on your phone.

> ⚠️ Your phone and PC must be on the **same Wi-Fi network**.

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/students` | List all students |
| POST | `/students` | Add new student |
| PUT | `/students/:id` | Update student |
| DELETE | `/students/:id` | Delete student |
| GET | `/students/:id/dues` | Get pending dues |
| GET | `/students/:id/payments` | Payment history |
| POST | `/payments` | Add payment (with credit logic) |
| DELETE | `/payments/:id` | Delete a payment |
| GET | `/income/monthly` | Month-wise income summary |
| GET | `/income/by-student` | Student-wise income summary |
| GET | `/students/:id/attendance` | Get attendance |
| POST | `/attendance` | Mark attendance |
| GET | `/attendance/summary/:id` | Monthly attendance summary |

---

## 👩‍💻 Developed by

**Aisshwarya23** — Built for Shree Aishwarya Nrityalaya dance academy to streamline student fee tracking and attendance management.
