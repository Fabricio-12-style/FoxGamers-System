const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

router.get('/', userController.getUsers);
router.post('/', userController.createUser);
router.put('/bloquear/:id', userController.toggleBlockUser);
router.put('/:id', userController.updateUser);

router.delete('/:id', userController.deleteUser);

module.exports = router;