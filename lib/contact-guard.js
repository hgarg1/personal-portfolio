const crypto = require('crypto');
const prisma = require('./prisma');

// Windows are intentionally tight for a personal contact form.
const LIMITS = {
  ipBurstMs: 10 * 60 * 1000,
  ipBurst: 8,
  ipHourMs: 60 * 60 * 1000,
  ipHour: 20,
  ipDayMs: 24 * 60 * 60 * 1000,
  ipDayAttempts: 60,
  ipDayAccepted: 10,
  emailDay: 2,
  emailWeekMs: 7 * 24 * 60 * 60 * 1000,
  emailWeek: 4,
  duplicateEmailMs: 12 * 60 * 60 * 1000,
  personMs: 14 * 24 * 60 * 60 * 1000,
  contentMs: 30 * 24 * 60 * 60 * 1000,
  minThinkMs: 2000,
  doubleSubmitMs: 30 * 1000,
};

const MAX_NAME = 80;
const MAX_EMAIL = 254;
const MAX_MESSAGE = 5000;
const MIN_MESSAGE = 5;

const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com', 'guerrillamail.com', 'guerrillamail.net', 'guerrillamail.org',
  'guerrillamailblock.com', 'grr.la', 'sharklasers.com', 'guerrillamail.de',
  '10minutemail.com', '10minutemail.net', 'tempmail.com', 'temp-mail.org',
  'temp-mail.io', 'yopmail.com', 'yopmail.fr', 'yopmail.net', 'trashmail.com',
  'trashmail.de', 'dispostable.com', 'getnada.com', 'nada.email', 'fakeinbox.com',
  'maildrop.cc', 'mailnesia.com', 'mohmal.com', 'emailondeck.com', 'tempail.com',
  'throwawaymail.com', 'discard.email', 'spamgourmet.com', 'mintemail.com',
  'mytemp.email', 'tmpmail.org', 'tmpmail.net', 'moakt.com', 'mailcatch.com',
  'inboxkitten.com', 'burnermail.io', 'mailpoof.com', 'tempr.email',
]);

const memoryHits = new Map();
const recentAccepts = new Map();
let lastPrune = 0;
let schemaReady = false;
let schemaWarned = false;

function warnSchema(message) {
  if (schemaWarned) return;
  schemaWarned = true;
  console.error(message);
}

function ipSalt() {
  return process.env.CONTACT_IP_SALT || process.env.SESSION_SECRET || 'portfolio-contact-ip';
}

function normalizeIp(ip) {
  let value = String(ip || '').trim().toLowerCase();
  if (value.startsWith('::ffff:')) value = value.slice(7);
  return value || 'unknown';
}

function hashIp(ip) {
  return crypto.createHash('sha256').update(`${ipSalt()}|${normalizeIp(ip)}`).digest('hex');
}

function clientIp(req) {
  return normalizeIp(req.ip);
}

function canonicalEmail(raw) {
  const email = String(raw || '').trim().toLowerCase();
  const at = email.lastIndexOf('@');
  if (at < 1 || at === email.length - 1) return null;
  let local = email.slice(0, at);
  let domain = email.slice(at + 1);
  if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(domain)) return null;
  if (domain === 'googlemail.com') domain = 'gmail.com';
  const plus = local.indexOf('+');
  if (plus !== -1) local = local.slice(0, plus);
  if (domain === 'gmail.com') local = local.replace(/\./g, '');
  if (!local || local.length > 64) return null;
  return `${local}@${domain}`;
}

