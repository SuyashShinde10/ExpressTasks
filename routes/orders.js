const express = require('express');
const router = express.Router();
const { pool } = require('../database');

router.post('/', async (req, res) => {
    const { user, order } = req.body;

    if (!user || !user.full_name || !user.email || !user.mobile) {
        return res.status(400).json({ error: 'Missing mandatory user fields' });
    }
    if (!order || !order.order_date || !order.items || !Array.isArray(order.items) || order.items.length === 0) {
        return res.status(400).json({ error: 'Missing mandatory order fields or items' });
    }

    const productNames = order.items.map(item => item.product_name);
    const uniqueProductNames = new Set(productNames);
    if (uniqueProductNames.size !== productNames.length) {
        return res.status(400).json({ error: 'Duplicate products in the same order are not allowed' });
    }

    for (const item of order.items) {
        if (!item.product_name || !item.quantity || !item.price) {
            return res.status(400).json({ error: 'Missing mandatory fields in order items' });
        }
    }

    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        const [existingUsers] = await connection.query(
            'SELECT user_id FROM users WHERE email = ? AND mobile = ?',
            [user.email, user.mobile]
        );

        let userId;
        if (existingUsers.length > 0) {
            userId = existingUsers[0].user_id;
        } else {
            const [userInsertResult] = await connection.query(
                'INSERT INTO users (full_name, email, mobile) VALUES (?, ?, ?)',
                [user.full_name, user.email, user.mobile]
            );
            userId = userInsertResult.insertId;
        }

        let totalAmount = 0;
        for (const item of order.items) {
            totalAmount += item.quantity * item.price;
        }

        const [orderInsertResult] = await connection.query(
            'INSERT INTO orders (user_id, order_date, total_amount) VALUES (?, ?, ?)',
            [userId, order.order_date, totalAmount]
        );
        const orderId = orderInsertResult.insertId;

        const itemValues = order.items.map(item => [orderId, item.product_name, item.quantity, item.price]);
        await connection.query(
            'INSERT INTO order_items (order_id, product_name, quantity, price) VALUES ?',
            [itemValues]
        );

        await connection.commit();
        
        res.status(201).json({
            message: 'Order created successfully',
            order_id: orderId,
            summary: {
                total_amount: totalAmount,
                items_count: order.items.length
            }
        });
    } catch (error) {
        if (connection) {
            await connection.rollback();
        }
        res.status(500).json({ error: 'Internal server error during order creation' });
    } finally {
        if (connection) {
            connection.release();
        }
    }
});

router.get('/:id', async (req, res) => {
    const orderId = req.params.id;
    let connection;

    try {
        connection = await pool.getConnection();
        
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

        const [rows] = await connection.query(query, [orderId]);

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Order not found' });
        }

        const result = {
            user: {
                user_id: rows[0].user_id,
                full_name: rows[0].full_name,
                email: rows[0].email,
                mobile: rows[0].mobile,
                status: rows[0].status
            },
            order: {
                order_id: rows[0].order_id,
                order_date: rows[0].order_date,
                total_amount: rows[0].total_amount
            },
            items: rows.map(row => ({
                item_id: row.item_id,
                product_name: row.product_name,
                quantity: row.quantity,
                price: row.price
            }))
        };

        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ error: 'Internal server error during fetch' });
    } finally {
        if (connection) {
            connection.release();
        }
    }
});

module.exports = router;
