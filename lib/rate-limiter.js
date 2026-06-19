const rateLimitCache = new Map();

/**
 * Custom dynamic rate-limiting middleware.
 * - Public requests: Limit to 5 requests per minute.
 * - Authenticated requests: Limit to 60 requests per minute.
 */
function aiRateLimiter(req, res, next) {
  const isAuth = !!(req.session && req.session.user);
  
  // Use session user ID if available, otherwise fallback to IP address
  const clientKey = isAuth ? `auth_user_${req.session.user.id}` : `public_ip_${req.ip || req.headers['x-forwarded-for'] || 'unknown_ip'}`;
  const now = Date.now();
  const oneMinuteWindow = 60 * 1000;

  // Retrieve existing request history for the client key
  let timestamps = rateLimitCache.get(clientKey) || [];

  // Filter timestamps to only keep requests within the last 60 seconds
  timestamps = timestamps.filter(t => now - t < oneMinuteWindow);

  const limit = isAuth ? 60 : 5;

  if (timestamps.length >= limit) {
    console.warn(`⚠️ [RateLimiter] Rate limit exceeded for ${clientKey} (${timestamps.length}/${limit} requests)`);
    return res.status(429).json({
      error: 'Too many requests. Please wait a minute before message retry.'
    });
  }

  // Record current request and save to cache
  timestamps.push(now);
  rateLimitCache.set(clientKey, timestamps);

  next();
}

// Clean up cache periodically (every 5 minutes) to prevent memory leaks
function cleanCache() {
  const now = Date.now();
  const oneMinuteWindow = 60 * 1000;
  for (const [key, timestamps] of rateLimitCache.entries()) {
    const valid = timestamps.filter(t => now - t < oneMinuteWindow);
    if (valid.length === 0) {
      rateLimitCache.delete(key);
    } else {
      rateLimitCache.set(key, valid);
    }
  }
}
setInterval(cleanCache, 5 * 60 * 1000);

module.exports = {
  aiRateLimiter
};
