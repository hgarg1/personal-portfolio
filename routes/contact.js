const express = require('express');
const router  = express.Router();

router.get('/', (req, res) => {
  res.render('contact', { title: 'Contact', success: null, error: null });
});

router.post('/', (req, res) => {
  const { name, email, message } = req.body;

  // AJAX request — return JSON
  if (req.is('application/json') || req.headers.accept === 'application/json') {
    if (!name || !email || !message) {
      return res.status(400).json({ success: false, error: 'All fields are required.' });
    }
    console.log(`\u{1F4EC} New message from ${name} <${email}>:\n${message}\n`);
    return res.json({ success: true });
  }

  // Traditional form POST — render page
  if (!name || !email || !message) {
    return res.render('contact', {
      title: 'Contact',
      success: null,
      error: 'All fields are required.',
    });
  }

  console.log(`\u{1F4EC} New message from ${name} <${email}>:\n${message}\n`);
  res.render('contact', {
    title: 'Contact',
    success: `Thanks, ${name}! Your message has been received.`,
    error: null,
  });
});

module.exports = router;
