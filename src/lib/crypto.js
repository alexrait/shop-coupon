/**
 * Vault Cart Cryptography Module (Vanilla JS)
 * Uses standard Web Crypto API for all operations
 */

export const cryptoUtils = {
    // --- 1. Key Generation ---

    /**
     * Generates an RSA-OAEP Key Pair for the user/list
     */
    async generateRSAKeyPair() {
        return window.crypto.subtle.generateKey(
            {
                name: "RSA-OAEP",
                modulusLength: 4096,
                publicExponent: new Uint8Array([1, 0, 1]),
                hash: "SHA-256",
            },
            true, // extractable so we can save it encrypted
            ["encrypt", "decrypt"]
        );
    },

    /**
     * Generates a random AES-GCM key for encrypting a specific coupon or list
     */
    async generateAESKey() {
        return window.crypto.subtle.generateKey(
            {
                name: "AES-GCM",
                length: 256
            },
            true,
            ["encrypt", "decrypt"]
        );
    },

    /**
     * Derives an AES-GCM Key from a user password using PBKDF2
     */
    async deriveKeyFromPassword(password, saltArray) {
        const enc = new TextEncoder();
        const keyMaterial = await window.crypto.subtle.importKey(
            "raw",
            enc.encode(password),
            { name: "PBKDF2" },
            false,
            ["deriveBits", "deriveKey"]
        );

        return window.crypto.subtle.deriveKey(
            {
                name: "PBKDF2",
                salt: saltArray,
                iterations: 100000,
                hash: "SHA-256"
            },
            keyMaterial,
            { name: "AES-GCM", length: 256 },
            false,
            ["encrypt", "decrypt"]
        );
    },

    // --- 2. Key Export/Import Base64 ---

    async exportPrivateKey(key) {
        const exported = await window.crypto.subtle.exportKey("pkcs8", key);
        return this.arrayBufferToBase64(exported);
    },

    async exportPublicKey(key) {
        const exported = await window.crypto.subtle.exportKey("spki", key);
        return this.arrayBufferToBase64(exported);
    },

    async exportAESKey(key) {
        const exported = await window.crypto.subtle.exportKey("raw", key);
        return this.arrayBufferToBase64(exported);
    },

    async importPrivateKey(base64) {
        const binary = this.base64ToArrayBuffer(base64);
        return window.crypto.subtle.importKey(
            "pkcs8",
            binary,
            {
                name: "RSA-OAEP",
                hash: "SHA-256",
            },
            false, // non-extractable once imported!
            ["decrypt"]
        );
    },

    async importPublicKey(base64) {
        const binary = this.base64ToArrayBuffer(base64);
        return window.crypto.subtle.importKey(
            "spki",
            binary,
            {
                name: "RSA-OAEP",
                hash: "SHA-256",
            },
            true,
            ["encrypt"]
        );
    },

    async importAESKey(base64) {
        const binary = this.base64ToArrayBuffer(base64);
        return window.crypto.subtle.importKey(
            "raw",
            binary,
            { name: "AES-GCM" },
            true,
            ["encrypt", "decrypt"]
        );
    },

    // --- 3. Encryption / Decryption ---

    /**
     * Encrypt data with an AES-GCM Key
     */
    async encryptAES(data, key) {
        const enc = new TextEncoder();
        const encoded = enc.encode(data);
        const iv = window.crypto.getRandomValues(new Uint8Array(12));

        const ciphertext = await window.crypto.subtle.encrypt(
            {
                name: "AES-GCM",
                iv: iv
            },
            key,
            encoded
        );

        return {
            cipher: this.arrayBufferToBase64(ciphertext),
            iv: this.arrayBufferToBase64(iv)
        };
    },

    /**
     * Decrypt data with an AES-GCM Key
     */
    async decryptAES(cipherBase64, ivBase64, key) {
        const dec = new TextDecoder();
        const ciphertext = this.base64ToArrayBuffer(cipherBase64);
        const iv = this.base64ToArrayBuffer(ivBase64);

        const decrypted = await window.crypto.subtle.decrypt(
            {
                name: "AES-GCM",
                iv: iv
            },
            key,
            ciphertext
        );

        return dec.decode(decrypted);
    },

    /**
     * Encrypt small data (like an exported AES key) with an RSA Public Key
     */
    async encryptRSA(dataBase64, publicKey) {
        const data = this.base64ToArrayBuffer(dataBase64);
        const ciphertext = await window.crypto.subtle.encrypt(
            {
                name: "RSA-OAEP"
            },
            publicKey,
            data
        );
        return this.arrayBufferToBase64(ciphertext);
    },

    /**
     * Decrypt small data with an RSA Private Key
     */
    async decryptRSA(cipherBase64, privateKey) {
        const ciphertext = this.base64ToArrayBuffer(cipherBase64);
        const decrypted = await window.crypto.subtle.decrypt(
            {
                name: "RSA-OAEP"
            },
            privateKey,
            ciphertext
        );
        return this.arrayBufferToBase64(decrypted);
    },

    // --- Utility ---

    generateSalt() {
        const salt = window.crypto.getRandomValues(new Uint8Array(16));
        return this.arrayBufferToBase64(salt);
    },

    arrayBufferToBase64(buffer) {
        let binary = '';
        const bytes = new Uint8Array(buffer);
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return window.btoa(binary);
    },

    base64ToArrayBuffer(base64) {
        const binary_string = window.atob(base64);
        const len = binary_string.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binary_string.charCodeAt(i);
        }
        return bytes.buffer;
    }
};
