import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDG8hpJggHKpWBLaILx2WJrD-Jw7XcKvRg",
  authDomain: "cft-drop---estoque-flash.firebaseapp.com",
  projectId: "cft-drop---estoque-flash",
  storageBucket: "cft-drop---estoque-flash.firebasestorage.app",
  messagingSenderId: "513670906518",
  appId: "1:513670906518:web:eec3f177a4779f3ddf78b7"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const TENANTS_COLLECTION = `saas_tenants`;