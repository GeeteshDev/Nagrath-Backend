const multer = require('multer');
const memoryStorage = multer.memoryStorage();

const upload = multer({
  storage: memoryStorage,
  fileFilter: (req, file, cb) => {
    console.log(`Processing file: ${file.fieldname} - ${file.originalname}`);
    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    allowedTypes.includes(file.mimetype) 
      ? cb(null, true)
      : cb(new Error('Invalid file type'), false);
  },
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 6
  }
}).fields([
  { name: 'photo', maxCount: 1 },
  { name: 'documentFiles', maxCount: 5 } // Must match frontend
]);

module.exports = upload;