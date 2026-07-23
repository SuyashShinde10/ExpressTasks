const { pool } = require('../config/database');

class UserModel {
    static async findByEmailOrMobile(email, mobile) {
        const [rows] = await pool.query(
            'SELECT email, mobile, status FROM users WHERE email = ? OR mobile = ?',
            [email, mobile]
        );
        return rows;
    }

    static async findExact(email, mobile, connection) {
        const db = connection || pool;
        const [rows] = await db.query(
            'SELECT user_id FROM users WHERE email = ? AND mobile = ?',
            [email, mobile]
        );
        return rows;
    }

    static async create(user, connection) {
        const db = connection || pool;
        const [result] = await db.query(
            'INSERT INTO users (full_name, email, mobile) VALUES (?, ?, ?)',
            [user.full_name, user.email, user.mobile]
        );
        return result.insertId;
    }
}

module.exports = UserModel;
