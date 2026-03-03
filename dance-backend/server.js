// server.js
const express = require("express");
const mysql   = require("mysql2");
const cors    = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const db = mysql.createConnection({
  host:     "localhost",
  user:     "root",
  password: "aish@123",
  database: "dance_academy",
});

db.connect((err) => {
  if (err) { console.log("DB error:", err); return; }
  console.log("MySQL connected");
});

/* ── HELPER: get unconsumed credit from prior months ── */
function getCreditForMonth(student_id, month, year, cb) {
  db.query(
    `SELECT IFNULL(SUM(credit_remaining), 0) AS total_credit
     FROM payments
     WHERE student_id = ?
       AND (year < ? OR (year = ? AND month < ?))
       AND credit_remaining > 0`,
    [student_id, year, year, month],
    (err, rows) => {
      if (err) return cb(err, 0);
      cb(null, parseFloat(rows[0].total_credit));
    }
  );
}

/* ── STUDENTS ── */

app.get("/students", (req, res) => {
  db.query("SELECT * FROM students ORDER BY id DESC", (err, rows) => {
    if (err) return res.status(500).json(err);
    res.json(rows);
  });
});

app.get("/students/:id", (req, res) => {
  db.query("SELECT * FROM students WHERE id = ?", [req.params.id], (err, rows) => {
    if (err) return res.status(500).json(err);
    if (!rows.length) return res.status(404).json({ message: "Student not found" });
    res.json(rows[0]);
  });
});

app.post("/students", (req, res) => {
  const { name, phone, joining_date, monthly_fee, class_type } = req.body;
  db.query(
    "INSERT INTO students (name, phone, joining_date, monthly_fee, class_type) VALUES (?,?,?,?,?)",
    [name, phone, joining_date, monthly_fee, class_type || "offline"],
    (err, result) => {
      if (err) return res.status(500).json(err);
      res.json({ message: "Student added", id: result.insertId });
    }
  );
});

app.put("/students/:id", (req, res) => {
  const { name, phone, monthly_fee, status, class_type } = req.body;
  db.query(
    "UPDATE students SET name=?, phone=?, monthly_fee=?, status=?, class_type=? WHERE id=?",
    [name, phone, monthly_fee, status, class_type, req.params.id],
    (err) => {
      if (err) return res.status(500).json(err);
      res.json({ message: "Student updated" });
    }
  );
});

app.delete("/students/:id", (req, res) => {
  const id = req.params.id;
  db.query("DELETE FROM attendance WHERE student_id=?", [id], (err) => {
    if (err) return res.status(500).json(err);
    db.query("DELETE FROM payments WHERE student_id=?", [id], (err) => {
      if (err) return res.status(500).json(err);
      db.query("DELETE FROM students WHERE id=?", [id], (err) => {
        if (err) return res.status(500).json(err);
        res.json({ message: "Student deleted" });
      });
    });
  });
});

/* ── DUES ── */

app.get("/students/:id/dues", (req, res) => {
  const id = req.params.id;
  db.query("SELECT joining_date, monthly_fee FROM students WHERE id=?", [id], (err, s) => {
    if (err) return res.status(500).json(err);
    if (!s.length) return res.json({ pendingMonths: [], pendingCount: 0, totalDue: 0 });

    const join = new Date(s[0].joining_date);
    const fee  = parseFloat(s[0].monthly_fee);

    db.query(
      "SELECT month, year, amount_paid, balance, credit_remaining FROM payments WHERE student_id=?",
      [id],
      (err, p) => {
        if (err) return res.status(500).json(err);

        const paidMap = {};
        p.forEach(x => {
          paidMap[`${x.month}-${x.year}`] = {
            amount_paid:      parseFloat(x.amount_paid),
            balance:          parseFloat(x.balance || 0),
            credit_remaining: parseFloat(x.credit_remaining || 0),
          };
        });

        const today = new Date();
        let m = join.getMonth() + 1;
        let y = join.getFullYear();
        const list = [];
        let totalDue = 0;

        while (
          y < today.getFullYear() ||
          (y === today.getFullYear() && m <= today.getMonth() + 1)
        ) {
          const key = `${m}-${y}`;
          const rec = paidMap[key];

          if (!rec) {
            list.push({ month: m, year: y, due: fee, status: "unpaid" });
            totalDue += fee;
          } else if (rec.balance > 0) {
            list.push({ month: m, year: y, due: fee, paid: rec.amount_paid, balance: rec.balance, status: "partial" });
            totalDue += rec.balance;
          }

          m++;
          if (m > 12) { m = 1; y++; }
        }

        res.json({ pendingMonths: list, pendingCount: list.length, totalDue });
      }
    );
  });
});

