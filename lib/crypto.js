import crypto from 'crypto';

// Derives a key using PBKDF2 and encrypts text with AES-256-GCM
export function encryptData(text, pin) {
  const salt = crypto.randomBytes(16).toString('hex');
  const key = crypto.pbkdf2Sync(pin, salt, 100000, 32, 'sha256');
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');

  return {
    encryptedData: encrypted + authTag,
    salt,
    iv: iv.toString('hex')
  };
}

// Decrypts payload using user supplied validation PIN
export function decryptData(encryptedStr, pin, salt, ivHex) {
  try {
    const key = crypto.pbkdf2Sync(pin, salt, 100000, 32, 'sha256');
    const iv = Buffer.from(ivHex, 'hex');
    
    const authTagPos = encryptedStr.length - 32;
    const encrypted = encryptedStr.slice(0, authTagPos);
    const authTag = Buffer.from(encryptedStr.slice(authTagPos), 'hex');
    
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    throw new Error("Invalid access token PIN parameters.");
  }
}

