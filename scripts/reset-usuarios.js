const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");

const defaultData = {
  ana: {
    password: "contrasena",
    balance: 1000,
  },
};

const archivos = [
  path.join(root, "vulnerable", "usuarios.json"),
  path.join(root, "fixed", "usuarios.json"),
  path.join(root, "fixed", "defense-1-token", "usuarios.json"),
  path.join(root, "fixed", "defense-2-samesite", "strict", "usuarios.json"),
  path.join(root, "fixed", "defense-2-samesite", "lax", "usuarios.json"),
  path.join(root, "fixed", "defense-2-samesite", "none", "usuarios.json"),
  path.join(root, "fixed", "defense-3-headers", "usuarios.json"),
];

function ensureDir(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

let total = 0;
for (const archivo of archivos) {
  try {
    ensureDir(archivo);
    fs.writeFileSync(archivo, JSON.stringify(defaultData, null, 2), "utf8");
    console.log(`✔ Restablecido: ${path.relative(root, archivo)}`);
    total++;
  } catch (e) {
    console.warn(`✖ No se pudo restablecer ${archivo}:`, e.message);
  }
}

console.log(`\nHecho. Archivos restablecidos: ${total}`);
