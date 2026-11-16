const express = require('express');
const crypto = require('crypto');
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const ADMIN_PASS = "pb30admin";
let keysDB = {};

app.get('/', (req, res) => {
  const pass = req.query.pass;
  if (pass !== ADMIN_PASS) {
    return res.send(`
      <body style="background:#121212;color:#fff;font-family:sans-serif;display:flex;justify-content:center;align-items:center;height:100vh;">
        <form method="GET" style="background:#1e1e1e;padding:30px;border-radius:10px;text-align:center;">
          <h2 style="color:#00E676;">PB30 Key Panel</h2>
          <input type="password" name="pass" placeholder="Admin Password" style="padding:10px;border-radius:5px;border:none;margin-bottom:10px;width:100%;" required><br>
          <button type="submit" style="background:#00E676;color:#000;font-weight:bold;padding:10px 20px;border:none;border-radius:5px;cursor:pointer;width:100%;">Login</button>
        </form>
      </body>
    `);
  }

  let rows = '';
  for (let k in keysDB) {
    let item = keysDB[k];
    let expiryDate = new Date(item.expiresAt).toLocaleString('en-IN');
    let isExpired = Date.now() > item.expiresAt;
    rows += `
      <tr style="border-bottom:1px solid #333;">
        <td style="padding:10px;color:#00E676;font-weight:bold;">${k}</td>
        <td style="padding:10px;">${item.days} Days</td>
        <td style="padding:10px;">${item.deviceId ? item.deviceId : '<span style="color:#aaa;">Not Used Yet</span>'}</td>
        <td style="padding:10px;color:${isExpired ? '#ff5252' : '#fff'};">${expiryDate}</td>
        <td style="padding:10px;">
          <a href="/delete?key=${k}&pass=${ADMIN_PASS}" style="color:#ff5252;text-decoration:none;font-weight:bold;">Delete</a>
        </td>
      </tr>
    `;
  }

  res.send(`
    <body style="background:#121212;color:#fff;font-family:sans-serif;padding:20px;">
      <h2 style="color:#00E676;">PB30 License Key Generator</h2>
      <div style="margin-bottom:20px;">
        <a href="/generate?days=7&pass=${ADMIN_PASS}" style="background:#00E676;color:#000;padding:12px 20px;text-decoration:none;font-weight:bold;border-radius:6px;margin-right:10px;">+ Generate 7 Days (हफ्ता) Key</a>
        <a href="/generate?days=30&pass=${ADMIN_PASS}" style="background:#2979FF;color:#fff;padding:12px 20px;text-decoration:none;font-weight:bold;border-radius:6px;">+ Generate 30 Days (महीना) Key</a>
      </div>
      <table style="width:100%;border-collapse:collapse;background:#1e1e1e;border-radius:8px;overflow:hidden;">
        <tr style="background:#252525;text-align:left;">
          <th style="padding:12px;">License Key</th>
          <th style="padding:12px;">Plan</th>
          <th style="padding:12px;">Locked Device ID</th>
          <th style="padding:12px;">Expires On</th>
          <th style="padding:12px;">Action</th>
        </tr>
        ${rows || '<tr><td colspan="5" style="padding:15px;text-align:center;color:#888;">कोई Key नहीं बनी है। ऊपर बटन दबाकर बनाएं।</td></tr>'}
      </table>
    </body>
  `);
});

app.get('/generate', (req, res) => {
  if (req.query.pass !== ADMIN_PASS) return res.send("Unauthorized");
  const days = parseInt(req.query.days) || 7;
  const randomCode = crypto.randomBytes(3).toString('hex').toUpperCase();
  const newKey = `PB30-${days}D-${randomCode}`;
  keysDB[newKey] = {
    days: days,
    deviceId: null,
    expiresAt: Date.now() + (days * 24 * 60 * 60 * 1000)
  };
  res.redirect(`/?pass=${ADMIN_PASS}`);
});

app.get('/delete', (req, res) => {
  if (req.query.pass !== ADMIN_PASS) return res.send("Unauthorized");
  delete keysDB[req.query.key];
  res.redirect(`/?pass=${ADMIN_PASS}`);
});

app.get('/verify', (req, res) => {
  const { key, device_id } = req.query;
  if (!key || !device_id) {
    return res.json({ status: "error", message: "Key और Device ID जरूरी है!" });
  }
  const record = keysDB[key];
  if (!record) {
    return res.json({ status: "error", message: "Invalid Key (गलत की)!" });
  }
  if (Date.now() > record.expiresAt) {
    return res.json({ status: "error", message: "Key Expired (समय पूरा हो गया है)!" });
  }
  if (record.deviceId === null) {
    record.deviceId = device_id;
    return res.json({ status: "success", message: "Login Successful! Device Locked." });
  } else if (record.deviceId === device_id) {
    return res.json({ status: "success", message: "Welcome Back!" });
  } else {
    return res.json({ status: "error", message: "यह Key पहले से दूसरे फोन में चल रही है!" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
