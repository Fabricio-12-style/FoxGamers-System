const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { verificarToken, soloAdministradores } = require('../middlewares/authMiddleware');

router.get('/', verificarToken, soloAdministradores, userController.getUsers);
router.post('/', verificarToken, soloAdministradores, userController.createUser);
router.put('/:id', verificarToken, soloAdministradores, userController.updateUser);
router.put('/bloquear/:id', verificarToken, soloAdministradores, userController.toggleBlockUser);
router.delete('/:id', verificarToken, soloAdministradores, userController.deleteUser);

module.exports = router;