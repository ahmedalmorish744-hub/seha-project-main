const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const db = require('./db');
const mapping = require('./mappings');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { generateCompanionReport } = require('./utils/reportGenerator');
const { generateSickLeaveReport } = require('./utils/sickLeaveReportGenerator');
const { toHijri } = require('./utils/dateUtils');

const app = express();
const PORT = process.env.PORT || 3000;
const SECRET_KEY = process.env.JWT_SECRET || 'your_secret_key_here'; // Move to .env

app.use(cors({
    origin: true, // Reflects the request origin, effectively allowing all
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['Content-Disposition']
}));
app.use(bodyParser.json());
app.use('/uploads', express.static('uploads'));
app.use('/assets', express.static(path.join(__dirname, 'public/assets')));
app.use(express.urlencoded({ extended: true })); // For parsing form data

// Routes
const inquiryRoute = require('./routes/inquiry');
app.use('/inquiry', inquiryRoute);

// --- Multer Storage ---
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = 'uploads/';
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath);
        }
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

// --- Middleware ---

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.sendStatus(401);

    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) {
            console.error('Authentication Error:', err.message);
            return res.status(403).json({ error: err.message }); // Send error detail to client
        }
        req.user = user;
        next();
    });
};

const requireAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.sendStatus(403);
    }
};

// --- Auth API ---

app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const [users] = await db.query('SELECT * FROM users WHERE username = ?', [username]);
        if (users.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        const user = users[0];

        // Active Check
        if (user.is_active === 0) {
            return res.status(403).json({ error: 'Your account is disabled' });
        }

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, SECRET_KEY, { expiresIn: '12h' });
        res.json({ token, role: user.role, username: user.username });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Profile API (Authenticated User) ---

