import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut as fbSignOut } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'


const firebaseConfig = {
apiKey: import.meta.env.VITE_FB_API_KEY,
authDomain: import.meta.env.VITE_FB_AUTH_DOMAIN,
projectId: import.meta.env.VITE_FB_PROJECT_ID,
storageBucket: import.meta.env.VITE_FB_STORAGE,
messagingSenderId: import.meta.env.VITE_FB_SENDER,
appId: import.meta.env.VITE_FB_APP_ID,
}
const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)
export async function signIn(){ const prov=new GoogleAuthProvider(); await signInWithPopup(auth, prov) }
export async function signOut(){ await fbSignOut(auth) }