const Joi = require('joi');

const userValidationSchema = Joi.object({
    email: Joi.string().email().required(),
    mobile: Joi.string().pattern(/^\d{10}$/).required(),
    status: Joi.string().valid('Active').required()
});

module.exports = {
    userValidationSchema
};