app.put('/api/profile', authenticateToken, async (req, res) => {
    const { username, password } = req.body;
    try {
        let query = 'UPDATE users SET username = ?';
        let params = [username];

        if (password) {
            const hashedPassword = await bcrypt.hash(password, 10);
            query += ', password = ?';
            params.push(hashedPassword);
        }

        query += ' WHERE id = ?';
        params.push(req.user.id);

        await db.query(query, params);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- User Management API (Admin Only) ---

app.get('/api/users', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const [users] = await db.query('SELECT id, username, role, is_active, created_at FROM users');
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/users', authenticateToken, requireAdmin, async (req, res) => {
    const { username, password, role } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const [result] = await db.query('INSERT INTO users (username, password, role, is_active) VALUES (?, ?, ?, 1)', [username, hashedPassword, role || 'user']);
        res.json({ id: result.insertId, username, role, is_active: 1 });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/users/:id', authenticateToken, requireAdmin, async (req, res) => {
    const { username, password, role, is_active } = req.body;
    try {
        let query = 'UPDATE users SET username = ?, role = ?, is_active = ?';
        let params = [username, role, is_active];

        if (password) {
            const hashedPassword = await bcrypt.hash(password, 10);
            query += ', password = ?';
            params.push(hashedPassword);
        }

        query += ' WHERE id = ?';
        params.push(req.params.id);

        await db.query(query, params);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/users/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        await db.query('DELETE FROM users WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// --- Helper for Isolation ---
// If admin, can see all (OR just their own? User said "Admin control all components").
// I will interpret "control all" as seeing everything.
const applyIsolation = (query, params, user) => {
    if (user.role === 'admin') return { query, params };

    // If query has WHERE, add AND user_id = ?
    // If not, add WHERE user_id = ?
    if (query.toLowerCase().includes('where')) {
        return { query: query + ' AND user_id = ?', params: [...params, user.id] };
    } else {
        // Handle ORDER BY or LIMIT which might be at the end
        // Simple heuristic: insert WHERE before ORDER BY or LIMIT if they exist, or at end
        const upperQ = query.toUpperCase();
        const orderIdx = upperQ.indexOf('ORDER BY');
        const limitIdx = upperQ.indexOf('LIMIT');
        const cutIdx = (orderIdx !== -1 && limitIdx !== -1) ? Math.min(orderIdx, limitIdx)
            : (orderIdx !== -1 ? orderIdx : limitIdx);

        if (cutIdx !== -1) {
            return {
                query: query.substring(0, cutIdx) + ' WHERE user_id = ? ' + query.substring(cutIdx),
                params: [user.id, ...params]
            };
        } else {
            return { query: query + ' WHERE user_id = ?', params: [...params, user.id] };
        }
    }
};

// Simplified: Just rewrite queries manually for clarity instead of regex magic which is prone to errors.

// --- Patients API ---

app.get('/manger_data/patientsall', authenticateToken, async (req, res) => {
    try {
        console.log('GET patientsall. User:', req.user.username, 'Role:', req.user.role, 'ID:', req.user.id);
        let sql = 'SELECT * FROM patients';
        let params = [];
        if (req.user.role !== 'admin') {
            sql += ' WHERE user_id = ?';
            params.push(req.user.id);
        }
        sql += ' ORDER BY created_at DESC';

        console.log('Executing SQL:', sql);
        console.log('Params:', params);

        const [rows] = await db.query(sql, params);
        res.json(rows.map(mapping.mapPatientToAPI));
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

app.get('/manger_data/user20', authenticateToken, async (req, res) => {
    try {
        let sql = 'SELECT * FROM patients';
        let params = [];
        if (req.user.role !== 'admin') {
            sql += ' WHERE user_id = ?';
            params.push(req.user.id);
        }
        sql += ' ORDER BY created_at DESC LIMIT 20';

        const [rows] = await db.query(sql, params);
        res.json(rows.map(mapping.mapPatientToAPI));
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

app.get('/manger_data/patients/:id', authenticateToken, async (req, res) => {
    try {
        let sql = 'SELECT * FROM patients WHERE id = ?';
        let params = [req.params.id];
        if (req.user.role !== 'admin') {
            sql += ' AND user_id = ?';
            params.push(req.user.id);
        }

        const [rows] = await db.query(sql, params);
        if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
        res.json(mapping.mapPatientToAPI(rows[0]));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/manger_data/patients', authenticateToken, async (req, res) => {
    try {
        const data = mapping.mapPatientFromAPI(req.body);
        data.user_id = req.user.id; // Enforce owner

        // Auto-Generate GSL/PSL Code
        if (data.hospital_id) {
            try {
                const [hospitals] = await db.query('SELECT type FROM hospitals WHERE id = ?', [data.hospital_id]);
                if (hospitals.length > 0) {
                    const hospitalType = hospitals[0].type;
                    let prefix = 'PSL';
                    // Determine Prefix
                    if (hospitalType && (
                        hospitalType.toLowerCase().includes('government') ||
                        hospitalType.toLowerCase().includes('ministry') ||
                        hospitalType.toLowerCase().includes('gsl') // Handle user's GSL type
                    )) {
                        prefix = 'GSL';
                    }

                    // Generate Unique Number (260 + 8 random digits) to make 11 digits total
                    // 260 + 8 digits = 11 digits
                    const randomPart = Math.floor(10000000 + Math.random() * 90000000); // 8 digits
                    const codeNumber = '260' + randomPart;

                    data.gsl_code = prefix + codeNumber;
                    console.log(`Generated Leave Code: ${data.gsl_code} for Hospital Type: ${hospitalType}`);
                }
            } catch (codeErr) {
                console.error("Error generating leave code:", codeErr);
                // Non-blocking? Or fail? Let's log and proceed, but user might get empty code if frontend didn't send one.
            }
        }

        // --- Calculate Hijri Dates ---
        if (data.date_from) {
            data.hijri_admission_date = toHijri(data.date_from);
        }
        if (data.date_to) {
            data.hijri_discharge_date = toHijri(data.date_to);
        }

        const [result] = await db.query('INSERT INTO patients SET ?', data);
        const [rows] = await db.query('SELECT * FROM patients WHERE id = ?', [result.insertId]);
        res.json(mapping.mapPatientToAPI(rows[0]));
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

app.delete('/manger_data/patients/:id', authenticateToken, async (req, res) => {
    try {
        let sql = 'DELETE FROM patients WHERE id = ?';
        let params = [req.params.id];
        if (req.user.role !== 'admin') {
            sql += ' AND user_id = ?';
            params.push(req.user.id);
        }
        const [result] = await db.query(sql, params);
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Not found or permission denied' });

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/manger_data/patients/:id', authenticateToken, async (req, res) => {
    try {
        const data = mapping.mapPatientFromAPI(req.body);
        Object.keys(data).forEach(key => data[key] === undefined && delete data[key]);
        delete data.user_id; // Prevent changing owner

        // Security Check: Only Admin can change 'prevent_inquiry'
        if (data.prevent_inquiry !== undefined) {
            if (req.user.role !== 'admin') {
                console.log(`Permission denied for user ${req.user.username} (role: ${req.user.role}). Removing prevent_inquiry.`);
                delete data.prevent_inquiry;
            }
        }

        // --- Calculate Hijri Dates on Update ---
        if (data.date_from) {
            data.hijri_admission_date = toHijri(data.date_from);
        }
        if (data.date_to) {
            data.hijri_discharge_date = toHijri(data.date_to);
        }

        console.log('Update Data:', data);

        if (Object.keys(data).length === 0) {
            return res.status(400).json({ error: 'No valid fields to update or permission denied' });
        }

        // Manual Query Construction to avoid "SET ?" issues
        const updates = [];
        const values = [];
        Object.keys(data).forEach(key => {
            updates.push(`${key} = ?`);
            values.push(data[key]);
        });

        let sql = `UPDATE patients SET ${updates.join(', ')} WHERE id = ?`;
        values.push(req.params.id);

        if (req.user.role !== 'admin') {
            sql += ' AND user_id = ?';
            values.push(req.user.id);
        }

        console.log('Executing SQL:', sql);
        console.log('Parameters:', values);

        const [result] = await db.query(sql, values);
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Not found or permission denied' });

        const [rows] = await db.query('SELECT * FROM patients WHERE id = ?', [req.params.id]);
        res.json(mapping.mapPatientToAPI(rows[0]));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Doctors API ---

app.get('/manger_data/doctors', authenticateToken, async (req, res) => {
    try {
        let sql = 'SELECT * FROM doctors';
        let params = [];
        if (req.user.role !== 'admin') {
            sql += ' WHERE user_id = ?';
            params.push(req.user.id);
        }
        const [rows] = await db.query(sql, params);
        res.json(rows.map(mapping.mapDoctorToAPI));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/manger_data/doctors', authenticateToken, async (req, res) => {
    try {
        const data = mapping.mapDoctorFromAPI(req.body);
        data.user_id = req.user.id;
        const [result] = await db.query('INSERT INTO doctors SET ?', data);
        const [rows] = await db.query('SELECT * FROM doctors WHERE id = ?', [result.insertId]);
        res.json(mapping.mapDoctorToAPI(rows[0]));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/manger_data/doctors/:id', authenticateToken, async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM doctors WHERE id = ?', [req.params.id]);
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Doctor not found' });
        }
        res.json(mapping.mapDoctorToAPI(rows[0]));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/manger_data/doctors/:id', authenticateToken, async (req, res) => {
    try {
        const data = mapping.mapDoctorFromAPI(req.body);
        data.user_id = req.user.id; // Ensure user_id is preserved or checked? 
        // Actually, for update we might not want to overwrite user_id if logic differs, 
        // but mapDoctorFromAPI doesn't include user_id usually.
        // Let's check mapDoctorFromAPI.

        await db.query('UPDATE doctors SET ? WHERE id = ?', [data, req.params.id]);
        const [rows] = await db.query('SELECT * FROM doctors WHERE id = ?', [req.params.id]);
        res.json(mapping.mapDoctorToAPI(rows[0]));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/manger_data/doctors/:id', authenticateToken, async (req, res) => {
    try {
        let sql = 'DELETE FROM doctors WHERE id = ?';
        let params = [req.params.id];
        if (req.user.role !== 'admin') {
            sql += ' AND user_id = ?';
            params.push(req.user.id);
        }
        await db.query(sql, params);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Hospitals API ---

app.get('/manger_data/hospitals', authenticateToken, async (req, res) => {
    try {
        console.log('GET hospitals. User:', req.user.username, 'Role:', req.user.role);
        let sql = 'SELECT * FROM hospitals';
        let params = [];
        if (req.user.role !== 'admin') {
            sql += ' WHERE user_id = ?';
            params.push(req.user.id);
        }
        const [rows] = await db.query(sql, params);
        res.json(rows.map(mapping.mapHospitalToAPI));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/manger_data/hospitals', authenticateToken, upload.single('input_central_logo'), async (req, res) => {
    try {
        console.log('Creating hospital with body:', req.body);
        const data = mapping.mapHospitalFromAPI(req.body);

        if (req.file) {
            data.logo = '/uploads/' + req.file.filename;
        }

        data.user_id = req.user.id;
        console.log('Mapped data for INSERT:', data);

        const [result] = await db.query('INSERT INTO hospitals SET ?', data);
        const [rows] = await db.query('SELECT * FROM hospitals WHERE id = ?', [result.insertId]);
        res.json(mapping.mapHospitalToAPI(rows[0]));
    } catch (err) {
        console.error('Error creating hospital:', err);
        res.status(500).json({ error: err.message });
    }
});

app.get('/manger_data/hospitals/:id', authenticateToken, async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM hospitals WHERE id = ?', [req.params.id]);
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Hospital not found' });
        }
        res.json(mapping.mapHospitalToAPI(rows[0]));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});



app.put('/manger_data/hospitals/:id', authenticateToken, upload.single('input_central_logo'), async (req, res) => {
    try {
        console.log('Updating hospital with body:', req.body);
        const data = mapping.mapHospitalFromAPI(req.body);

        if (req.file) {
            data.logo = '/uploads/' + req.file.filename;
        } else {
            // If no file uploaded, remove logo from data so it doesn't overwrite existing value with null/undefined
            delete data.logo;
        }

        await db.query('UPDATE hospitals SET ? WHERE id = ?', [data, req.params.id]);

        const [rows] = await db.query('SELECT * FROM hospitals WHERE id = ?', [req.params.id]);
        res.json(mapping.mapHospitalToAPI(rows[0]));
    } catch (err) {
        console.error('Error updating hospital:', err);
        res.status(500).json({ error: err.message });
    }
});

app.delete('/manger_data/hospitals/:id', authenticateToken, async (req, res) => {
    try {
        let sql = 'DELETE FROM hospitals WHERE id = ?';
        let params = [req.params.id];
        if (req.user.role !== 'admin') {
            sql += ' AND user_id = ?';
            params.push(req.user.id);
        }
        await db.query(sql, params);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Nationalities API ---
// Shared resource, readable by all, writable by Admin only?
// Schema update didn't put user_id on nationalities.
// Assuming Shared Read, Admin Write? Or just open for now but require auth.
// User said "Add hospital... link to user". didn't mention nationality.
// I'll keep it open for read/write but authenticated for now.

app.get('/manger_data/nationalities', authenticateToken, async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM nationalities');
        res.json(rows.map(mapping.mapNationalityToAPI));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/manger_data/nationalities', authenticateToken, async (req, res) => {
    try {
        const data = mapping.mapNationalityFromAPI(req.body);
        const [result] = await db.query('INSERT INTO nationalities SET ?', data);
        const [rows] = await db.query('SELECT * FROM nationalities WHERE id = ?', [result.insertId]);
        res.json(mapping.mapNationalityToAPI(rows[0]));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/manger_data/nationalities/:id', authenticateToken, async (req, res) => {
    try {
        await db.query('DELETE FROM nationalities WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Reports API ---

app.get('/manger_data/reports/:type/generate/:id', authenticateToken, async (req, res) => {
    const { type, id } = req.params;
    console.log(`Generating report ${type} for ID: ${id}`);

    try {
        // Fetch Patient
        const [patients] = await db.query('SELECT * FROM patients WHERE id = ?', [id]);
        if (patients.length === 0) return res.status(404).send('Patient not found');
        const patient = patients[0];

        // Fetch Hospital
        let hospital = {};
        if (patient.hospital_id) {
            const [hospitals] = await db.query('SELECT * FROM hospitals WHERE id = ?', [patient.hospital_id]);
            if (hospitals.length > 0) hospital = hospitals[0];
        }

        // Fetch Doctor (optional if details already in patient snapshot)
        let doctor = {};
        if (patient.doctor_id) {
            const [doctors] = await db.query('SELECT * FROM doctors WHERE id = ?', [patient.doctor_id]);
            if (doctors.length > 0) doctor = doctors[0];
        }

        // Fetch Nationality
        if (patient.nationality_id) {
            const [nationalities] = await db.query('SELECT * FROM nationalities WHERE id = ?', [patient.nationality_id]);
            if (nationalities.length > 0) {
                patient.nationalityObj = nationalities[0];
            }
        }

        // Decide which report to generate
        // The user specifically asked for "Companion Leave Report" logic for "export leave".
        // Use companion report for 'sick' or 'companion' types for now, or just 'sick' if that's what button sends.
        // Frontend sends 'sick' for "Leave Report" button? No, search results uses specific routes.
        // The user said "Export Leave" button in PatientsList.
        // I'll make that button trigger 'companion' type or just fallback to companion generator if type is 'companion'.

        if (type === 'companion') {
            await generateCompanionReport(patient, hospital, doctor, res);
        } else if (type === 'sick' || type === 'leave') {
            await generateSickLeaveReport(patient, hospital, doctor, res);
        } else {
            // Fallback or other reports
            res.status(400).send('Report type not supported yet');
        }

    } catch (err) {
        console.error('Report Generation Error:', err);
        res.status(500).send('Server Error');
    }
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
