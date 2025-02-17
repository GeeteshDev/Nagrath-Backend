const Patient = require('../models/patientModel');
const QRCode = require('qrcode');
const uploadToCloudinary = require('../utils/cloudinary');
const upload = require('../middleware/uploadMiddleware')

const createPatient = async (req, res) => {
  try {
    console.log('Received files:', req.files);
    console.log('Received body:', req.body);

    // Upload photo to Cloudinary
    const photoResult = req.files?.photo?.[0]
      ? await uploadToCloudinary(req.files.photo[0].buffer, 'patients/photos')
      : null;

    // Upload documents
    const documentFiles = [];
    if (req.files?.documentFiles) {
      for (const file of req.files.documentFiles) {
        const result = await uploadToCloudinary(file.buffer, 'patients/documents', 'raw');
        documentFiles.push({
          fileName: file.originalname,
          fileUrl: result.secure_url,
          fileType: file.mimetype,
        });
      }
    }

    // Parse patient data
    const parsedData = {
      name: req.body.name,
      age: req.body.age,
      mobile: req.body.mobile,
      addressLine1: req.body.addressLine1,
      address: req.body.address,
      pincode: req.body.pincode,
      district: req.body.district,
      country: req.body.country,
      gender: req.body.gender,
      dateOfBirth: req.body.dateOfBirth,
      aadharNumber: req.body.aadharNumber,
      city: req.body.city,
      state: req.body.state,
      bloodGroup: req.body.bloodGroup,
      hemoglobin: req.body.hemoglobin ? JSON.parse(req.body.hemoglobin) : {},
      bloodPressure: req.body.bloodPressure ? JSON.parse(req.body.bloodPressure) : {},
      heartRate: req.body.heartRate ? JSON.parse(req.body.heartRate) : {},
      calcium: req.body.calcium ? JSON.parse(req.body.calcium) : {},
      fastingBloodSugar: req.body.fastingBloodSugar ? JSON.parse(req.body.fastingBloodSugar) : {},
      bloodCbc: req.body.bloodCbc ? JSON.parse(req.body.bloodCbc) : {},
      urineTest: req.body.urineTest ? JSON.parse(req.body.urineTest) : {},
      lipidProfile: req.body.lipidProfile ? JSON.parse(req.body.lipidProfile) : {},
      tshTest: req.body.tshTest ? JSON.parse(req.body.tshTest) : {},
    };

    // Create patient instance
    const newPatient = new Patient({
      admin: req.user._id,
      ...parsedData,
      photo: photoResult?.secure_url || '',
      documentFiles,
    });

    await newPatient.save();

    // Generate QR code for patient
    const qrData = `${process.env.CLIENT_ORIGIN || 'http://localhost:5173'}/patients/${newPatient._id}`;
    try {
      const qrCode = await QRCode.toDataURL(qrData);
      newPatient.qrCode = qrCode;
    } catch (qrError) {
      console.error('QR Code generation failed:', qrError);
      return res.status(500).json({ message: 'QR code generation failed' });
    }

    await newPatient.save();
    res.status(201).json(newPatient);
  } catch (error) {
    console.error('Error creating patient:', error);
    res.status(400).json({
      message: 'Invalid patient data',
      error: error.message,
      ...(error.name === 'SyntaxError' && { details: 'Invalid JSON format for nested objects' }),
    });
  }
};

const getPatients = async (req, res) => {
  try {
    const patients = await Patient.find();
    res.json(patients);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving patients', error: error.message });
  }
};

