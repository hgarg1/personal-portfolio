const express  = require('express');
const router   = express.Router();
const portfolio = require('../data/portfolio');

router.get('/', (req, res) => {
  res.render('index', {
    title: `${portfolio.name} — AI Systems Architect & Full-Stack Engineer`,
    ...portfolio,
  });
});

module.exports = router;
