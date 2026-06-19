const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.render('about', {
    title: 'About',
    team: [
      { name: 'Alex Rivera', role: 'Lead Engineer', avatar: '👨‍💻' },
      { name: 'Sam Chen', role: 'UI Designer', avatar: '🎨' },
      { name: 'Jordan Blake', role: 'DevOps', avatar: '⚙️' },
    ],
  });
});

module.exports = router;
