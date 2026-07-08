require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });
const mysql = require('mysql2/promise');

// Connection Details from .env
const dbConfig = {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

const pool = mysql.createPool(dbConfig);

async function initializeDatabase() {
    let connection;
    try {
        // First, connect WITHOUT the database name so we can create it if it doesn't exist
        const initPool = mysql.createPool({
            host: process.env.DB_HOST,
            port: process.env.DB_PORT,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            waitForConnections: true,
            connectionLimit: 1,
            queueLimit: 0
        });
        
        connection = await initPool.getConnection();
        
        // Ensure the database exists
        await connection.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME}\``);
        await connection.query(`USE \`${process.env.DB_NAME}\``);

        // Create tables
        await connection.query(`
            CREATE TABLE IF NOT EXISTS users (
                user_id INT AUTO_INCREMENT PRIMARY KEY,
                full_name VARCHAR(255) NOT NULL,
                email VARCHAR(255) NOT NULL UNIQUE,
                mobile VARCHAR(15) NOT NULL UNIQUE,
                status ENUM('Active', 'Inactive') DEFAULT 'Active'
            )
        `);

        await connection.query(`
            CREATE TABLE IF NOT EXISTS orders (
                order_id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                order_date DATE NOT NULL,
                total_amount DECIMAL(10, 2) NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(user_id)
            )
        `);

        await connection.query(`
            CREATE TABLE IF NOT EXISTS order_items (
                item_id INT AUTO_INCREMENT PRIMARY KEY,
                order_id INT NOT NULL,
                product_name VARCHAR(255) NOT NULL,
                quantity INT NOT NULL,
                price DECIMAL(10, 2) NOT NULL,
                FOREIGN KEY (order_id) REFERENCES orders(order_id)
            )
        `);
        console.log(`Database initialized successfully locally (${process.env.DB_NAME})!`);
    } catch (error) {
        console.error("Error initializing database:", error);
    } finally {
        if (connection) connection.release();
    }
}

module.exports = {
    pool,
    initializeDatabase
};
