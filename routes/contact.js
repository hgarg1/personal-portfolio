const express = require('express');
const router  = express.Router();
const { sendContactSubmissionEmail } = require('../lib/email');
const { screenContact, saveContactSubmission } = require('../lib/contact-guard');

router.get('/', (req, res) => {
  res.render('contact', { title: 'Contact', success: null, error: null, abuse: null });
});

function wantsJson(req) {
  return req.is('application/json') || req.headers.accept === 'application/json';
}

router.post('/', async (req, res) => {
  const json = wantsJson(req);

  try {
    const screen = await screenContact(req, req.body || {});

    if (!screen.ok) {
      if (screen.retryAfter) res.set('Retry-After', String(screen.retryAfter));
      const abuse = screen.abuse
        ? { title: screen.abuseTitle, body: screen.abuseBody }
        : null;
      if (json) {
        return res.status(screen.status).json({
          success: false,
          error: screen.error,
          retryAfter: screen.retryAfter || null,
          abuse: !!screen.abuse,
          abuseTitle: screen.abuseTitle || null,
          abuseBody: screen.abuseBody || null,
        });
      }
      return res.status(screen.status).render('contact', {
        title: 'Contact',
        success: null,
        error: screen.error,
        abuse,
      });
    }

    try {
      await saveContactSubmission(screen);
    } catch (err) {
      if (screen.release) await screen.release();
      throw err;
    }
    const { name, email, messageText } = screen.fields;
    console.log(`✉️ New message saved from ${name} <${email}>`);
    sendContactSubmissionEmail(name, email, messageText).catch((err) => {
      console.error('Failed to send contact submission email:', err);
    });

    if (json) return res.json({ success: true });
    return res.render('contact', {
      title: 'Contact',
      success: `Thanks, ${name}! Your message has been received.`,
      error: null,
      abuse: null,
    });
  } catch (err) {
    console.error('Contact submission error:', err);
    if (json) {
      return res.status(500).json({ success: false, error: 'Internal server error.' });
    }
    return res.status(500).render('contact', {
      title: 'Contact',
      success: null,
      error: 'An internal server error occurred while sending your message.',
      abuse: null,
    });
  }
});

module.exports = router;
