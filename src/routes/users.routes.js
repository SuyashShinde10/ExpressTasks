const express = require('express');
const router = express.Router();
const validate = require('../middlewares/validate');
const { userValidationSchema } = require('../utils/validationSchemas');
const UserController = require('../controllers/user.controller');

router.post('/validate', validate(userValidationSchema), UserController.validateUser);

module.exports = router;