/* ── PAYMENTS ── */

app.get("/students/:id/payments", (req, res) => {
  db.query(
    "SELECT * FROM payments WHERE student_id=? ORDER BY year DESC, month DESC",
    [req.params.id],
    (err, rows) => {
      if (err) return res.status(500).json(err);
      res.json(rows);
    }
  );
});

app.get("/income/monthly", (req, res) => {
  db.query(
    `SELECT year, month,
       SUM(amount_paid)      AS total_collected,
       SUM(balance)          AS total_balance,
       SUM(credit_remaining) AS total_credit,
       COUNT(*)              AS payment_count
     FROM payments
     GROUP BY year, month
     ORDER BY year DESC, month DESC`,
    (err, rows) => {
      if (err) return res.status(500).json(err);
      res.json(rows);
    }
  );
});

/* ── NEW: Student-wise income summary ── */
app.get("/income/by-student", (req, res) => {
  db.query(
    `SELECT
       s.id,
       s.name,
       s.class_type,
       s.status,
       s.monthly_fee,
       IFNULL(SUM(p.amount_paid), 0)  AS total_paid,
       IFNULL(SUM(p.balance), 0)      AS total_balance,
       COUNT(p.id)                    AS payment_count
     FROM students s
     LEFT JOIN payments p ON p.student_id = s.id
     GROUP BY s.id
     ORDER BY total_paid DESC`,
    (err, rows) => {
      if (err) return res.status(500).json(err);
      res.json(rows);
    }
  );
});

app.post("/payments", (req, res) => {
  const { student_id, month, year, amount_paid, payment_mode, payment_date } = req.body;

  db.query("SELECT monthly_fee FROM students WHERE id=?", [student_id], (err, s) => {
    if (err) return res.status(500).json(err);
    if (!s.length) return res.status(404).json({ message: "Student not found" });

    const fee  = parseFloat(s[0].monthly_fee);
    const paid = parseFloat(amount_paid);
    const pd   = payment_date || new Date().toISOString().slice(0, 10);

    db.query(
      "SELECT id, amount_paid, balance, credit_remaining FROM payments WHERE student_id=? AND month=? AND year=?",
      [student_id, month, year],
      (err, existing) => {
        if (err) return res.status(500).json(err);

        if (existing.length > 0) {
          const prev       = existing[0];
          const totalPaid  = parseFloat(prev.amount_paid) + paid;
          const diff       = totalPaid - fee;
          const newBalance = diff < 0 ? Math.abs(diff) : 0;
          const newCredit  = diff > 0 ? diff : 0;

          db.query(
            `UPDATE payments SET amount_paid=?, balance=?, credit_remaining=?, payment_mode=?, payment_date=? WHERE id=?`,
            [totalPaid, newBalance, newCredit, payment_mode, pd, prev.id],
            (err) => {
              if (err) return res.status(500).json(err);
              if (newCredit > 0) {
                applyCredit(student_id, month, year, newCredit, fee, (nextDue) => {
                  res.json({ message: "Payment updated with credit carry-forward", balance: newBalance, credit: newCredit, next_month_due: nextDue });
                });
              } else {
                res.json({ message: "Payment updated", balance: newBalance, credit: 0, next_month_due: fee });
              }
            }
          );

        } else {
          getCreditForMonth(student_id, month, year, (err, availableCredit) => {
            if (err) return res.status(500).json(err);

            const effectivePaid = paid + availableCredit;
            const diff          = effectivePaid - fee;
            const balance       = diff < 0 ? Math.abs(diff) : 0;
            const creditOut     = diff > 0 ? diff : 0;

            if (availableCredit > 0) consumeCredit(student_id, month, year, availableCredit);

            db.query(
              `INSERT INTO payments (student_id, month, year, amount_paid, balance, credit_remaining, payment_mode, payment_date) VALUES (?,?,?,?,?,?,?,?)`,
              [student_id, month, year, paid, balance, creditOut, payment_mode, pd],
              (err) => {
                if (err) return res.status(500).json(err);
                if (creditOut > 0) {
                  applyCredit(student_id, month, year, creditOut, fee, (nextDue) => {
                    res.json({ message: "Payment saved with credit carry-forward", balance, credit: creditOut, next_month_due: nextDue, credit_used: availableCredit });
                  });
                } else {
                  res.json({ message: "Payment saved", balance, credit: 0, next_month_due: fee, credit_used: availableCredit });
                }
              }
            );
          });
        }
      }
    );
  });
});

