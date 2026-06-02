const fs = require('fs');
const path = require('path');
const https = require('https');

const fontsDir = path.join(__dirname, 'fonts');
if (!fs.existsSync(fontsDir)) {
    fs.mkdirSync(fontsDir, { recursive: true });
}

const download = (url, dest) => {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(dest);
        const request = https.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        }, (response) => {
            if (response.statusCode === 302 || response.statusCode === 301) {
                download(response.headers.location, dest).then(resolve).catch(reject);
                return;
            }
            if (response.statusCode !== 200) {
                reject(new Error(`Failed to download: Status Code ${response.statusCode}`));
                return;
            }
            response.pipe(file);
            file.on('finish', () => {
                file.close(() => resolve(dest));
            });
        });

        request.on('error', (err) => {
            fs.unlink(dest, () => reject(err));
        });
    });
};

const fonts = [
    { name: 'Amiri-Regular.ttf', url: 'https://github.com/google/fonts/raw/main/ofl/amiri/Amiri-Regular.ttf' },
    { name: 'Amiri-Bold.ttf', url: 'https://github.com/google/fonts/raw/main/ofl/amiri/Amiri-Bold.ttf' }
];

(async () => {
    console.log('Downloading fonts...');
    for (const font of fonts) {
        const dest = path.join(fontsDir, font.name);
        try {
            await download(font.url, dest);
            console.log(`Downloaded ${font.name}`);

            // Check size
            const stats = fs.statSync(dest);
            console.log(`Size of ${font.name}: ${stats.size} bytes`);

        } catch (err) {
            console.error(`Failed to download ${font.name}:`, err);
        }
    }
    console.log('Done.');
})();