// `getPatientById` to format both photo and document files as base64
const getPatientById = async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id);

    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' });
    }

    // Convert patient to plain object for easier manipulation
    let patientData = patient.toObject();

    res.json(patientData);
  } catch (error) {
    console.error('Error retrieving patient:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// const updatePatient = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const patient = await Patient.findById(id);

//     if (!patient) {
//       return res.status(404).json({ message: 'Patient not found' });
//     }

//     // Update fields from req.body, skipping undefined values
//     Object.keys(req.body).forEach((key) => {
//       if (req.body[key] !== undefined) {
//         patient[key] = req.body[key];
//       }
//     });


//     // Update the QR code with the new patient URL if necessary
//     const qrData = `${process.env.FRONTEND_URL}/admin/patients/${patient._id}`;
//     patient.qrCode = await QRCode.toDataURL(qrData);

//     const updatedPatient = await patient.save();
//     res.json(updatedPatient);
//   } catch (error) {
//     console.error('Error updating patient:', error);
//     res.status(400).json({ message: 'Error updating patient', error: error.message });
//   }
// };


// Delete Patient
const updatePatient = async (req, res) => {
  upload(req, res, async (err) => {
    if (err) {
      console.error('Multer error:', err);
      return res.status(400).json({ message: 'File upload error' });
    }

    try {
      const { id } = req.params;
      const patient = await Patient.findById(id);

      if (!patient) {
        return res.status(404).json({ message: 'Patient not found' });
      }

      // Handle photo upload (if provided)
      let photoResult;
      if (req.files?.photo) {
        photoResult = await uploadToCloudinary(req.files.photo[0].buffer, 'patients/photos');
        patient.photo = photoResult.secure_url; // Update patient's photo
      }

      // Handle documents upload (if provided)
      const documentFiles = [];
      if (req.files?.documents) {
        for (const file of req.files.documents) {
          const result = await uploadToCloudinary(file.buffer, 'patients/documents', 'raw');
          documentFiles.push({
            fileName: file.originalname,
            fileUrl: result.secure_url,
            fileType: file.mimetype,
          });
        }
        patient.documents = documentFiles; // Update patient's documents
      }

      // Update other fields from req.body, skipping undefined values
      Object.keys(req.body).forEach((key) => {
        if (req.body[key] !== undefined) {
          patient[key] = req.body[key];
        }
      });

      // Update the QR code with the new patient URL if necessary
      const qrData = `${process.env.FRONTEND_URL}/admin/patients/${patient._id}`;
      patient.qrCode = await QRCode.toDataURL(qrData);

      const updatedPatient = await patient.save();
      res.json(updatedPatient);
    } catch (error) {
      console.error('Error updating patient:', error);
      res.status(400).json({ message: 'Error updating patient', error: error.message });
    }
  });
};

const deletePatient = async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id);

    if (patient) {
      await patient.remove();
      res.json({ message: 'Patient removed' });
    } else {
      res.status(404).json({ message: 'Patient not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error deleting patient', error: error.message });
  }
};

// Search Patient
const SearchPatient = async (req, res) => {
  const { name, city, district, state, country } = req.query;
  const filters = {};

  if (name) filters.name = { $regex: name, $options: 'i' };
  if (city) filters.city = { $regex: city, $options: 'i' };
  if (district) filters.district = { $regex: district, $options: 'i' };
  if (state) filters.state = { $regex: state, $options: 'i' };
  if (country) filters.country = { $regex: country, $options: 'i' };

  try {
    const patients = await Patient.find(filters);
    res.status(200).json(patients);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching patients', error: error.message });
  }
};

const getPatientQRCode = async (req, res) => {
  try {
    const patientId = req.params.id;
    const patient = await Patient.findById(patientId);

    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' });
    }

    // Define the public patient URL to encode in the QR code
    const publicUrl = `${process.env.FRONTEND_URL || 'https://nagrath-frontend.vercel.app'}/public-patient/${patientId}`;

    // Generate the QR code with the public URL
    const qrCodeDataUrl = await QRCode.toDataURL(publicUrl);

    res.status(200).json({ qrCode: qrCodeDataUrl });
  } catch (error) {
    console.error('Error generating QR code:', error);
    res.status(500).json({ message: 'Error generating QR code', error: error.message });
  }
};


// Public controller to get limited patient data
// Ensure all fields are included in the response
const getPublicPatientById = async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id).select('-documentFile -qrCode');
    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' });
    }
    res.status(200).json(patient);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching patient details', error });
  }
};



// Updated `multiUpload` for file handling in createPatient and updatePatient
module.exports = {
  createPatient: [createPatient],
  getPatients,
  getPatientById,
  updatePatient: [updatePatient],
  deletePatient,
  SearchPatient,
  getPublicPatientById,
  getPatientQRCode // New export for QR code endpoint
};


