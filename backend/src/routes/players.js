const express = require('express');
const router = express.Router({ mergeParams: true });
const authMiddleware = require('../middleware/auth');
const playerController = require('../controllers/playerController');

router.get('/', authMiddleware, playerController.getPlayers);
router.post('/', authMiddleware, playerController.createPlayer);
router.put('/:playerId', authMiddleware, playerController.updatePlayer);
router.delete('/:playerId', authMiddleware, playerController.deletePlayer);

module.exports = router;
