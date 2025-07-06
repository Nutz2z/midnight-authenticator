const express = require('express');
const router = express.Router();
const License = require('../models/License');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const verifyAdmin = (req, res, next) => {
  const token = req.header('auth-token');
  if (!token) return res.status(401).send('Access Denied');
  
  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    req.user = verified;
    next();
  } catch (err) {
    res.status(400).send('Invalid Token');
  }
};

// Generate new license
router.post('/generate', verifyAdmin, async (req, res) => {
  const { durationDays } = req.body;
  const key = bcrypt.hashSync(Date.now().toString(), 10).replace(/\//g, '').substring(0, 16);
  const expiryDate = new Date(Date.now() + durationDays * 86400000);
  
  try {
    const license = await License.create({ key, expiryDate });
    res.json({ key, expiryDate });
  } catch (err) {
    res.status(400).send(err);
  }
});

// Validate license (EA calls this)
router.post('/validate', async (req, res) => {
  const { key, hwid } = req.body;
  
  try {
    const license = await License.findOne({ key });
    if (!license) return res.status(400).json({ valid: false, error: 'Invalid license' });
    
    if (!license.isActive) return res.status(400).json({ valid: false, error: 'License deactivated' });
    if (new Date() > license.expiryDate) return res.status(400).json({ valid: false, error: 'License expired' });
    if (license.hwid && license.hwid !== hwid) return res.status(400).json({ valid: false, error: 'Already in use on another machine' });
    
    if (!license.hwid) {
      license.hwid = hwid;
      await license.save();
    }
    
    license.lastUsed = new Date();
    await license.save();
    
    res.json({ valid: true, expiryDate: license.expiryDate });
  } catch (err) {
    res.status(500).json({ valid: false, error: 'Server error' });
  }
});

// Admin management endpoints
router.get('/', verifyAdmin, async (req, res) => {
  res.json(await License.find().sort({ createdAt: -1 }));
});

router.put('/:id/extend', verifyAdmin, async (req, res) => {
  const license = await License.findById(req.params.id);
  license.expiryDate = new Date(license.expiryDate.getTime() + req.body.days * 86400000);
  await license.save();
  res.json(license);
});

router.delete('/:id', verifyAdmin, async (req, res) => {
  await License.findByIdAndDelete(req.params.id);
  res.json({ message: 'License deleted' });
});

module.exports = router;