
/**
 * Converts a Gregorian date string (YYYY-MM-DD or similar) to Hijri (Umm al-Qura) string (YYYY-MM-DD).
 * @param {string|Date} dateInput 
 * @returns {string|null} Hijri date string in YYYY-MM-DD format (Arabic numerals replaced if necessary, though 'en' locale usually keeps them ASCII).
 */
function toHijri(dateInput) {
    if (!dateInput) return null;
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return null;

    // Use formatting that gives us parts we can reassemble or a standard string
    // 'en-u-ca-islamic-umalqura' with numeric components usually outputs "Month/Day/Year" or "Year-Month-Day" depending on options.
    // Let's force a specific format.

    // Using Intl.DateTimeFormat with 'en' locale and umalqura calendar
    const formatter = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });

    const parts = formatter.formatToParts(date);
    const day = parts.find(p => p.type === 'day').value;
    const month = parts.find(p => p.type === 'month').value;
    const year = parts.find(p => p.type === 'year').value;

    return `${day}-${month}-${year}`;
}

module.exports = {
    toHijri
};
