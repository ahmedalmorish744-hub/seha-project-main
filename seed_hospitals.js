const db = require('./db');

const hospitals = [
    {
        name_ar: "مستشفى الملك فيصل التخصصي ومركز الأبحاث",
        name_en: "King Faisal Specialist Hospital & Research Centre",
        city: "الرياض",
        region: "المنطقة الوسطى",
        type: "Government",
        doctor_group_id: "KFSH-RUH"
    },
    {
        name_ar: "مدينة الملك سعود الطبية",
        name_en: "King Saud Medical City",
        city: "الرياض",
        region: "المنطقة الوسطى",
        type: "Government",
        doctor_group_id: "KSMC-RUH"
    },
    {
        name_ar: "مستشفى دله",
        name_en: "Dallah Hospital",
        city: "الرياض",
        region: "المنطقة الوسطى",
        type: "Private",
        doctor_group_id: "DALLAH-RUH"
    },
    {
        name_ar: "مجموعة د. سليمان الحبيب الطبية",
        name_en: "Dr. Sulaiman Al Habib Medical Group",
        city: "الرياض",
        region: "المنطقة الوسطى",
        type: "Private",
        doctor_group_id: "HMG-RUH"
    },
    {
        name_ar: "مدينة الملك فهد الطبية",
        name_en: "King Fahad Medical City",
        city: "الرياض",
        region: "المنطقة الوسطى",
        type: "Government",
        doctor_group_id: "KFMC-RUH"
    },
    {
        name_ar: "مستشفى الحرس الوطني",
        name_en: "National Guard Health Affairs",
        city: "الرياض",
        region: "المنطقة الوسطى",
        type: "Government",
        doctor_group_id: "NGHA-RUH"
    },
    {
        name_ar: "مستشفى المملكة",
        name_en: "Kingdom Hospital",
        city: "الرياض",
        region: "المنطقة الوسطى",
        type: "Private",
        doctor_group_id: "KH-RUH"
    },
    {
        name_ar: "مستشفى قوى الأمن",
        name_en: "Security Forces Hospital",
        city: "الرياض",
        region: "المنطقة الوسطى",
        type: "Government",
        doctor_group_id: "SFH-RUH"
    },
    {
        name_ar: "المستشفى السعودي الألماني",
        name_en: "Saudi German Hospital",
        city: "جدة",
        region: "المنطقة الغربية",
        type: "Private",
        doctor_group_id: "SGH-LE"
    },
    {
        name_ar: "مستشفى الملك فهد للقوات المسلحة",
        name_en: "King Fahad Armed Forces Hospital",
        city: "جدة",
        region: "المنطقة الغربية",
        type: "Government",
        doctor_group_id: "KFAFH-JED"
    },
    {
        name_ar: "مستشفى المواساة",
        name_en: "Al Mouwasat Hospital",
        city: "الدمام",
        region: "المنطقة الشرقية",
        type: "Private",
        doctor_group_id: "MOUW-DAM"
    },
    {
        name_ar: "مستشفى الملك فهد التخصصي",
        name_en: "King Fahad Specialist Hospital",
        city: "الدمام",
        region: "المنطقة الشرقية",
        type: "Government",
        doctor_group_id: "KFSH-DAM"
    },
    {
        name_ar: "مستشفى فقيه الجامعي",
        name_en: "Fakeeh University Hospital",
        city: "جدة",
        region: "المنطقة الغربية",
        type: "Private",
        doctor_group_id: "DSFH-JED"
    },
    {
        name_ar: "مدينة الأمير سلطان الطبية العسكرية",
        name_en: "Prince Sultan Military Medical City",
        city: "الرياض",
        region: "المنطقة الوسطى",
        type: "Government",
        doctor_group_id: "PSMMC-RUH"
    },
    {
        name_ar: "مستشفى الملك عبد العزيز الجامعي",
        name_en: "King Abdulaziz University Hospital",
        city: "جدة",
        region: "المنطقة الغربية",
        type: "Government",
        doctor_group_id: "KAUH-JED"
    }
];

async function seed() {
    try {
        console.log('Seeding hospitals...');

        // Verify columns exist first (sanity check)
        // We know they exist from previous steps, but good for robustness if re-running

        for (const h of hospitals) {
            // Check if exists
            const [rows] = await db.query('SELECT id FROM hospitals WHERE name_en = ?', [h.name_en]);

            if (rows.length === 0) {
                console.log(`Inserting ${h.name_en}...`);
                await db.query(
                    `INSERT INTO hospitals (type, name_ar, name_en, city, region, doctor_group_id) 
                     VALUES (?, ?, ?, ?, ?, ?)`,
                    [h.type, h.name_ar, h.name_en, h.city, h.region, h.doctor_group_id]
                );
            } else {
                console.log(`Skipping ${h.name_en} (already exists)`);
            }
        }

        console.log('Seeding complete.');
        process.exit(0);

    } catch (err) {
        console.error('Seeding failed:', err);
        process.exit(1);
    }
}

seed();
