// Генерирует ADMIN_PASSWORD_HASH для входа организатора.
// Запуск: npm run hash-password  → ввести пароль (символы не отображаются).
import { scrypt, randomBytes } from "node:crypto";
import { promisify } from "node:util";
import readline from "node:readline";

const N = 32768;
const r = 8;
const p = 1;
const KEYLEN = 64;

function askHidden(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    rl._writeToOutput = function (str) {
      if (str.includes(question)) rl.output.write(str);
    };
    rl.question(question, (answer) => {
      rl.close();
      process.stdout.write("\n");
      resolve(answer);
    });
  });
}

const password = await askHidden("Пароль организатора: ");

if (!password || password.length < 10) {
  console.error("Пароль должен быть не короче 10 символов.");
  process.exit(1);
}

const salt = randomBytes(16);
const hash = await promisify(scrypt)(password.normalize("NFKC"), salt, KEYLEN, {
  N,
  r,
  p,
  maxmem: 256 * N * r,
});

const value = ["scrypt", N, r, p, salt.toString("base64url"), Buffer.from(hash).toString("base64url")].join(":");
console.log("\nДобавь в переменные окружения сервера (не в репозиторий):\n");
console.log(`ADMIN_PASSWORD_HASH="${value}"`);
