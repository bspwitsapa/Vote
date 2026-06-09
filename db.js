/**
 * db.js — IndexedDB helper สำหรับเก็บรูปภาพ
 * ใช้แทน localStorage เพื่อรองรับไฟล์ขนาดใหญ่
 *
 * Object stores:
 *   "images"  — key: string (เช่น "student_<grade>_<idx>", "logo")
 *               value: base64 string หรือ Blob
 */

const DB_NAME    = 'VoteAppDB';
const DB_VERSION = 1;
const STORE_IMG  = 'images';

let _db = null;

/** เปิด (หรือสร้าง) database — คืน Promise<IDBDatabase> */
function openDB() {
  if (_db) return Promise.resolve(_db);

  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_IMG)) {
        db.createObjectStore(STORE_IMG); // key-path แบบ out-of-line
      }
    };

    req.onsuccess = (e) => {
      _db = e.target.result;
      resolve(_db);
    };

    req.onerror = (e) => {
      console.error('[DB] open error', e.target.error);
      reject(e.target.error);
    };
  });
}

/**
 * บันทึกรูป
 * @param {string} key   - ชื่อ key เช่น "student_1_0", "logo"
 * @param {string} value - base64 data URL
 */
async function dbSetImage(key, value) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx    = db.transaction(STORE_IMG, 'readwrite');
    const store = tx.objectStore(STORE_IMG);
    const req   = store.put(value, key);
    req.onsuccess = () => resolve();
    req.onerror   = (e) => { console.error('[DB] put error', e.target.error); reject(e.target.error); };
  });
}

/**
 * ดึงรูป
 * @param {string} key
 * @returns {Promise<string|null>} base64 data URL หรือ null ถ้าไม่พบ
 */
async function dbGetImage(key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx    = db.transaction(STORE_IMG, 'readonly');
    const store = tx.objectStore(STORE_IMG);
    const req   = store.get(key);
    req.onsuccess = (e) => resolve(e.target.result ?? null);
    req.onerror   = (e) => { console.error('[DB] get error', e.target.error); reject(e.target.error); };
  });
}

/**
 * ลบรูป
 * @param {string} key
 */
async function dbDeleteImage(key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx    = db.transaction(STORE_IMG, 'readwrite');
    const store = tx.objectStore(STORE_IMG);
    const req   = store.delete(key);
    req.onsuccess = () => resolve();
    req.onerror   = (e) => reject(e.target.error);
  });
}

/**
 * ดึง key ทั้งหมดที่ขึ้นต้นด้วย prefix
 * @param {string} prefix
 * @returns {Promise<string[]>}
 */
async function dbListKeys(prefix = '') {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx    = db.transaction(STORE_IMG, 'readonly');
    const store = tx.objectStore(STORE_IMG);
    const req   = store.getAllKeys();
    req.onsuccess = (e) => {
      const keys = e.target.result.filter(k => k.startsWith(prefix));
      resolve(keys);
    };
    req.onerror = (e) => reject(e.target.error);
  });
}

/**
 * ลบรูปทั้งหมดที่ขึ้นต้นด้วย prefix (ใช้ตอนลบนักเรียนทั้งชั้น)
 * @param {string} prefix
 */
async function dbDeleteByPrefix(prefix) {
  const keys = await dbListKeys(prefix);
  await Promise.all(keys.map(k => dbDeleteImage(k)));
}

/**
 * compress รูปก่อนบันทึก — ลด base64 ให้เล็กลงก่อน store
 * @param {string} dataUrl  - base64 data URL จาก FileReader
 * @param {number} maxPx    - ความกว้าง/สูงสูงสุด (default 400px)
 * @param {number} quality  - JPEG quality 0-1 (default 0.75)
 * @returns {Promise<string>} compressed base64 data URL
 */
function compressImage(dataUrl, maxPx = 400, quality = 0.75) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;

      // scale down ถ้าใหญ่เกิน
      if (width > maxPx || height > maxPx) {
        if (width > height) {
          height = Math.round(height * maxPx / width);
          width  = maxPx;
        } else {
          width  = Math.round(width * maxPx / height);
          height = maxPx;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width  = width;
      canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => resolve(dataUrl); // fallback: คืน original
    img.src = dataUrl;
  });
}
