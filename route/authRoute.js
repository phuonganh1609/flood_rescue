const express = require('express');
const router = express.Router();
const authController = require('../controller/authController');
const {authenticate, authorize} = require('../middleware/authMiddleware');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/user',authenticate, authController.getUser);
router.post('/createRescueTeam', authenticate, authorize([ "Rescue Coordinator", "Admin", "Manager"]), authController.createRescueTeam);
router.post('/addTeamMember', authenticate, authorize([ "Rescue Coordinator", "Admin", "Manager"]), authController.addMemberTeam);
router.post('/addRequest', authenticate, authController.addRequest);
module.exports = router;