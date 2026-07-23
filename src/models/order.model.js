const { pool } = require('../config/database');

class OrderModel {
    static async create(userId, orderDate, totalAmount, connection) {
        const db = connection || pool;
        const [result] = await db.query(
            'INSERT INTO orders (user_id, order_date, total_amount) VALUES (?, ?, ?)',
            [userId, orderDate, totalAmount]
        );
        return result.insertId;
    }

    static async createItems(itemValues, connection) {
        const db = connection || pool;
        await db.query(
            'INSERT INTO order_items (order_id, product_name, quantity, price) VALUES ?',
            [itemValues]
        );
    }

    static async findById(orderId) {
        const query = `
            SELECT 
                u.user_id, u.full_name, u.email, u.mobile, u.status,
                o.order_id, o.order_date, o.total_amount,
                i.item_id, i.product_name, i.quantity, i.price
            FROM orders o
            JOIN users u ON o.user_id = u.user_id
            JOIN order_items i ON o.order_id = i.order_id
            WHERE o.order_id = ?
        `;
        const [rows] = await pool.query(query, [orderId]);
        return rows;
    }
}

module.exports = OrderModel;
