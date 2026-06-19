const express = require('express');
const router  = express.Router();
const prisma  = require('../lib/prisma');

router.get('/', (req, res) => {
  res.render('contact', { title: 'Contact', success: null, error: null });
});

router.post('/', async (req, res) => {
  const { name, email, message } = req.body;

  // AJAX request — return JSON
  if (req.is('application/json') || req.headers.accept === 'application/json') {
    if (!name || !email || !message) {
      return res.status(400).json({ success: false, error: 'All fields are required.' });
    }
    
    try {
      await prisma.contactSubmission.create({
        data: { name, email, message }
      });
      console.log(`✉️ New message saved from ${name} <${email}>`);
      return res.json({ success: true });
    } catch (err) {
      console.error('Contact database save error (AJAX):', err);
      return res.status(500).json({ success: false, error: 'Internal server error.' });
    }
  }

  // Traditional form POST — render page
  if (!name || !email || !message) {
    return res.render('contact', {
      title: 'Contact',
      success: null,
      error: 'All fields are required.',
    });
  }

  try {
    await prisma.contactSubmission.create({
      data: { name, email, message }
    });
    console.log(`✉️ New message saved from ${name} <${email}>`);
    res.render('contact', {
      title: 'Contact',
      success: `Thanks, ${name}! Your message has been received.`,
      error: null,
    });
  } catch (err) {
    console.error('Contact database save error (traditional):', err);
    res.render('contact', {
      title: 'Contact',
      success: null,
      error: 'An internal server error occurred while sending your message.',
    });
  }
});

module.exports = router;
