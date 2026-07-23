const app = require('./src/app');
const { initializeDatabase } = require('./src/config/database');

const PORT = process.env.PORT || 3000;

initializeDatabase().then(() => {
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
}).catch(err => {
    console.error("Failed to initialize database:", err);
    process.exit(1);
});
