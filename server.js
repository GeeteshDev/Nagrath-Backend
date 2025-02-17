const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const connectDB = require('./config/db');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');
const multer = require('multer'); // Import multer for error handling
const User = require('./models/userModel');

// Environment variables
dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();

// Increase the payload limit
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));

// CORS Configuration
const allowedOrigins = new Set([
  'https://nagrath-frontend-kohl.vercel.app',
  // 'https://nagrath-frontend-kohl.vercel.app/'
  'http://localhost:5173',
  // 'https://nagrath-frontend-ten.vercel.app'
]);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.has(origin)) {
      callback(null, true);
    } else {
      console.warn(`Blocked by CORS: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

// Handle preflight requests
app.options('*', cors());

// Logging for development
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Super Admin Creation Logic
const createSuperAdmin = async () => {
  try {
    const existingSuperAdmin = await User.findOne({ role: 'super-admin' });
    if (!existingSuperAdmin) {
      const superAdmin = new User({
        name: 'Super Admin',
        email: process.env.SUPER_ADMIN_EMAIL,
        password: process.env.SUPER_ADMIN_PASSWORD,
        role: 'super-admin',
      });
      await superAdmin.save();
      console.log('Super Admin created successfully');
    } else {
      console.log('Super Admin already exists');
    }
  } catch (error) {
    console.error(`Error creating Super Admin: ${error.message}`);
  }
};
createSuperAdmin();

// Import Routes
const adminRoutes = require('./routes/adminRoutes');
const patientRoutes = require('./routes/patientRoutes');
const authRoutes = require('./routes/authRoutes');

// Apply Routes
app.use('/api/admins', adminRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/auth', authRoutes);

// Multer Error Handling Middleware
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ message: 'Multer error', error: err.message });
  } else if (err) {
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
  next();
});

// General Error Handlers
app.use(notFound);
app.use(errorHandler);

// Server Initialization
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
