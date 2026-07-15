const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = 3000;

app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

const genID = () => crypto.randomBytes(8).toString('hex');
const DB_PATH = path.join(__dirname, 'data.json');
const loadDB = () => fs.existsSync(DB_PATH) ? JSON.parse(fs.readFileSync(DB_PATH)) : [];
const saveDB = data => fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));

// Serve main page
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

// Submit message → save ID → show success
app.post('/submit', (req, res) => {
  const text = req.body.message?.trim();
  if (!text) return res.send('Empty message not allowed. <br><a href="/">← Go back</a>');

  const db = loadDB();
  const newMsg = { id: genID(), text, time: new Date().toISOString(), replies: [] };
  db.unshift(newMsg);
  saveDB(db);

  // Pass ID back to page
  res.send(`
    <script>
      localStorage.setItem('lastMsgId', '${newMsg.id}');
      window.location.href = '/';
    </script>
  `);
});

// Admin panel
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'admin.html')));
app.post('/admin-load', (req, res) => {
  const target = loadDB().find(p => p.id === req.body.msgId?.trim());
  if (!target) return res.send('<h2 style="color:red;">❌ Not found</h2><a href="/admin">← Back</a>');
  const repliesList = target.replies?.length
    ? target.replies.map(r => `<div style="background:#444; padding:0.8rem; margin:0.5rem 0; color:white;">${r.text}<br><small>${new Date(r.time).toLocaleString()}</small></div>`).join('')
    : '<p style="color:#aaa;">No replies yet.</p>';
  res.send(`
    <html style="background:#1a1a1a; color:#fff; font-family:Arial; max-width:700px; margin:2rem auto; padding:1.5rem;">
      <h3>Message:</h3><p>${target.text}</p><hr><h4>Replies:</h4>${repliesList}<hr>
      <form method="POST" action="/admin-save/${target.id}">
        <textarea name="reply" required style="width:100%; min-height:100px; padding:0.8rem;"></textarea><br>
        <button style="background:#27ae60; padding:0.6rem 1rem; border:none; border-radius:4px; color:white;">Save Reply</button>
      </form><br><a href="/admin" style="color:#4ecdc4;">← Another message</a>
    </html>
  `);
});
app.post('/admin-save/:id', (req, res) => {
  const reply = req.body.reply?.trim();
  if (!reply) return res.send('Empty reply. <br><a href="/admin">← Back</a>');
  const db = loadDB();
  const msg = db.find(p => p.id === req.params.id);
  if (msg) msg.replies.push({ text: reply, time: new Date().toISOString() });
  saveDB(db);
  res.send('<h2 style="color:lightgreen;">✅ Reply Saved!</h2><p><a href="/admin">← Back to Admin</a></p>');
});

// Check replies page
app.get('/check', (req, res) => res.sendFile(path.join(__dirname, 'check.html')));
app.post('/check-load', (req, res) => {
  const target = loadDB().find(p => p.id === req.body.msgId?.trim());
  if (!target) return res.send('<h2 style="color:red;">❌ Not found</h2><a href="/check">← Try again</a>');
  const repliesList = target.replies?.length
    ? target.replies.map(r => `<div style="padding:1rem; background:#f8f9fa; margin:0.8rem 0;">Reply: ${r.text}<br><small>${new Date(r.time).toLocaleString()}</small></div>`).join('')
    : '<p style="color:#666;">No replies yet — check back later.</p>';
  res.send(`
    <html style="font-family:Arial; max-width:700px; margin:2rem auto; padding:1.5rem;">
      <h3>Your Message:</h3><p>${target.text}</p><hr><h3>Replies:</h3>${repliesList}<hr><a href="/check">← Check another</a> | <a href="/">← Home</a>
    </html>
  `);
});

app.listen(PORT, () => console.log(`✅ RUNNING!
→ Main: http://localhost:${PORT}
→ Admin: http://localhost:${PORT}/admin
→ Check replies: http://localhost:${PORT}/check`));
