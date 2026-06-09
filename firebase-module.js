/**
 * Firebase Integration Module
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  setDoc, 
  getDoc, 
  getDocs, 
  doc, 
  query, 
  where, 
  serverTimestamp,
  deleteDoc,
  updateDoc,
  increment
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// TODO: Replace this with your actual Firebase configuration from Firebase Console
const firebaseConfig = {
  apiKey: "AIzaSyCPP31I9OZCJgVKfwl3TnzTBC0UUmMc0Y0",
  authDomain: "vote-631a4.firebaseapp.com",
  projectId: "vote-631a4",
  storageBucket: "vote-631a4.firebasestorage.app",
  messagingSenderId: "931229660709",
  appId: "1:931229660709:web:0252830c02e950108f71cc",
  measurementId: "G-KC6Q0DL87D"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Helper for virtual email
const getVirtualEmail = (studentID) => `${studentID}@vote.local`;

export const fb = {
  // User Management
  async registerUser(userData, password) {
    const virtualEmail = getVirtualEmail(userData.studentID);
    const userCredential = await createUserWithEmailAndPassword(auth, virtualEmail, password);
    const user = userCredential.user;
    const userRef = doc(db, "users", userData.studentID);
    await setDoc(userRef, {
      ...userData,
      uid: user.uid,
      createdAt: serverTimestamp()
    });
    return userData;
  },

  async loginUser(studentID, password) {
    const virtualEmail = getVirtualEmail(studentID);
    const userCredential = await signInWithEmailAndPassword(auth, virtualEmail, password);
    const userRef = doc(db, "users", studentID);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) return userSnap.data();
    throw new Error("ไม่พบข้อมูลผู้ใช้ในระบบ");
  },

  async logoutUser() { return await signOut(auth); },
  onAuthState(callback) { return onAuthStateChanged(auth, callback); },

  // Student Candidates Management
  async addCandidate(candidateData, imageBase64) {
    // Save image as base64 string directly in Firestore to stay within free tier
    // WARNING: Firestore document limit is 1MB. Use small/compressed images.
    const candidateDoc = {
      name: candidateData.name,
      grade: parseInt(candidateData.grade),
      room: parseInt(candidateData.room),
      imageUrl: imageBase64, // Now stores the actual base64 string
      createdAt: serverTimestamp(),
      voteCount: 0
    };

    try {
      const docRef = await addDoc(collection(db, "candidates"), candidateDoc);
      return { id: docRef.id, ...candidateDoc };
    } catch (e) {
      console.error("Firestore Error:", e);
      throw new Error("บันทึกข้อมูลไม่สำเร็จ: " + e.message);
    }
  },

  async getCandidates() {
    const q = query(collection(db, "candidates"));
    const querySnapshot = await getDocs(q);
    const candidates = [];
    querySnapshot.forEach((doc) => {
      candidates.push({ id: doc.id, ...doc.data() });
    });
    return candidates.sort((a, b) => (a.name > b.name ? 1 : -1));
  },

  async deleteCandidate(candidateId) {
    await deleteDoc(doc(db, "candidates", candidateId));
  },

  // Voting Logic
  async castVote(studentID, candidateId, grade) {
    // Check if voting is open (Manual Toggle)
    const settings = await this.getSettings();
    if (!settings.isOpen) {
      throw new Error("ระบบโหวตปิดอยู่ในขณะนี้");
    }

    const voteRef = doc(db, "votes", studentID);
    const voteSnap = await getDoc(voteRef);
    if (voteSnap.exists()) throw new Error("คุณได้ใช้สิทธิ์โหวตไปแล้ว");
    await setDoc(voteRef, {
      studentID, candidateId, grade, timestamp: serverTimestamp()
    });
    const candidateRef = doc(db, "candidates", candidateId);
    await updateDoc(candidateRef, { voteCount: increment(1) });
  },

  async hasVoted(studentID) {
    if (!studentID) return false;
    const voteRef = doc(db, "votes", studentID);
    const voteSnap = await getDoc(voteRef);
    return voteSnap.exists();
  },

  // System Settings (Manual Toggle Control)
  async getSettings() {
    const docRef = doc(db, "system", "settings");
    const snap = await getDoc(docRef);
    if (snap.exists()) return snap.data();
    return { isOpen: false };
  },

  async updateSettings(isOpen) {
    const docRef = doc(db, "system", "settings");
    await setDoc(docRef, {
      isOpen: !!isOpen
    }, { merge: true });
  }
};
