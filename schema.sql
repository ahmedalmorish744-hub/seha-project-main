-- Users table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'user',
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Nationalities table
CREATE TABLE IF NOT EXISTS nationalities (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name_ar VARCHAR(255),
    name_en VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Hospitals table
CREATE TABLE IF NOT EXISTS hospitals (
    id INT AUTO_INCREMENT PRIMARY KEY,
    type VARCHAR(255),
    name_ar VARCHAR(255),
    name_en VARCHAR(255),
    logo TEXT,
    city VARCHAR(255),
    region VARCHAR(255),
    license_number VARCHAR(255),
    user_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Doctors table
CREATE TABLE IF NOT EXISTS doctors (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name_ar VARCHAR(255),
    name_en VARCHAR(255),
    specialty_ar VARCHAR(255),
    specialty_en VARCHAR(255),
    doctor_group_id VARCHAR(255),
    hospital_id INT,
    user_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Patients table
CREATE TABLE IF NOT EXISTS patients (
    id INT AUTO_INCREMENT PRIMARY KEY,
    gsl_code VARCHAR(255),
    identity_number VARCHAR(255),
    name_ar VARCHAR(255),
    name_en VARCHAR(255),
    date_from DATE,
    date_to DATE,
    day_count INT,
    time_from VARCHAR(50),
    time_to VARCHAR(50),
    employer VARCHAR(255),
    relation VARCHAR(255),
    visit_type VARCHAR(255),
    nationality_id INT,
    hospital_id INT,
    doctor_id INT,
    employer_en VARCHAR(255),
    doctor_name_ar VARCHAR(255),
    doctor_name_en VARCHAR(255),
    doctor_specialty_ar VARCHAR(255),
    doctor_specialty_en VARCHAR(255),
    issue_date DATE,
    leave_file_path TEXT,
    prevent_inquiry TINYINT(1) DEFAULT 0,
    leave_type VARCHAR(100),
    hijri_admission_date VARCHAR(50),
    hijri_discharge_date VARCHAR(50),
    user_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Indexes for faster searches
CREATE INDEX IF NOT EXISTS idx_patients_gsl_code ON patients(gsl_code);
CREATE INDEX IF NOT EXISTS idx_patients_identity ON patients(identity_number);
CREATE INDEX IF NOT EXISTS idx_patients_user_id ON patients(user_id);
CREATE INDEX IF NOT EXISTS idx_hospitals_user_id ON hospitals(user_id);
CREATE INDEX IF NOT EXISTS idx_doctors_user_id ON doctors(user_id);
