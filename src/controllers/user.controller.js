const UserModel = require('../models/user.model');

class UserController {
    static async validateUser(req, res) {
        const { email, mobile } = req.validatedBody || req.body;

        try {
            const rows = await UserModel.findByEmailOrMobile(email, mobile);

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
            console.error(error);
            res.status(500).json({ error: 'Internal server error during validation' });
        }
    }
}

module.exports = UserController;
