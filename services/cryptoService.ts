import CryptoJS from 'https://esm.sh/crypto-js@4.2.0';

// Key derivation using PBKDF2
const deriveKey = (masterKey: string, salt: string): CryptoJS.lib.WordArray => {
  return CryptoJS.PBKDF2(masterKey, salt, {
    keySize: 256 / 32, // 256 bits
    iterations: 1000,
  });
};

// Encryption
export const encryptValue = (plainText: string, masterKey: string, salt: string) => {
  const key = deriveKey(masterKey, salt);
  const iv = CryptoJS.lib.WordArray.random(128 / 8); // 128-bit IV
  const encrypted = CryptoJS.AES.encrypt(plainText, key, {
    iv: iv,
    padding: CryptoJS.pad.Pkcs7,
    mode: CryptoJS.mode.CBC,
  });
  return {
    encryptedValue: encrypted.toString(),
    iv: iv.toString(CryptoJS.enc.Hex),
  };
};

// Decryption
export const decryptValue = (encryptedValue: string, ivHex: string, masterKey: string, salt: string): string => {
  try {
    const key = deriveKey(masterKey, salt);
    const iv = CryptoJS.enc.Hex.parse(ivHex);
    const decrypted = CryptoJS.AES.decrypt(encryptedValue, key, {
      iv: iv,
      padding: CryptoJS.pad.Pkcs7,
      mode: CryptoJS.mode.CBC,
    });
    const decryptedText = decrypted.toString(CryptoJS.enc.Utf8);
    if (!decryptedText) {
        throw new Error("Decryption failed: result is empty. The master key is likely incorrect.");
    }
    return decryptedText;
  } catch (error) {
    console.error("Decryption error:", error);
    throw new Error("Decryption failed. The master key is likely incorrect.");
  }
};

// Function to generate a random salt
export const generateSalt = (): string => {
    return CryptoJS.lib.WordArray.random(128 / 8).toString(CryptoJS.enc.Hex);
};