function nameKey(raw) {
  return String(raw || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeMessage(raw) {
  return String(raw || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

function messageKey(raw) {
  return crypto.createHash('sha256').update(normalizeMessage(raw)).digest('hex');
}

function dice(a, b) {
  if (!a || !b) return 0;
  if (a === b) return 1;
  if (a.length < 2 || b.length < 2) return 0;
  const grams = new Map();
  for (let i = 0; i < a.length - 1; i++) {
    const g = a.slice(i, i + 2);
    grams.set(g, (grams.get(g) || 0) + 1);
  }
  let overlap = 0;
  for (let i = 0; i < b.length - 1; i++) {
    const g = b.slice(i, i + 2);
    const n = grams.get(g) || 0;
    if (n > 0) {
      grams.set(g, n - 1);
      overlap++;
    }
  }
  return (2 * overlap) / ((a.length - 1) + (b.length - 1));
}

function localPart(emailKeyValue) {
  const at = String(emailKeyValue || '').lastIndexOf('@');
  return at === -1 ? '' : emailKeyValue.slice(0, at);
}

function memoryAllow(key, limit, windowMs) {
  const now = Date.now();
  const prev = (memoryHits.get(key) || []).filter((t) => now - t < windowMs);
  if (prev.length >= limit) {
    memoryHits.set(key, prev);
    const retryAfter = Math.max(1, Math.ceil((prev[0] + windowMs - now) / 1000));
    return { ok: false, retryAfter };
  }
  prev.push(now);
  memoryHits.set(key, prev);
  return { ok: true };
}

function pruneMemory() {
  const now = Date.now();
  for (const [key, stamps] of memoryHits.entries()) {
    const valid = stamps.filter((t) => now - t < LIMITS.ipDayMs);
    if (valid.length === 0) memoryHits.delete(key);
    else memoryHits.set(key, valid);
  }
  for (const [key, stamp] of recentAccepts.entries()) {
    if (now - stamp > LIMITS.personMs) recentAccepts.delete(key);
  }
}

setInterval(pruneMemory, 5 * 60 * 1000).unref?.();

function isSchemaError(err) {
  // Match Prisma codes only. The message includes the query source, which
  // mentions these column names even for ordinary connection failures.
  return !!err && (err.code === 'P2021' || err.code === 'P2022');
}

async function durableReady() {
  if (schemaReady) return true;
  if (!prisma.contactAttempt) {
    warnSchema('Prisma client has no ContactAttempt model. Run prisma generate, then apply the schema.');
    return false;
  }
  try {
    await prisma.contactAttempt.findFirst({ select: { id: true } });
    schemaReady = true;
    return true;
  } catch (err) {
    const reason = isSchemaError(err)
      ? 'Contact guard tables are missing. Apply the Prisma schema. In-memory limits are active on this instance only.'
      : `Contact guard database unavailable (${err.code || 'connection error'}). In-memory limits are active on this instance only.`;
    warnSchema(reason);
    return false;
  }
}

const ABUSE_COPY = {
  flood: {
    title: 'Caught.',
    body: 'You are hammering a personal contact form. That is not ambition. It is spam. Stop, and do not come back until the block is over.',
  },
  duplicate: {
    title: 'I already heard you.',
    body: 'Same person. Same pitch. Another send. I kept the first message. The rest is you wasting both of our time.',
  },
  disposable: {
    title: 'Coward’s inbox.',
    body: 'A burner address is how people hide. If you wanted an answer, you would use a mailbox you actually read.',
  },
  honeypot: {
    title: 'You tripped the wire.',
    body: 'That field is hidden on purpose. You filled it anyway. The form knows what you are, and it is not someone I need to meet.',
  },
  links: {
    title: 'This is not a billboard.',
    body: 'A note stuffed with links is an ad. I do not take ads through this form. Rewrite it like a person, or leave.',
  },
};

function withAbuse(result, kind) {
  const copy = ABUSE_COPY[kind];
  result.abuse = true;
  result.abuseTitle = copy.title;
  result.abuseBody = copy.body;
  return result;
}

function limited(error, retryAfter) {
  return withAbuse(
    { ok: false, status: 429, error, retryAfter: retryAfter || 60, outcome: 'limited' },
    'flood'
  );
}

function duplicate(error) {
  return withAbuse(
    { ok: false, status: 409, error, outcome: 'duplicate' },
    'duplicate'
  );
}

function rejected(error) {
  return { ok: false, status: 400, error, outcome: 'rejected' };
}

function abuseReject(error, kind) {
  return withAbuse({ ok: false, status: 400, error, outcome: 'rejected' }, kind);
}

function thinkWait(retryAfter) {
  return {
    ok: false,
    status: 429,
    error: 'Please wait a moment, then send the message again.',
    retryAfter,
    outcome: 'limited',
  };
}

function validateFields(name, email, message) {
  if (!name || !email || !message) {
    return rejected('All fields are required.');
  }
  if (name.length > MAX_NAME || email.length > MAX_EMAIL || message.length > MAX_MESSAGE) {
    return rejected('That message is too long. Please shorten it and try again.');
  }
  if (message.length < MIN_MESSAGE) {
    return rejected('Please write a slightly longer message.');
  }
  if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(name + email + message)) {
    return rejected('That message contains characters I can’t accept.');
  }
  if (/https?:\/\/|www\./i.test(name)) {
    return abuseReject('Please use your name, not a link.', 'links');
  }
  const emailKey = canonicalEmail(email);
  if (!emailKey || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return rejected('Please enter a valid email address.');
  }
  const domain = emailKey.slice(emailKey.lastIndexOf('@') + 1);
  if (DISPOSABLE_DOMAINS.has(domain)) {
    return abuseReject('Please use a permanent email address so I can reply.', 'disposable');
  }
  const urlCount = (message.match(/https?:\/\/|www\./gi) || []).length;
  if (urlCount > 4) {
    return abuseReject('Please remove the extra links and send the note again.', 'links');
  }
  return { ok: true, emailKey, nameKey: nameKey(name), messageKey: messageKey(message) };
}

function checkThinkTime(req) {
  if (!req.session) return null;
  const seen = req.session.contactSeenAt;
  if (!seen) {
    req.session.contactSeenAt = Date.now();
    return thinkWait(2);
  }
  const elapsed = Date.now() - seen;
  if (elapsed < LIMITS.minThinkMs) {
    return thinkWait(Math.ceil((LIMITS.minThinkMs - elapsed) / 1000));
  }
  return null;
}

async function recordAttempt(ipHash, emailKey, outcome) {
  if (!(await durableReady())) return;
  try {
    await prisma.contactAttempt.create({
      data: { ipHash, emailKey: emailKey || null, outcome },
    });
    const now = Date.now();
    if (now - lastPrune > 60 * 60 * 1000) {
      lastPrune = now;
      prisma.contactAttempt.deleteMany({
        where: { createdAt: { lt: new Date(now - 8 * LIMITS.ipDayMs) } },
      }).catch((err) => console.error('Contact attempt prune failed:', err.message));
    }
  } catch (err) {
    if (isSchemaError(err) || err.code === 'P1001') return;
    throw err;
  }
}

async function countSince(model, where, since) {
  return prisma[model].count({
    where: { ...where, createdAt: { gte: since } },
  });
}

async function screenDurable(ipHash, fields) {
  const now = Date.now();
  const burstSince = new Date(now - LIMITS.ipBurstMs);
  const hourSince = new Date(now - LIMITS.ipHourMs);
  const daySince = new Date(now - LIMITS.ipDayMs);
  const weekSince = new Date(now - LIMITS.emailWeekMs);

  const [burst, hour, dayAttempts, acceptedDay, emailDay, emailWeek] = await Promise.all([
    countSince('contactAttempt', { ipHash }, burstSince),
    countSince('contactAttempt', { ipHash }, hourSince),
    countSince('contactAttempt', { ipHash }, daySince),
    countSince('contactSubmission', { ipHash }, daySince),
    countSince('contactSubmission', { emailKey: fields.emailKey }, daySince),
    countSince('contactSubmission', { emailKey: fields.emailKey }, weekSince),
  ]);

  if (burst >= LIMITS.ipBurst) {
    return limited('Too many attempts from your network. Please try again in a few minutes.', 600);
  }
  if (hour >= LIMITS.ipHour) {
    return limited('Too many attempts from your network. Please try again later.', 3600);
  }
  if (dayAttempts >= LIMITS.ipDayAttempts || acceptedDay >= LIMITS.ipDayAccepted) {
    return limited('This network has reached today’s message limit. Please try again tomorrow.', 24 * 60 * 60);
  }
  if (emailDay >= LIMITS.emailDay || emailWeek >= LIMITS.emailWeek) {
    return limited('This email has already sent a message recently. I’ll reply to that one.', 12 * 60 * 60);
  }

  const lookbackSince = new Date(now - LIMITS.contentMs);
  const recent = await prisma.contactSubmission.findMany({
    where: {
      createdAt: { gte: lookbackSince },
      OR: [
        { emailKey: fields.emailKey },
        { ipHash },
        { messageKey: fields.messageKey },
        { nameKey: fields.nameKey },
      ],
    },
    select: {
      emailKey: true,
      ipHash: true,
      nameKey: true,
      messageKey: true,
      message: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 40,
  });

  const incomingLocal = localPart(fields.emailKey);
  const incomingText = normalizeMessage(fields.messageText);

  for (const row of recent) {
    const age = now - new Date(row.createdAt).getTime();
    const sameEmail = row.emailKey && row.emailKey === fields.emailKey;
    const sameIp = row.ipHash && row.ipHash === ipHash;
    const sameName = row.nameKey && row.nameKey === fields.nameKey && fields.nameKey.length >= 5;
    const text = normalizeMessage(row.message);
    const similarity = dice(incomingText, text);
    const rowLocal = localPart(row.emailKey);

    if (sameEmail && age < LIMITS.duplicateEmailMs) {
      return duplicate('I already have a recent message from this email. I’ll reply to that one.');
    }
    if (row.messageKey && row.messageKey === fields.messageKey && age < LIMITS.contentMs) {
      return duplicate('That message matches one I already received.');
    }
    if ((sameEmail || sameIp) && similarity >= 0.9 && age < LIMITS.personMs) {
      return duplicate('That looks like a message I already have. I’ll follow up on the earlier one.');
    }
    if (sameName && sameIp && row.emailKey !== fields.emailKey && age < LIMITS.personMs) {
      const localSim = dice(rowLocal, incomingLocal);
      if (localSim >= 0.6 || similarity >= 0.55) {
        return duplicate('I already have a message from you. I’ll follow up on that one.');
      }
    }
    const samePersonAlias = rowLocal && rowLocal === incomingLocal && incomingLocal.length >= 4
      && row.emailKey !== fields.emailKey
      && dice(row.nameKey || '', fields.nameKey) >= 0.72;
    if (samePersonAlias && age < LIMITS.contentMs) {
      return duplicate('I already have a message from you. I’ll follow up on that one.');
    }
    if (sameName && similarity >= 0.96 && age < LIMITS.contentMs) {
      return duplicate('That message matches one I already received.');
    }
  }

  return { ok: true };
}

function screenMemory(ipHash, fields) {
  const burst = memoryAllow(`acc:${ipHash}`, LIMITS.ipBurst, LIMITS.ipBurstMs);
  if (!burst.ok) return limited('Too many attempts from your network. Please try again in a few minutes.', burst.retryAfter);
  const hour = memoryAllow(`hour:${ipHash}`, LIMITS.ipHour, LIMITS.ipHourMs);
  if (!hour.ok) return limited('Too many attempts from your network. Please try again later.', hour.retryAfter);
  const day = memoryAllow(`day:${ipHash}`, LIMITS.ipDayAttempts, LIMITS.ipDayMs);
  if (!day.ok) return limited('This network has reached today’s message limit. Please try again tomorrow.', day.retryAfter);
  const emailDay = memoryAllow(`email-day:${fields.emailKey}`, LIMITS.emailDay, LIMITS.ipDayMs);
  if (!emailDay.ok) return limited('This email has already sent a message recently. I’ll reply to that one.', emailDay.retryAfter);
  const emailWeek = memoryAllow(`email-week:${fields.emailKey}`, LIMITS.emailWeek, LIMITS.emailWeekMs);
  if (!emailWeek.ok) return limited('This email has already sent a message recently. I’ll reply to that one.', emailWeek.retryAfter);

  const lastSame = recentAccepts.get(`msg:${fields.messageKey}`);
  if (lastSame && Date.now() - lastSame < LIMITS.contentMs) {
    return duplicate('That message matches one I already received.');
  }
  const lastEmail = recentAccepts.get(`email:${fields.emailKey}`);
  if (lastEmail && Date.now() - lastEmail < LIMITS.duplicateEmailMs) {
    return duplicate('I already have a recent message from this email. I’ll reply to that one.');
  }
  const lastPerson = recentAccepts.get(`person:${ipHash}:${fields.nameKey}`);
  if (fields.nameKey.length >= 5 && lastPerson && Date.now() - lastPerson < LIMITS.personMs) {
    return duplicate('I already have a message from you. I’ll follow up on that one.');
  }
  return { ok: true };
}

function reserveAccept(ipHash, fields) {
  const now = Date.now();
  recentAccepts.set(`email:${fields.emailKey}`, now);
  recentAccepts.set(`msg:${fields.messageKey}`, now);
  if (fields.nameKey) recentAccepts.set(`person:${ipHash}:${fields.nameKey}`, now);
  recentAccepts.set(`local:${localPart(fields.emailKey)}`, now);
}

function releaseAccept(ipHash, fields) {
  recentAccepts.delete(`email:${fields.emailKey}`);
  recentAccepts.delete(`msg:${fields.messageKey}`);
  recentAccepts.delete(`person:${ipHash}:${fields.nameKey}`);
}

/**
 * Screen a contact submission.
 * Returns { ok: true, fields } or { ok: false, status, error, silent }.
 * `silent` means respond as if the message was accepted.
 */
async function screenContact(req, body) {
  const name = String(body.name || '').trim();
  const email = String(body.email || '').trim();
  const message = String(body.message || '').trim();
  const honeypot = String(body.fax || body.company_url || body.website || '').trim();
  const ipHash = hashIp(clientIp(req));

  // Per-instance shield. The database windows below are the real cross-instance caps.
  const burst = memoryAllow(`mem:${ipHash}`, 5, 30 * 1000);
  if (!burst.ok) {
    return limited('Too many attempts from your network. Please try again in a few minutes.', burst.retryAfter);
  }

  if (honeypot) {
    await recordAttempt(ipHash, null, 'honeypot');
    return withAbuse({
      ok: false,
      status: 400,
      error: 'That submission was rejected.',
      outcome: 'honeypot',
    }, 'honeypot');
  }

  const think = checkThinkTime(req);
  if (think) {
    await recordAttempt(ipHash, null, 'limited');
    return think;
  }

  const fields = validateFields(name, email, message);
  if (!fields.ok) {
    await recordAttempt(ipHash, null, fields.outcome);
    return fields;
  }
  fields.messageText = message;
  fields.name = name;
  fields.email = email;

  const quickKey = `${ipHash}:${fields.emailKey}`;
  const lastQuick = recentAccepts.get(`quick:${quickKey}`);
  if (lastQuick && Date.now() - lastQuick < LIMITS.doubleSubmitMs) {
    await recordAttempt(ipHash, fields.emailKey, 'duplicate');
    return duplicate('I already have that message. I’ll follow up on it.');
  }

  let decision;
  if (await durableReady()) {
    try {
      decision = await screenDurable(ipHash, fields);
    } catch (err) {
      if (!isSchemaError(err)) throw err;
      warnSchema('Contact guard schema missing during screening. Falling back to in-memory limits.');
      decision = screenMemory(ipHash, fields);
    }
  } else {
    decision = screenMemory(ipHash, fields);
  }

  if (!decision.ok) {
    await recordAttempt(ipHash, fields.emailKey, decision.outcome);
    return decision;
  }

  recentAccepts.set(`quick:${quickKey}`, Date.now());
  reserveAccept(ipHash, fields);
  return {
    ok: true,
    ipHash,
    fields,
    async release() {
      releaseAccept(ipHash, fields);
      recentAccepts.delete(`quick:${quickKey}`);
    },
    async commit() {
      await recordAttempt(ipHash, fields.emailKey, 'accepted');
    },
  };
}

async function saveContactSubmission(screen) {
  const data = {
    name: screen.fields.name,
    email: screen.fields.email,
    message: screen.fields.messageText,
    ipHash: screen.ipHash,
    emailKey: screen.fields.emailKey,
    nameKey: screen.fields.nameKey,
    messageKey: screen.fields.messageKey,
  };
  try {
    await prisma.contactSubmission.create({ data });
  } catch (err) {
    if (!isSchemaError(err)) throw err;
    warnSchema('Contact identity columns are missing. Saving without them. Apply the Prisma schema.');
    await prisma.contactSubmission.create({
      data: { name: data.name, email: data.email, message: data.message },
    });
  }
  await screen.commit().catch((err) => {
    console.error('Failed to record accepted contact attempt:', err.message);
  });
}

module.exports = {
  screenContact,
  saveContactSubmission,
  canonicalEmail,
  nameKey,
  messageKey,
  dice,
  LIMITS,
};
