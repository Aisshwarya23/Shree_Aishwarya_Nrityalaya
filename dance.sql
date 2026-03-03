CREATE DATABASE dance_academy;
USE dance_academy;
CREATE TABLE students (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(15),
  joining_date DATE NOT NULL,
  monthly_fee DECIMAL(10,2) NOT NULL,
  status ENUM('active','inactive') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
select * from students;
CREATE TABLE payments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  student_id INT NOT NULL,
  month INT NOT NULL,
  year INT NOT NULL,
  amount_paid DECIMAL(10,2) NOT NULL,
  payment_mode VARCHAR(50),
  payment_date DATE,
  UNIQUE(student_id, month, year),
  FOREIGN KEY (student_id) REFERENCES students(id)
);
select * from payments;










-- Run these ALTER commands if you already have the DB
-- OR use the full CREATE below for a fresh setup

-- =============================================
-- OPTION A: ALTER existing tables (if DB exists)
-- =============================================


ALTER TABLE students ADD COLUMN class_type ENUM('offline','online') DEFAULT 'offline';
ALTER TABLE payments ADD COLUMN balance DECIMAL(10,2) DEFAULT 0;
ALTER TABLE payments ADD COLUMN payment_date DATE;
ALTER TABLE payments  ADD COLUMN credit_remaining DECIMAL(10,2) NOT NULL DEFAULT 0 AFTER balance;

CREATE TABLE IF NOT EXISTS attendance (
  id INT PRIMARY KEY AUTO_INCREMENT,
  student_id INT NOT NULL,
  date DATE NOT NULL,
  month INT NOT NULL,
  year INT NOT NULL,
  status ENUM('present','absent') NOT NULL DEFAULT 'present',
  UNIQUE(student_id, date),
  FOREIGN KEY (student_id) REFERENCES students(id)
);

select * from attendance;
