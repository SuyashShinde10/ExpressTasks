const OrderModel = require('../models/order.model');
const OrderService = require('../services/order.service');

class OrderController {
    static async createOrder(req, res) {
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

        try {
            const result = await OrderService.createOrderWithTransaction(user, order);
            
            res.status(201).json({
                message: 'Order created successfully',
                order_id: result.order_id,
                summary: {
                    total_amount: result.totalAmount,
                    items_count: result.itemsCount
                }
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Internal server error during order creation' });
        }
    }

    static async getOrder(req, res) {
        const orderId = req.params.id;

        try {
            const rows = await OrderModel.findById(orderId);

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
            console.error(error);
            res.status(500).json({ error: 'Internal server error during fetch' });
        }
    }
}

module.exports = OrderController;
