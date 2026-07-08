const express = require('express');
const { initializeDatabase } = require('./database');
const orderRoutes = require('./routes/orders');
const userRoutes = require('./routes/users');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.use('/api/orders', orderRoutes);
app.use('/api/users', userRoutes);

initializeDatabase().then(() => {
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
}).catch(err => {
    process.exit(1);
});
