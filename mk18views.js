const fs = require('fs');
const path = require('path');

// ko.json 파일 경로와 views 폴더 경로
const koJsonPath = '/home/dev/www/ref/ceik.c4ei.net/locales/ko.json';
const viewsPath = '/home/dev/www/ref/ceik.c4ei.net/views';
const outputPath = path.join(viewsPath, 'i18');

// ko.json 파일 읽기
const koJson = JSON.parse(fs.readFileSync(koJsonPath, 'utf8'));

// outputPath 폴더 생성 (존재하지 않으면)
if (!fs.existsSync(outputPath)) {
    fs.mkdirSync(outputPath, { recursive: true });
}

// 특수 문자를 이스케이프하는 함수
const escapeRegExp = (string) => {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

// EJS 파일 업데이트 함수
const updateEjsFile = (filePath) => {
    let fileContent = fs.readFileSync(filePath, 'utf8');

    // ko.json의 값을 길이순으로 정렬한 후, 긴 문자열부터 짧은 문자열 순으로 처리
    const sortedKeys = Object.keys(koJson).sort((a, b) => koJson[b].length - koJson[a].length);

    sortedKeys.forEach(key => {
        const value = koJson[key];
        const regex = new RegExp(`(?<!<!-- )${escapeRegExp(value)}(?! -->|<%=\\s*__\\("text_${escapeRegExp(key)}"\\)\\s*%>)`, 'g');

        // 한글인 애들의 value 값을 비교하여 변환
        fileContent = fileContent.replace(regex, (match) => {
            // 이미 변환된 부분은 그대로 둠
            return `<!-- ${value} --><%= __("text_${key}") %>`;
        });
    });

    // 변경된 파일을 outputPath에 저장
    const outputFilePath = path.join(outputPath, path.relative(viewsPath, filePath));
    const outputDir = path.dirname(outputFilePath);

    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(outputFilePath, fileContent, 'utf8');
};

// views 폴더 내 1뎁스 EJS 파일 처리
fs.readdir(viewsPath, (err, files) => {
    if (err) {
        console.error('Error reading views directory:', err);
        return;
    }

    files.forEach(file => {
        const filePath = path.join(viewsPath, file);
        if (fs.statSync(filePath).isFile() && path.extname(file) === '.ejs') {
            updateEjsFile(filePath);
        }
    });

    console.log('EJS files have been updated and saved to', outputPath);
});
