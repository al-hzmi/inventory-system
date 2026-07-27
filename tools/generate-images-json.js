const fs = require("fs");
const path = require("path");

const imagesDir = path.join(__dirname, "..", "images");

const files = fs.readdirSync(imagesDir);

const imageMap = {};

files.forEach(file => {

    if (!file.toLowerCase().endsWith(".webp")) return;

    const name = file.replace(".webp", "");

    // استخراج أول مجموعة أرقام من الاسم
    const match = name.match(/\d+/);

    if (!match) return;

    const sku = match[0];

    imageMap[sku] = file;

});

fs.writeFileSync(
    path.join(__dirname, "..", "images.json"),
    JSON.stringify(imageMap, null, 2),
    "utf8"
);

console.log("تم إنشاء images.json");
console.log("عدد الصور:", Object.keys(imageMap).length);
