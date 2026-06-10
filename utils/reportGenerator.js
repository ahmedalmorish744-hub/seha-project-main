const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const QRCode = require('qrcode');

const generateCompanionReport = async (patient, hospital, doctor, res) => {
    try {
        const doc = new PDFDocument({ size: 'A3', margin: 40 });
        const pageWidth = 841.89;
        const pageHeight = 1150;

        // Pipe to response
        console.log('Starting PDF generation...');
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="companion_leave_${patient.gsl_code || 'report'}.pdf"`);
        doc.pipe(res);
        console.log('PDF stream piped to response.');

        // --- Assets ---
        const rootDir = path.join(__dirname, '../../');

        // Font Paths - Using @fontsource
        // backend/utils/reportGenerator.js -> backend/ -> node_modules
        // Using Noto Sans Arabic as "Sans-Serif" Arabic font requested
        const fontArabicRegPath = path.join(__dirname, '../node_modules/@fontsource/noto-sans-arabic/files/noto-sans-arabic-arabic-400-normal.woff');
        const fontArabicBoldPath = path.join(__dirname, '../node_modules/@fontsource/noto-sans-arabic/files/noto-sans-arabic-arabic-700-normal.woff');

        // Use Times New Roman for English as requested (Standard PDF Font)
        // User requested "Times New Roman" previously, keeping it unless they meant "Sans-Serif" for everything.
        // Prompt says: "Modify and use *this* font for Arabic Sans-Serif". Implies targeting Arabic only.
        const fontEnReg = 'Times-Roman';
        const fontEnBold = 'Times-Bold';

        let fontArReg = 'Helvetica'; // Fallback
        let fontArBold = 'Helvetica-Bold'; // Fallback
        let useArabicFont = false;

        if (fs.existsSync(fontArabicRegPath) && fs.existsSync(fontArabicBoldPath)) {
            console.log('Using @fontsource Noto Sans Arabic:', fontArabicRegPath);
            fontArReg = fontArabicRegPath;
            fontArBold = fontArabicBoldPath;
            useArabicFont = true;
        } else {
            // Fallback to Almarai or Tajawal or Amiri
            const almaraiReg = path.join(__dirname, '../node_modules/@fontsource/almarai/files/almarai-arabic-400-normal.woff');
            const almaraiBold = path.join(__dirname, '../node_modules/@fontsource/almarai/files/almarai-arabic-700-normal.woff');

            if (fs.existsSync(almaraiReg) && fs.existsSync(almaraiBold)) {
                console.warn('Noto Sans Arabic not found! Falling back to Almarai.');
                fontArReg = almaraiReg;
                fontArBold = almaraiBold;
                useArabicFont = true;
            } else {
                console.warn('Arabic fonts not found in node_modules! Falling back to Helvetica.');
            }
        }

        const sehaLogo = path.join(rootDir, 'صحة.png');
        const nationalLogo = path.join(rootDir, 'المركز الوطني للمعلومات الصحية.jpg');


        // Helper to draw text with Arabic support
        const drawTextAr = (text, x, y, options = {}) => {
            const fontToUse = (options.weight === 'bold') ? fontArBold : fontArReg;
            const defaultOptions = {
                align: 'right',
                features: ['rtla']
            };
            if (!useArabicFont) {
                delete defaultOptions.features;
                options.features = undefined;
            }

            // Switch font, then text
            doc.font(fontToUse).text(text, x, y, { ...defaultOptions, ...options });
        };

        const drawTextEn = (text, x, y, options = {}) => {
            const fontToUse = (options.weight === 'bold') ? fontEnBold : fontEnReg;
            doc.font(fontToUse).text(text, x, y, options);
        };


        // --- Header ---
        if (fs.existsSync(sehaLogo)) {
            doc.image(sehaLogo, 40, 40, { width: 100 });
        }

        const headerLogoPath = path.join(__dirname, '../header_logo.png');
        if (fs.existsSync(headerLogoPath)) {
            doc.image(headerLogoPath, (pageWidth - 250) / 2, 40, { width: 250, align: 'center' });
        } else {
            doc.font(fontEnBold).fontSize(16).text('Kingdom of Saudi Arabia', 0, 75, { align: 'center' });
        }

        const decoPath = path.join(__dirname, '../header_decoration.png');
        if (fs.existsSync(decoPath)) {
            doc.image(decoPath, pageWidth - 180, 40, { width: 140 });
        }

        doc.moveDown(7);

        // --- Title ---
        // Arabic Title
        doc.fillColor('#2b5d88');
        drawTextAr('تقرير مرافقة مريض', 0, doc.y, { align: 'center', weight: 'bold', fontSize: 22 });

        doc.moveDown(0.5);

        // English Title
        doc.font(fontEnBold).fontSize(18).text('Companion Sick Leave Report', { align: 'center' });

        doc.moveDown(2);

        // --- Table ---
        const startX = 40;
        const startY = 250;
        const col1W = 160;
        const col3W = 160;
        const tableWidth = 760;
        const col2W = tableWidth - col1W - col3W;

        let currentY = startY;

        const drawRow = (labelEn, value, labelAr, isDoubleValue = false) => {
            // Measure text height
            doc.font(fontEnReg).fontSize(12);
            let maxTextHeight = 0;
            const padding = 20;

            // Measure English Value
            if (isDoubleValue && typeof value === 'object') {
                const subColW = col2W / 2;
                const h1 = doc.heightOfString(value.en || '-', { width: subColW - 20 });

                // Measure Arabic Value (switch font)
                doc.font(fontArReg);
                const h2 = doc.heightOfString(value.ar || '-', { width: subColW - 20 });

                maxTextHeight = Math.max(h1, h2);
            } else {
                maxTextHeight = doc.heightOfString(value || '-', { width: col2W - 20 });
            }

            doc.font(fontEnBold);
            const labelH1 = doc.heightOfString(labelEn, { width: col1W - 20 });

            doc.font(fontArBold);
            const labelH2 = doc.heightOfString(labelAr, { width: col3W - 20 });

            maxTextHeight = Math.max(maxTextHeight, labelH1, labelH2);

            const dynamicRowH = Math.max(35, maxTextHeight + padding);

            // Draw Borders
            doc.rect(startX, currentY, tableWidth, dynamicRowH).strokeColor('#e0e0e0').stroke();
            doc.moveTo(startX + col1W, currentY).lineTo(startX + col1W, currentY + dynamicRowH).stroke();
            doc.moveTo(startX + col1W + col2W, currentY).lineTo(startX + col1W + col2W, currentY + dynamicRowH).stroke();

            // Labels
            drawTextEn(labelEn, startX + 15, currentY + 10, { width: col1W - 30, align: 'left', weight: 'bold', fontSize: 12, color: '#2b5d88' });
            drawTextAr(labelAr, startX + col1W + col2W + 15, currentY + 10, { width: col3W - 30, align: 'right', weight: 'bold', fontSize: 12, color: '#2b5d88' });

            // Value
            if (isDoubleValue && typeof value === 'object') {
                const subColW = col2W / 2;
                doc.moveTo(startX + col1W + subColW, currentY).lineTo(startX + col1W + subColW, currentY + dynamicRowH).strokeColor('#e0e0e0').stroke();

                // English value (left side)
                drawTextEn(value.en || '-', startX + col1W + 15, currentY + 10, { width: subColW - 30, align: 'center', weight: 'regular', fontSize: 12, color: '#000000' });

                // Arabic value (right side)
                let arText = value.ar || '-';

                // For dates (numbers + dashes/slashes), always use English font to avoid boxes
                // Remove any non-numeric/dash/slash characters
                const cleanText = String(arText).replace(/[^0-9\-\/]/g, "").trim();

                if (cleanText.length > 0 && /^[0-9\-\/]+$/.test(cleanText)) {
                    // It's a date/number - use English font
                    drawTextEn(cleanText, startX + col1W + subColW + 15, currentY + 10, { width: subColW - 30, align: 'center', weight: 'regular', fontSize: 12, color: '#000000' });
                } else {
                    // It's Arabic text - use Arabic font
                    drawTextAr(arText, startX + col1W + subColW + 15, currentY + 10, { width: subColW - 30, align: 'center', weight: 'regular', fontSize: 12, color: '#000000' });
                }
            } else {
                drawTextEn(value || '-', startX + col1W + 15, currentY + 10, { width: col2W - 30, align: 'center', weight: 'regular', fontSize: 12, color: '#000000' });
            }

            currentY += dynamicRowH;
        };

        // Data Preparation
        const formatDateOnly = (dateStr) => {
            if (!dateStr) return '';
            const d = new Date(dateStr);
            if (isNaN(d.getTime())) return dateStr;
            const day = String(d.getDate()).padStart(2, '0');
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const year = d.getFullYear();
            return `${day}-${month}-${year}`;
        };

        const startDateFormatted = formatDateOnly(patient.date_from);
        const endDateFormatted = formatDateOnly(patient.date_to);

        const duration = `${patient.day_count || 0} day(s) (${startDateFormatted} to ${endDateFormatted})`;
        const durationAr = `${patient.day_count || 0} يوم (${startDateFormatted} الى ${endDateFormatted})`;

        // --- Row 1: Leave ID ---
        drawRow('Leave ID', patient.gsl_code, 'رمز الإجازة');

        // --- Row 2: Duration (Special Style) ---
        const rowH = 35;

        doc.save();
        doc.rect(startX, currentY, tableWidth, rowH).fill('#1f2f57');

        // Labels (White)
        drawTextEn('Leave Duration', startX + 15, currentY + 10, { width: col1W - 30, align: 'left', weight: 'bold', fontSize: 12, color: '#ffffff' });
        drawTextAr('مدة الإجازة', startX + col1W + col2W + 15, currentY + 10, { width: col3W - 30, align: 'right', weight: 'bold', fontSize: 12, color: '#ffffff' });

        // Borders
        const subColW = col2W / 2;
        doc.moveTo(startX + col1W, currentY).lineTo(startX + col1W, currentY + rowH).strokeColor('#ffffff').stroke();
        doc.moveTo(startX + col1W + subColW, currentY).lineTo(startX + col1W + subColW, currentY + rowH).stroke();
        doc.moveTo(startX + col1W + col2W, currentY).lineTo(startX + col1W + col2W, currentY + rowH).stroke();

        // Values
        drawTextEn(duration, startX + col1W + 10, currentY + 10, { width: subColW - 20, align: 'center', fontSize: 10, color: '#ffffff', weight: 'regular' });
        drawTextAr(durationAr, startX + col1W + subColW + 10, currentY + 10, { width: subColW - 20, align: 'center', fontSize: 10, color: '#ffffff', weight: 'regular' });

        doc.restore();
        currentY += rowH;

        // --- Data Rows ---
        const admissionEn = formatDateOnly(patient.date_from);
        const admissionAr = admissionEn;
        drawRow('Admission Date', { en: admissionEn, ar: admissionAr }, 'تاريخ الدخول', true);

        const dischargeEn = formatDateOnly(patient.date_to);
        const dischargeAr = dischargeEn;
        drawRow('Discharge Date', { en: dischargeEn, ar: dischargeAr }, 'تاريخ الخروج', true);

        // Issue Date: DD-MM-YYYY
        const issueDateRaw = patient.issue_date || new Date();
        const issueDateStr = formatDateOnly(issueDateRaw); // Uses DD-MM-YYYY
        drawRow('Issue Date', issueDateStr, 'تاريخ إصدار التقرير');

        drawRow('Companion Name', { en: patient.name_en, ar: patient.name_ar || '' }, 'اسم المرافق', true);
        drawRow('National ID / Iqama', patient.identity_number, 'رقم الهوية / الإقامة');

        let natEn = '-', natAr = '-';
        if (patient.nationalityObj) {
            natEn = patient.nationalityObj.name_en;
            natAr = patient.nationalityObj.name_ar;
        }
        drawRow('Nationality', { en: natEn, ar: natAr }, 'الجنسية', true);

        const relationMap = {
            'father': { en: 'Father', ar: 'أب' }, 'mother': { en: 'Mother', ar: 'أم' },
            'son': { en: 'Son', ar: 'ابن' }, 'daughter': { en: 'Daughter', ar: 'ابنة' },
            'husband': { en: 'Husband', ar: 'زوج' }, 'wife': { en: 'Wife', ar: 'زوجة' },
            'brother': { en: 'Brother', ar: 'أخ' }, 'sister': { en: 'Sister', ar: 'أخت' }
        };
        const relKey = patient.relation?.toLowerCase();
        const relObj = relationMap[relKey] || { en: patient.relation || '-', ar: patient.relation || '-' };

        drawRow('Relation', { en: relObj.en, ar: relObj.ar }, 'صلة القرابة', true);
        drawRow('Employer', '', 'جهة العمل');
        drawRow('Practitioner Name', { en: patient.doctor_name_en, ar: patient.doctor_name_ar }, 'اسم الممارس', true);
        drawRow('Position', { en: patient.doctor_specialty_en, ar: patient.doctor_specialty_ar }, 'المسمى الوظيفي', true);


        // --- Footer ---
        const footerY = pageHeight - 350;
        const centerX = pageWidth / 2;
        doc.moveTo(centerX, footerY).lineTo(centerX, footerY + 150).strokeColor('#e0e0e0').stroke();

        const leftCenterX = centerX / 2;

        // QR
        try {
            const qrData = `Check Report: ${patient.gsl_code}`;
            const qrImage = await QRCode.toDataURL(qrData);
            doc.image(qrImage, leftCenterX - 20, footerY, { width: 100 });
        } catch (qrErr) { console.error('Error generating QR code:', qrErr); }

        drawTextAr('للتحقق من بيانات التقرير يرجى التأكد من زيارة موقع منصة صحة الرسمي', leftCenterX - 125, footerY + 110, { width: 300, align: 'center', weight: 'bold', fontSize: 10, color: '#000000' });
        drawTextEn('To check the report please visit Seha\'s official website', leftCenterX - 100, footerY + 150, { width: 250, align: 'center', weight: 'bold', fontSize: 10, color: '#000000' });

        doc.fillColor('blue').font(fontEnBold).fontSize(9);
        doc.text('www.seha.sa/#/inquiries/slenquiry', leftCenterX - 110, footerY + 180, { width: 250, align: 'center', link: 'https://www.seha.sa/#/inquiries/slenquiry', underline: true });


        // Right Footer (Hospital)
        const rightCenterX = centerX + (centerX / 2);
        if (hospital && hospital.logo) {
            let ospLogoPath = hospital.logo;
            if (ospLogoPath.startsWith('/uploads')) { ospLogoPath = path.join(rootDir, 'backend', ospLogoPath); }
            if (fs.existsSync(ospLogoPath)) {
                doc.image(ospLogoPath, rightCenterX - 50, footerY, { width: 100, height: 100, fit: [100, 100], align: 'center' });
            }
        }

        if (hospital) {
            drawTextAr(hospital.name_ar || '', rightCenterX - 125, footerY + 100, { width: 250, align: 'center', weight: 'bold', fontSize: 12, color: '#000000' });
            drawTextEn(hospital.name_en || '', rightCenterX - 125, footerY + 120, { width: 250, align: 'center', weight: 'bold', fontSize: 12, color: '#000000' });
            const licNum = hospital.license_number || '1410101201200443';
            drawTextAr(`رقم الترخيص : ${licNum}`, rightCenterX - 125, footerY + 150, { width: 250, align: 'center', weight: 'bold', fontSize: 12, color: '#000000' });
        }


        // Bottom Footer
        const bottomY = pageHeight - 90;
        const now = new Date();
        const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

        doc.font(fontEnBold).fontSize(12).fillColor('#000000');
        doc.text(timeStr, 40, bottomY);
        doc.text(dateStr, 40, bottomY + 20);

        if (fs.existsSync(nationalLogo)) {
            doc.image(nationalLogo, pageWidth - 160, bottomY - 20, { width: 120 });
        }

        doc.end();

    } catch (err) {
        console.error('PDF Generation FATAL Error:', err);
        if (!res.headersSent) {
            res.status(500).send('Error generating PDF');
        } else {
            doc.end();
        }
    }
};

module.exports = { generateCompanionReport };
