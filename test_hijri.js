
const date = new Date('2024-05-20'); // Gregorian Date
const options = { calendar: 'islamic-umalqura', day: 'numeric', month: 'numeric', year: 'numeric' };
const hijriDate = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', options).format(date);
console.log('Gregorian: 2024-05-20');
console.log('Hijri (Umm al-Qura):', hijriDate);

// Test formatted output for DB
const formatted = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
}).format(date);
console.log('Formatted:', formatted);
// Expected format might be differing based on locale, e.g. "20/05/2024" or "05/20/2024"
