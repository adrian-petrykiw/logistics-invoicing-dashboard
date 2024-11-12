import { createDecipheriv } from "crypto";

export function decryptTransactionData(encryptedData: string, keyHex: string) {
  const [ivHex, encryptedHex] = encryptedData.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const key = Buffer.from(keyHex, "hex");

  const decipher = createDecipheriv("aes-256-cbc", key, iv);
  let decrypted = decipher.update(encryptedHex, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return JSON.parse(decrypted);
}
