const { pool } = require('../config/database');
const UserModel = require('../models/user.model');
const OrderModel = require('../models/order.model');

class OrderService {
    static async createOrderWithTransaction(userData, orderData) {
        let connection;
        try {
            connection = await pool.getConnection();
            await connection.beginTransaction();

            const existingUsers = await UserModel.findExact(userData.email, userData.mobile, connection);
            
            let userId;
            if (existingUsers.length > 0) {
                userId = existingUsers[0].user_id;
            } else {
                userId = await UserModel.create(userData, connection);
            }

            let totalAmount = 0;
            for (const item of orderData.items) {
                totalAmount += item.quantity * item.price;
            }

            const orderId = await OrderModel.create(userId, orderData.order_date, totalAmount, connection);

            const itemValues = orderData.items.map(item => [orderId, item.product_name, item.quantity, item.price]);
            await OrderModel.createItems(itemValues, connection);

            await connection.commit();
            
            return {
                order_id: orderId,
                totalAmount,
                itemsCount: orderData.items.length
            };
        } catch (error) {
            console.error('Original transaction error:', error);
            if (connection) {
                try {
                    await connection.rollback();
                } catch (rollbackError) {
                    console.error('Rollback failed:', rollbackError.message);
                }
            }
            throw error;
        } finally {
            if (connection) {
                connection.release();
            }
        }
    }
}

module.exports = OrderService;
