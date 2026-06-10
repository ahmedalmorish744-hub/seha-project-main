const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const QRCode = require('qrcode');

const generateSickLeaveReport = async (patient, hospital, doctor, res) => {
    try {
        const doc = new PDFDocument({ size: 'A3', margin: 40 });
        const pageWidth = 841.89;
        const pageHeight = 1150;

        // Pipe to response
        console.log('Starting Sick Leave PDF generation...');
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="sick_leave_${patient.gsl_code || 'report'}.pdf"`);
        doc.pipe(res);
        console.log('PDF stream piped to response.');

        // --- Assets ---
        const rootDir = path.join(__dirname, '../../');

        // Font Paths - Using @fontsource
        const fontArabicRegPath = path.join(__dirname, '../node_modules/@fontsource/noto-sans-arabic/files/noto-sans-arabic-arabic-400-normal.woff');
        const fontArabicBoldPath = path.join(__dirname, '../node_modules/@fontsource/noto-sans-arabic/files/noto-sans-arabic-arabic-700-normal.woff');

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

        const sehaLogo = path.join(rootDir, 'logo_of_seha.png');
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

            if (options.fontSize) {
                doc.fontSize(options.fontSize);
            }

            if (options.color) {
                doc.fillColor(options.color);
            }

            // Switch font, then text
            doc.font(fontToUse).text(text, x, y, { ...defaultOptions, ...options });
        };

        const drawTextEn = (text, x, y, options = {}) => {
            const fontToUse = (options.weight === 'bold') ? fontEnBold : fontEnReg;
            if (options.color) {
                doc.fillColor(options.color);
            }
            doc.font(fontToUse).text(text, x, y, options);
        };


        // --- Header ---
        if (fs.existsSync(sehaLogo)) {
            doc.image(sehaLogo, 40, 40, { width: 150 });
        }

        const headerLogoPath = path.join(__dirname, '../header_logo.png');
        if (fs.existsSync(headerLogoPath)) {
            doc.image(headerLogoPath, (pageWidth - 180) / 2, 70, { width: 180, align: 'center' });
        } else {
            doc.font(fontEnBold).fontSize(16).text('Kingdom of Saudi Arabia', 0, 75, { align: 'center' });
        }

        const decoPath = path.join(__dirname, '../header_decoration.png');
        if (fs.existsSync(decoPath)) {
            doc.image(decoPath, pageWidth - 180, 40, { width: 170 });
        }

        doc.moveDown(9);

        // --- Title ---
        // Arabic Title
        doc.fillColor('#306db5');
        drawTextAr('تقرير إجازة مرضية', 0, doc.y,
            { align: 'center', weight: 'bold', fontSize: 22, width: pageWidth });

        doc.moveDown(0.1);

        // English Title
        doc.font(fontEnBold).fillColor('#2c3e77').fontSize(19).text('Sick Leave Report', 0, doc.y, { align: 'center', width: pageWidth });

        doc.moveDown(1.5);

        // --- Table ---
        const startX = 40;
        const startY = 250;
        const col1W = 160;
        const col3W = 160;
        const tableWidth = 760;
        const col2W = tableWidth - col1W - col3W;

        let currentY = startY;

        const drawRow = (labelEn, value, labelAr, isDoubleValue = false, bgColor = null) => {
            // Measure text height
            const labelFontSize = 14;
            const valueFontSize = 14;

            doc.font(fontEnReg).fontSize(valueFontSize);
            let maxTextHeight = 0;
            const padding = 15; // Slightly reduced padding for compactness

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

            doc.font(fontEnBold).fontSize(labelFontSize);
            const labelH1 = doc.heightOfString(labelEn, { width: col1W - 20 });

            doc.font(fontArBold).fontSize(labelFontSize);
            const labelH2 = doc.heightOfString(labelAr, { width: col3W - 20 });

            maxTextHeight = Math.max(maxTextHeight, labelH1, labelH2);

            const dynamicRowH = Math.max(40, maxTextHeight + padding); // Increased min height slightly for larger font

            // Draw Background if exists
            if (bgColor) {
                doc.save();
                doc.rect(startX, currentY, tableWidth, dynamicRowH).fill(bgColor);
                doc.restore();
            }

            // Draw Borders
            doc.rect(startX, currentY, tableWidth, dynamicRowH).strokeColor('#e0e0e0').stroke();
            doc.moveTo(startX + col1W, currentY).lineTo(startX + col1W, currentY + dynamicRowH).stroke();
            doc.moveTo(startX + col1W + col2W, currentY).lineTo(startX + col1W + col2W, currentY + dynamicRowH).stroke();

            // Calculate Y offsets for vertical centering
            // Helper to get standard height for single line (approx) or use measured if multiline?
            // Simplified vertical centering: Y + (TotalH - TextH) / 2.
            // But we need the specific text height for the content being drawn.

            // Labels
            doc.font(fontEnBold).fontSize(labelFontSize);
            const lH1 = doc.heightOfString(labelEn, { width: col1W - 30 });
            const y1 = currentY + (dynamicRowH - lH1) / 2;

            doc.font(fontArBold).fontSize(labelFontSize);
            const lH2 = doc.heightOfString(labelAr, { width: col3W - 30 });
            const y2 = currentY + (dynamicRowH - lH2) / 2;

            drawTextEn(labelEn, startX + 15, y1, { width: col1W - 30, align: 'center', weight: 'bold', fontSize: labelFontSize, color: '#2b5d88' });
            drawTextAr(labelAr, startX + col1W + col2W + 15, y2, { width: col3W - 30, align: 'center', weight: 'bold', fontSize: labelFontSize, color: '#2b5d88' });

            // Value
            if (isDoubleValue && typeof value === 'object') {
                const subColW = col2W / 2;
                doc.moveTo(startX + col1W + subColW, currentY).lineTo(startX + col1W + subColW, currentY + dynamicRowH).strokeColor('#e0e0e0').stroke();

                // English value (left side)
                doc.font(fontEnReg).fontSize(valueFontSize);
                const vH1 = doc.heightOfString(value.en || '-', { width: subColW - 30 });
                const vy1 = currentY + (dynamicRowH - vH1) / 2;
                drawTextEn(value.en || '-', startX + col1W + 15, vy1, { width: subColW - 30, align: 'center', weight: 'regular', fontSize: valueFontSize, color: '#29396e' });

                // Arabic value (right side)
                let arText = value.ar || '-';

                // For dates (numbers + dashes/slashes), always use English font to avoid boxes
                const cleanText = String(arText).replace(/[^0-9\-\/]/g, "").trim();
                let vH2 = 0;
                let isDate = false;

                if (cleanText.length > 0 && /^[0-9\-\/]+$/.test(cleanText)) {
                    isDate = true;
                    // It's a date/number - use English font for measuring
                    doc.font(fontEnReg).fontSize(valueFontSize);
                    vH2 = doc.heightOfString(cleanText, { width: subColW - 30 });
                } else {
                    // It's Arabic text - use Arabic font for measuring
                    doc.font(fontArReg).fontSize(valueFontSize);
                    vH2 = doc.heightOfString(arText, { width: subColW - 30 });
                }

                const vy2 = currentY + (dynamicRowH - vH2) / 2;

                if (isDate) {
                    drawTextEn(cleanText, startX + col1W + subColW + 15, vy2, { width: subColW - 30, align: 'center', weight: 'regular', fontSize: valueFontSize, color: '#29396e' });
                } else {
                    drawTextAr(arText, startX + col1W + subColW + 15, vy2, { width: subColW - 30, align: 'center', weight: 'regular', fontSize: valueFontSize, color: '#29396e' });
                }
            } else {
                // Single Value
                doc.font(fontEnReg).fontSize(valueFontSize);
                const vH = doc.heightOfString(value || '-', { width: col2W - 30 });
                const vY = currentY + (dynamicRowH - vH) / 2;
                drawTextEn(value || '-', startX + col1W + 15, vY, { width: col2W - 30, align: 'center', weight: 'regular', fontSize: valueFontSize, color: '#29396e' });
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

        const getArabicDuration = (count) => {
            const c = parseInt(count) || 0;
            if (c === 0) return '0 يوم';
            if (c === 1) return '1 يوم';
            if (c === 2) return '2 يومان';
            if (c >= 3 && c <= 10) return `${c} أيام`;
            return `${c} يوم`;
        };

        const duration = `${patient.day_count || 0} day(s) (${startDateFormatted} to ${endDateFormatted})`;
        const durText = getArabicDuration(patient.day_count);
        // Using Hijri dates as requested, Format: Count Unit (FromDate الى ToDate)
        const durationAr = `${durText} (${startDateFormatted} الى ${endDateFormatted})`;

        // --- Row 1: Leave ID ---
        drawRow('Leave ID', patient.gsl_code, 'رمز الإجازة');

        // --- Row 2: Duration (Special Style) ---
        const rowH = 45; // Increased slightly for vertical centering
        const durFontSize = 13; // Increased from 10/12 to 13

        doc.save();
        doc.rect(startX, currentY, tableWidth, rowH).fill('#2c3e77');

        // Labels (White)
        // Manual vertical centering for fixed row height
        doc.font(fontEnBold).fontSize(durFontSize);
        const durLabelH1 = doc.heightOfString('Leave Duration', { width: col1W - 30 });
        const durY1 = currentY + (rowH - durLabelH1) / 2;

        doc.font(fontArBold).fontSize(durFontSize);
        const durLabelH2 = doc.heightOfString('مدة الإجازة', { width: col3W - 30 });
        const durY2 = currentY + (rowH - durLabelH2) / 2;


        drawTextEn('Leave Duration', startX + 15, durY1, { width: col1W - 30, align: 'center', weight: 'bold', fontSize: durFontSize, color: '#ffffff' });
        drawTextAr('مدة الإجازة', startX + col1W + col2W + 15, durY2, { width: col3W - 30, align: 'center', weight: 'bold', fontSize: durFontSize, color: '#ffffff' });

        // Borders
        const subColW = col2W / 2;
        doc.moveTo(startX + col1W, currentY).lineTo(startX + col1W, currentY + rowH).strokeColor('#ffffff').stroke();
        doc.moveTo(startX + col1W + subColW, currentY).lineTo(startX + col1W + subColW, currentY + rowH).stroke();
        doc.moveTo(startX + col1W + col2W, currentY).lineTo(startX + col1W + col2W, currentY + rowH).stroke();

        // Values
        doc.font(fontEnReg).fontSize(durFontSize - 1); // slightly smaller than label just in case
        const durValH1 = doc.heightOfString(duration, { width: subColW - 20 });
        const durValY1 = currentY + (rowH - durValH1) / 2;

        drawTextEn(duration, startX + col1W + 10, durValY1, { width: subColW - 20, align: 'center', fontSize: durFontSize - 1, color: '#ffffff', weight: 'regular' });

        // Use fontSize 12 as requested mostly, but keeping 10 to fit. 
        // Need to ensure font handles Arabic + numbers.

        // Measure Arabic duration
        // Check if it should be En font (it has numbers and arabic text)
        // Usually Arabic font is safer for mixed, but numbers might look odd if font doesn't support them well.
        // Assuming drawTextAr handles it (it selects fontArReg).
        // Manual drawing for Arabic duration components to fix squares
        const durArText = durText;
        const durNum = (durArText.match(/\d+/) || ['0'])[0];
        const durTxt = durArText.replace(/[0-9]/g, '').trim();

        const hDateFrom = startDateFormatted || '-';
        const hDateTo = endDateFormatted || '-';
        const separator = ' الى ';
        const parenOpen = '(';
        const parenClose = ')';
        const space = ' ';

        doc.font(fontArReg).fontSize(durFontSize - 1);
        const wDurTxt = doc.widthOfString(durTxt);
        const wSep = doc.widthOfString(separator);

        doc.font(fontEnReg).fontSize(durFontSize - 1);
        const wDurNum = doc.widthOfString(durNum);
        const wSpace = doc.widthOfString(space);
        const wDate1 = doc.widthOfString(hDateFrom);
        const wDate2 = doc.widthOfString(hDateTo);
        const wParen1 = doc.widthOfString(parenOpen);
        const wParen2 = doc.widthOfString(parenClose);

        const totalWAr = wParen2 + wDate2 + wSep + wDate1 + wParen1 + wSpace + wDurTxt + wSpace + wDurNum;
        let startXAr = (startX + col1W + subColW) + (subColW - totalWAr) / 2;

        // Calculate Y for vertical centering
        doc.font(fontArReg);
        const hDur = doc.heightOfString(durTxt, { width: subColW - 20 });
        const yAr = currentY + (rowH - hDur) / 2;

        doc.font(fontEnReg);
        const hEn = doc.heightOfString(hDateFrom, { width: subColW - 20 });
        const yEn = currentY + (rowH - hEn) / 2;

        // Draw Components (Visual Left-to-Right for RTL Sentence: "durText (date1 to date2)")
        // RTL Visual:  ) date2 separator date1 ( durText

        // 1. (
        drawTextEn(parenOpen, startXAr, yEn, { align: 'left', fontSize: durFontSize - 1, color: '#ffffff', weight: 'regular' });
        startXAr += wParen1;

        // 2. Date To
        drawTextEn(hDateTo, startXAr, yEn, { align: 'left', fontSize: durFontSize - 1, color: '#ffffff', weight: 'regular' });
        startXAr += wDate2;

        // 3. Separator (Ar)
        drawTextAr(separator, startXAr, yAr, { align: 'left', fontSize: durFontSize - 1, color: '#ffffff', weight: 'regular' });
        startXAr += wSep;

        // 4. Date From
        drawTextEn(hDateFrom, startXAr, yEn, { align: 'left', fontSize: durFontSize - 1, color: '#ffffff', weight: 'regular' });
        startXAr += wDate1;

        // 5. )
        drawTextEn(parenClose, startXAr, yEn, { align: 'left', fontSize: durFontSize - 1, color: '#ffffff', weight: 'regular' });
        startXAr += wParen2;
        startXAr += wSpace; // Adding space between ) and Duration

        // 6. Duration Text (Ar)
        drawTextAr(durTxt, startXAr, yAr, { align: 'left', fontSize: durFontSize - 1, color: '#ffffff', weight: 'regular' });
        startXAr += wDurTxt;
        startXAr += wSpace;

        // 7. Duration Number (En)
        drawTextEn(durNum, startXAr, yEn, { align: 'left', fontSize: durFontSize - 1, color: '#ffffff', weight: 'regular' });

        doc.restore();
        currentY += rowH;

        // --- Data Rows ---
        const admissionEn = formatDateOnly(patient.date_from);
        const admissionAr = admissionEn;
        drawRow('Admission Date', { en: admissionEn, ar: admissionAr }, 'تاريخ الدخول', true, '#f7f7f7');

        const dischargeEn = formatDateOnly(patient.date_to);
        const dischargeAr = dischargeEn;
        drawRow('Discharge Date', { en: dischargeEn, ar: dischargeAr }, 'تاريخ الخروج', true);

        // Issue Date: DD-MM-YYYY
        const issueDateRaw = patient.issue_date || new Date();
        const issueDateStr = formatDateOnly(issueDateRaw); // Uses DD-MM-YYYY
        drawRow('Issue Date', issueDateStr, 'تاريخ إصدار التقرير');

        // Name Row - Replaces "Companion Name" with simple "Name"
        drawRow('Name', { en: patient.name_en, ar: patient.name_ar || '' }, 'الاسم', true, '#f7f7f7');

        drawRow('National ID / Iqama', patient.identity_number, 'رقم الهوية / الإقامة');

        let natEn = '-', natAr = '-';
        if (patient.nationalityObj) {
            natEn = patient.nationalityObj.name_en;
            natAr = patient.nationalityObj.name_ar;
        }
        drawRow('Nationality', { en: natEn, ar: natAr }, 'الجنسية', true, '#f7f7f7');

        // REMOVED Relation Row for Sick Leave

        drawRow('Employer', '', 'جهة العمل'); // Employer is often blank/fetched elsewhere? Keeping blank as per image or existing data
        drawRow('Practitioner Name', { en: patient.doctor_name_en, ar: patient.doctor_name_ar }, 'اسم الممارس', true, '#f7f7f7');
        drawRow('Position', { en: patient.doctor_specialty_en, ar: patient.doctor_specialty_ar }, 'المسمى الوظيفي', true);


        // --- Footer ---
        const footerY = pageHeight - 400;
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
            // Increased spacing for English Name to avoid overlap
            drawTextEn(hospital.name_en || '', rightCenterX - 125, footerY + 135, { width: 250, align: 'center', weight: 'bold', fontSize: 12, color: '#000000' });

            const licNum = hospital.license_number;
            // Determine License Label Width
            doc.font(fontArBold).fontSize(12);
            const licLabel = 'رقم الترخيص';
            const labelW = doc.widthOfString(licLabel);

            doc.font(fontEnBold).fontSize(12); // Use English font for number
            const numW = doc.widthOfString(licNum);

            const gap = 5;
            const totalW = labelW + gap + numW;
            const startXLic = rightCenterX - (totalW / 2);

            // Draw Number (Left) - English Font
            drawTextEn(licNum, startXLic, footerY + 175, { align: 'left', weight: 'bold', fontSize: 12, color: '#000000' });

            // Draw Label (Right) - Arabic Font
            // Calculate X for label: startX + numW + gap
            drawTextAr(licLabel, startXLic + numW + gap, footerY + 165, { align: 'left', weight: 'bold', fontSize: 12, color: '#000000' });
        }


        // Bottom Footer
        const bottomY = pageHeight - 150;
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

module.exports = { generateSickLeaveReport };
