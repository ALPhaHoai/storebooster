import crypto from "crypto";

function generatePrivateKey() {
  // Generate a 32-byte private key (store securely!)
  const PRIVATE_KEY = crypto.randomBytes(32).toString("hex");
  console.log("Private Key:", PRIVATE_KEY); // Store this securely!!
}

// Function to encrypt text
export function encryptData(data) {
  return encryptDataGCM(data);
}

// Function to decrypt text
export function decryptData(encryptedData) {
  if (encryptedData.startsWith("v2:")) {
    return decryptDataGCM(encryptedData.substring(3));
  } else {
    return decryptDataCBC(encryptedData);
  }
}

function decryptDataCBC(encryptedData) {
  const privateKey = getEncryptionKey();
  const [iv, encryptedText] = encryptedData.split(":");

  const decipher = crypto.createDecipheriv("aes-256-cbc", Buffer.from(privateKey, "hex"), Buffer.from(iv, "hex"));

  let decrypted = decipher.update(encryptedText, "hex", "utf-8");
  decrypted += decipher.final("utf-8");

  return decrypted;
}

function encryptDataGCM(data) {
  const privateKey = getEncryptionKey();
  // Use a 12-byte nonce, as recommended by NIST for GCM.
  const nonce = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", privateKey, nonce);

  let encrypted = cipher.update(data, "utf-8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");

  return `v2:${nonce.toString("hex")}:${encrypted}:${authTag}`;
}

function decryptDataGCM(gcmEncryptedData) {
  const parts = gcmEncryptedData.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid GCM data format");
  }

  const privateKey = getEncryptionKey();
  const [nonceHex, ciphertextHex, authTagHex] = parts;
  const nonce = Buffer.from(nonceHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");

  const decipher = crypto.createDecipheriv("aes-256-gcm", privateKey, nonce);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(ciphertextHex, "hex", "utf-8");
  decrypted += decipher.final("utf-8");

  return decrypted;
}

/*
 * @deprecated Use AES-256-GCM instead
 */
function encryptDataCBC(data) {
  const privateKey = getEncryptionKey();
  const iv = crypto.randomBytes(16); // Generate a new IV for each encryption
  const cipher = crypto.createCipheriv("aes-256-cbc", Buffer.from(privateKey, "hex"), iv);

  let encrypted = cipher.update(data, "utf-8", "hex");
  encrypted += cipher.final("hex");

  return `${iv.toString("hex")}:${encrypted}`;
}

/**
 * Returns a validated 32-byte encryption key from environment variables.
 * Throws if the key is missing or not 32 bytes (256 bits).
 */
export function getEncryptionKey() {
  const keyHex = process.env.PRIVATE_KEY_DB;
  if (!keyHex) {
    throw new Error("Missing PRIVATE_KEY_DB in environment variables");
  }

  const key = Buffer.from(keyHex, "hex");
  if (key.length !== 32) {
    throw new Error("Invalid PRIVATE_KEY_DB length: must be 32 bytes (64 hex chars)");
  }

  return key;
}
