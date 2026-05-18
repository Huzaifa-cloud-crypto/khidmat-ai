const express = require('express');
const path = require('path');
const cors = require('cors');
const serviceRoutes = require('./routes/serviceRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const providerRoutes = require('./routes/providerRoutes');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/service', serviceRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/data', providerRoutes);

// Serve the frontend statically
app.use(express.static(path.join(__dirname, '../../mobile_web')));

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'OK', agent: 'Khidmat.ai' });
});

module.exports = app;
