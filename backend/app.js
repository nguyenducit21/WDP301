// ... existing code ...

// Import routes
const menuItemRoutes = require('./routes/menuItem.routes');
const categoryRoutes = require('./routes/category.routes');
const reservationRoutes = require('./routes/reservation.routes');
const tableRoutes = require('./routes/table.routes');

// ... existing middleware code ...

// Register routes
app.use('/api/menu-items', menuItemRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/reservations', reservationRoutes);
app.use('/api/tables', tableRoutes);

// ... rest of the code ...