function applyCredit(student_id, month, year, credit, fee, cb) {
  const nm = month === 12 ? 1 : month + 1;
  const ny = month === 12 ? year + 1 : year;
  const nextDue = Math.max(0, fee - credit);

  db.query(
    "SELECT id, amount_paid, credit_remaining FROM payments WHERE student_id=? AND month=? AND year=?",
    [student_id, nm, ny],
    (err, rows) => {
      if (err) return cb(nextDue);
      if (rows.length > 0) {
        const prev = rows[0];
        db.query(
          "UPDATE payments SET credit_remaining=?, balance=? WHERE id=?",
          [parseFloat(prev.credit_remaining || 0) + credit, Math.max(0, fee - parseFloat(prev.amount_paid) - credit), prev.id],
          () => cb(nextDue)
        );
      } else {
        db.query(
          `INSERT INTO payments (student_id, month, year, amount_paid, balance, credit_remaining, payment_mode, payment_date) VALUES (?,?,?,?,?,?,'credit',?)`,
          [student_id, nm, ny, 0, nextDue, credit, new Date().toISOString().slice(0, 10)],
          () => cb(nextDue)
        );
      }
    }
  );
}

function consumeCredit(student_id, month, year, amount) {
  db.query(
    `SELECT id, credit_remaining FROM payments WHERE student_id=? AND credit_remaining > 0 AND (year < ? OR (year=? AND month < ?)) ORDER BY year ASC, month ASC`,
    [student_id, year, year, month],
    (err, rows) => {
      if (err || !rows.length) return;
      let remaining = amount;
      rows.forEach(row => {
        if (remaining <= 0) return;
        const consume = Math.min(remaining, parseFloat(row.credit_remaining));
        remaining -= consume;
        db.query("UPDATE payments SET credit_remaining = credit_remaining - ? WHERE id=?", [consume, row.id]);
      });
    }
  );
}

app.delete("/payments/:id", (req, res) => {
  db.query("DELETE FROM payments WHERE id=?", [req.params.id], (err) => {
    if (err) return res.status(500).json(err);
    res.json({ message: "Payment deleted" });
  });
});

/* ── ATTENDANCE ── */

app.get("/students/:id/attendance", (req, res) => {
  const { month, year } = req.query;
  let query    = "SELECT id, student_id, DATE_FORMAT(date,'%Y-%m-%d') AS date, status, month, year FROM attendance WHERE student_id=?";
  const params = [req.params.id];
  if (month && year) { query += " AND month=? AND year=?"; params.push(month, year); }
  query += " ORDER BY date ASC";
  db.query(query, params, (err, rows) => {
    if (err) return res.status(500).json(err);
    res.json(rows);
  });
});

app.post("/attendance", (req, res) => {
  const { student_id, date, status, month, year } = req.body;
  if (!student_id || !date || !status || month === undefined || year === undefined)
    return res.status(400).json({ message: "Missing required fields" });

  db.query(
    "INSERT INTO attendance (student_id, date, status, month, year) VALUES (?,?,?,?,?) ON DUPLICATE KEY UPDATE status=?",
    [Number(student_id), date, status, Number(month), Number(year), status],
    (err) => {
      if (err) return res.status(500).json(err);
      res.json({ message: "Attendance saved" });
    }
  );
});

app.get("/attendance/summary/:id", (req, res) => {
  const { month, year } = req.query;
  db.query(
    `SELECT SUM(status='present') AS present, SUM(status='absent') AS absent, COUNT(*) AS total
     FROM attendance WHERE student_id=? AND month=? AND year=?`,
    [req.params.id, month, year],
    (err, rows) => {
      if (err) return res.status(500).json(err);
      res.json(rows[0] || { present: 0, absent: 0, total: 0 });
    }
  );
});

/* ── START ── */
app.listen(5000, "0.0.0.0", () => console.log("Server running on port 5000"));