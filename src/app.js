const express = require('express');
const orderRoutes = require('./routes/orders.routes');
const userRoutes = require('./routes/users.routes');

const app = express();

app.use(express.json());

app.use('/api/orders', orderRoutes);
app.use('/api/users', userRoutes);

module.exports = app;
