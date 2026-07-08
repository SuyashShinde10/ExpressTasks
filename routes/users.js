const express = require('express');
const router = express.Router();
const Joi = require('joi');
const { pool } = require('../database');

const userValidationSchema = Joi.object({
    email: Joi.string().email().required(),
    mobile: Joi.string().pattern(/^\d{10}$/).required(),
    status: Joi.string().valid('Active').required() // Strictly enforces 'Active'
});

router.post('/validate', async (req, res) => {
    const { error, value } = userValidationSchema.validate(req.body, { abortEarly: false });
    
    if (error) {
        const errorMessages = error.details.map(detail => detail.message);
        return res.status(400).json({ error: 'Validation failed', details: errorMessages });
    }

    const { email, mobile } = value;

    let connection;
    try {
        connection = await pool.getConnection();

        const [rows] = await connection.query(
            'SELECT email, mobile FROM users WHERE email = ? OR mobile = ?',
            [email, mobile]
        );

        if (rows.length > 0) {
            const conflicts = [];
            for (const row of rows) {
                if (row.email === email && !conflicts.includes('Email already exists')) {
                    conflicts.push('Email already exists');
                }
                if (row.mobile === mobile && !conflicts.includes('Mobile already exists')) {
                    conflicts.push('Mobile already exists');
                }
            }
            return res.status(409).json({ error: 'Conflict', details: conflicts });
        }

        res.status(200).json({ message: 'User data is valid and can be registered.' });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error during validation' });
    } finally {
        if (connection) {
            connection.release();
        }
    }
});

module.exports = router;
