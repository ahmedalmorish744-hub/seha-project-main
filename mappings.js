const mapPatientToAPI = (row) => {
    if (!row) return null;
    return {
        _id: row.id,
        inputgsl: row.gsl_code,
        inputidentity: row.identity_number,
        inputnamear: row.name_ar,
        inputnameen: row.name_en,
        inputdatefrom: row.date_from,
        inputdateto: row.date_to,
        inputdaynum: row.day_count,
        inputtimefrom: row.time_from,
        inputtimeto: row.time_to,
        inputemployer: row.employer,
        inputrelation: row.relation,
        inputvisittype: row.visit_type,
        nationalityId: row.nationality_id,
        hospitalId: row.hospital_id,
        doctorId: row.doctor_id,
        inputemployeren: row.employer_en,
        inputdoctorar: row.doctor_name_ar,
        inputdoctoren: row.doctor_name_en,
        inputworktypear: row.doctor_specialty_ar,
        inputworktypeen: row.doctor_specialty_en,
        // inputnationalityen: row.nationality_en, // REMOVED
        inputdatehin: row.issue_date,
        inputLeaveFilePath: row.leave_file_path,
        inputPreventInquiry: row.prevent_inquiry,
        inputLeaveType: row.leave_type,
        hijri_admission_date: row.hijri_admission_date,
        hijri_discharge_date: row.hijri_discharge_date,
        createdAt: row.created_at,
        updatedAt: row.updated_at
    };
};

const mapPatientFromAPI = (data) => {
    return {
        gsl_code: data.inputgsl,
        identity_number: data.inputidentity,
        name_ar: data.inputnamear,
        name_en: data.inputnameen,
        date_from: data.inputdatefrom,
        date_to: data.inputdateto,
        day_count: data.inputdaynum,
        time_from: data.inputtimefrom,
        time_to: data.inputtimeto,
        employer: data.inputemployer,
        relation: data.inputrelation,
        visit_type: data.inputvisittype,
        nationality_id: data.nationalityId,
        hospital_id: data.hospitalId,
        doctor_id: data.doctorId,
        employer_en: data.inputemployeren,
        doctor_name_ar: data.inputdoctorar,
        doctor_name_en: data.inputdoctoren,
        doctor_specialty_ar: data.inputworktypear,
        doctor_specialty_en: data.inputworktypeen,
        // nationality_en: data.inputnationalityen, // REMOVED
        issue_date: data.inputdatehin, // Using inputdatehin as issue date temporarily or created_at? Image says 00:00 2026...
        leave_file_path: data.inputLeaveFilePath,
        prevent_inquiry: data.inputPreventInquiry,
        leave_type: data.inputLeaveType,
        hijri_admission_date: data.hijri_admission_date,
        hijri_discharge_date: data.hijri_discharge_date
    };
};

const mapDoctorToAPI = (row) => ({
    _id: row.id,
    input_doctor_name_ar: row.name_ar,
    input_doctor_name_En: row.name_en,
    input_doctor_type_ar: row.specialty_ar,
    input_doctor_type_En: row.specialty_en,
    input_doctor_num: row.doctor_group_id,
    hospitalId: row.hospital_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at
});

const mapDoctorFromAPI = (data) => ({
    name_ar: data.input_doctor_name_ar,
    name_en: data.input_doctor_name_En,
    specialty_ar: data.input_doctor_type_ar,
    specialty_en: data.input_doctor_type_En,
    doctor_group_id: data.input_doctor_num,
    hospital_id: data.hospitalId
});

const mapHospitalToAPI = (row) => ({
    _id: row.id,
    input_central_type: row.type,
    input_central_name_ar: row.name_ar,
    input_central_name_en: row.name_en,
    input_central_logo: row.logo,
    input_city: row.city,
    input_region: row.region,
    input_city: row.city,
    input_region: row.region,
    input_central_license_num: row.license_number,
    createdAt: row.created_at,
    updatedAt: row.updated_at
});

const mapHospitalFromAPI = (data) => ({
    type: data.input_central_type,
    name_ar: data.input_central_name_ar,
    name_en: data.input_central_name_en,
    logo: data.input_central_logo,
    city: data.input_city,
    region: data.input_region,
    license_number: data.input_central_license_num
});

const mapNationalityToAPI = (row) => ({
    _id: row.id,
    input_national_ar: row.name_ar,
    input_national_en: row.name_en,
    createdAt: row.created_at,
    updatedAt: row.updated_at
});

const mapNationalityFromAPI = (data) => ({
    name_ar: data.input_national_ar,
    name_en: data.input_national_en
});

module.exports = {
    mapPatientToAPI, mapPatientFromAPI,
    mapDoctorToAPI, mapDoctorFromAPI,
    mapHospitalToAPI, mapHospitalFromAPI,
    mapNationalityToAPI, mapNationalityFromAPI
};
