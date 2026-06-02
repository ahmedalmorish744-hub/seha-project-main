const express = require('express');
const router = express.Router();
const db = require('../db');
const fs = require('fs');
const path = require('path');

// Helper to escape HTML to prevent XSS (basic)
function escapeHtml(text) {
    if (!text) return '';
    return text.toString()
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Helper to format date as YYYY-MM-DD
function formatDate(date) {
    if (!date) return '';
    const d = new Date(date);
    if (isNaN(d.getTime())) return date;
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Helper to read the template
function getTemplate() {
    const templatePath = path.join(__dirname, '../public/inquiry.html');
    return fs.readFileSync(templatePath, 'utf8');
}

// GET /inquiry
router.get('/', (req, res) => {
    let html = getTemplate();

    // Default state: No error, no result, empty inputs
    html = html.replace('{{ERROR_DISPLAY}}', 'none');
    html = html.replace('{{ERROR_MESSAGE}}', '');
    html = html.replace('{{SERVICE_CODE}}', '');
    html = html.replace('{{NATIONAL_ID}}', '');
    html = html.replace('{{RESULT_SECTION}}', '<button class="btn btn-primary mt-3" type="submit">استعلام</button>');

    res.send(html);
});

// POST /inquiry
router.post('/', async (req, res) => {
    let html = getTemplate();
    const service_code = (req.body.service_code || '').trim();
    const national_id = (req.body.national_id || '').trim();

    // Preserve inputs
    html = html.replace('{{SERVICE_CODE}}', escapeHtml(service_code));
    html = html.replace('{{NATIONAL_ID}}', escapeHtml(national_id));

    let error = '';

    if (!service_code || !national_id) {
        error = "يرجى إدخال رمز الخدمة ورقم الهوية.";
    }

    if (!error) {
        try {
            // Query logic: patients table, check gsl_code, identity_number, prevent_inquiry (0 or NULL)
            const [rows] = await db.query(
                "SELECT * FROM patients WHERE gsl_code = ? AND identity_number = ? AND (prevent_inquiry = 0 OR prevent_inquiry IS NULL)",
                [service_code, national_id]
            );

            if (rows.length > 0) {
                const report = rows[0];
                const resultHtml = `
                    <!-- [NEW] Display results directly under the form -->
                    <div class="results-inquiery row">
                        <div class="col-md-6">
                            <span>الاسم: </span> ${escapeHtml(report.name_ar)}
                        </div>
                        <div class="col-md-6">
                            <span>تاريخ إصدار تقرير الإجازة:</span> ${escapeHtml(formatDate(report.issue_date))}
                        </div>
                        <div class="col-md-6">
                            <span>تبدأ من:</span> ${escapeHtml(formatDate(report.date_from))}
                        </div>
                        <div class="col-md-6">
                            <span>وحتى:</span> ${escapeHtml(formatDate(report.date_to))}
                        </div>
                        <div class="col-md-6">
                            <span>المدة بالأيام:</span> ${escapeHtml(report.day_count)}
                        </div>
                        <div class="col-md-6">
                            <span>اسم الطبيب:</span> ${escapeHtml(report.doctor_name_ar)}
                        </div>
                        <div class="col-md-6">
                            <span>المسمى الوظيفي:</span> ${escapeHtml(report.doctor_specialty_ar)}
                        </div>
                    </div>
                    <a href="/inquiry" class="btn btn-primary mt-3">استعلام جديد</a>
                `;

                html = html.replace('{{RESULT_SECTION}}', resultHtml);
                html = html.replace('{{ERROR_DISPLAY}}', 'none');
                html = html.replace('{{ERROR_MESSAGE}}', '');

            } else {
                error = "خطأ في الاستعلام"; // Or "No record found"
            }

        } catch (err) {
            console.error(err);
            error = "حدث خطأ أثناء الاتصال بالنظام، يرجى المحاولة لاحقًا.";
        }
    }

    if (error) {
        html = html.replace('{{ERROR_DISPLAY}}', 'block');
        html = html.replace('{{ERROR_MESSAGE}}', escapeHtml(error));
        html = html.replace('{{RESULT_SECTION}}', '<button class="btn btn-primary mt-3" type="submit">استعلام</button>');
    }

    res.send(html);
});

// API Endpoint for Client-Side Rendering (Netlify/Static support)
router.post('/api', async (req, res) => {
    const service_code = (req.body.service_code || '').trim();
    const national_id = (req.body.national_id || '').trim();

    if (!service_code || !national_id) {
        return res.status(400).json({ success: false, message: "يرجى إدخال رمز الخدمة ورقم الهوية." });
    }

    try {
        const [rows] = await db.query(
            "SELECT * FROM patients WHERE gsl_code = ? AND identity_number = ? AND (prevent_inquiry = 0 OR prevent_inquiry IS NULL)",
            [service_code, national_id]
        );

        if (rows.length > 0) {
            const report = rows[0];
            // Send formatted data
            res.json({
                success: true,
                data: {
                    name: report.name_ar,
                    issue_date: formatDate(report.issue_date),
                    date_from: formatDate(report.date_from),
                    date_to: formatDate(report.date_to),
                    day_count: report.day_count,
                    doctor_name: report.doctor_name_ar,
                    doctor_specialty: report.doctor_specialty_ar
                }
            });
        } else {
            res.status(404).json({ success: false, message: "خطأ في الاستعلام" });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "حدث خطأ أثناء الاتصال بالنظام" });
    }
});

module.exports = router;
