// Add this near the top of your app.js HOSTING
const path = require('path');

require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const License = require('./models/License');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Database connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Add this before your routes  HOSTING
if (process.env.NODE_ENV === 'production') {
  // Serve static files from the React app
  app.use(express.static(path.join(__dirname, 'dashboard')));
  
  // Handle React routing, return all requests to React app
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../dashboard', 'index.html'));
  });
}

// Admin login endpoint
app.post('/api/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (username !== process.env.ADMIN_USER) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const passwordValid = await bcrypt.compare(password, process.env.ADMIN_PASS);
    if (!passwordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const token = jwt.sign({ role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '8h' });
    res.json({ token });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// License endpoints
app.get('/api/licenses', async (req, res) => {
  try {
    const token = req.header('auth-token');
    if (!token) return res.status(401).json({ error: 'Access denied' });

    jwt.verify(token, process.env.JWT_SECRET);
    
    const licenses = await License.find().sort({ createdAt: -1 });
    res.json(licenses);
  } catch (err) {
    res.status(400).json({ error: 'Invalid token' });
  }
});

app.post('/api/licenses/generate', async (req, res) => {
  try {
    const token = req.header('auth-token');
    if (!token) return res.status(401).json({ error: 'Access denied' });

    jwt.verify(token, process.env.JWT_SECRET);
    
    const { durationDays } = req.body;
    const key = bcrypt.hashSync(Date.now().toString(), 10).replace(/\//g, '').substring(0, 16);
    const expiryDate = new Date(Date.now() + durationDays * 86400000);
    
    const license = await License.create({ key, expiryDate });
    res.json(license);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/licenses/:id/extend', async (req, res) => {
  try {
    const token = req.header('auth-token');
    if (!token) return res.status(401).json({ error: 'Access denied' });

    jwt.verify(token, process.env.JWT_SECRET);
    
    const license = await License.findById(req.params.id);
    if (!license) return res.status(404).json({ error: 'License not found' });
    
    license.expiryDate = new Date(license.expiryDate.getTime() + req.body.days * 86400000);
    await license.save();
    
    res.json(license);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/licenses/:id', async (req, res) => {
  try {
    const token = req.header('auth-token');
    if (!token) return res.status(401).json({ error: 'Access denied' });

    jwt.verify(token, process.env.JWT_SECRET);
    
    await License.findByIdAndDelete(req.params.id);
    res.json({ message: 'License deleted' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// License validation endpoint (for EA)
app.post('/api/licenses/validate', async (req, res) => {
  try {
    const { key, hwid } = req.body;
    const license = await License.findOne({ key });
    
    if (!license) return res.json({ valid: false, error: 'Invalid license key' });
    if (!license.isActive) return res.json({ valid: false, error: 'License deactivated' });
    if (new Date() > license.expiryDate) return res.json({ valid: false, error: 'License expired' });
    if (license.hwid && license.hwid !== hwid) return res.json({ valid: false, error: 'License in use on another machine' });
    
    if (!license.hwid) {
      license.hwid = hwid;
      await license.save();
    }
    
    license.lastUsed = new Date();
    await license.save();
    
    res.json({ valid: true, expiryDate: license.expiryDate });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));