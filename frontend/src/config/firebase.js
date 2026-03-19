import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyDurNs_Mud2XyCgyxNjspytxX34LyLm5no",
  authDomain: "smartaid-ai.firebaseapp.com",
  projectId: "smartaid-ai",
  storageBucket: "smartaid-ai.firebasestorage.app",
  messagingSenderId: "400922585427",
  appId: "1:400922585427:web:d69c318ea99ab92fd3d9a6",
  measurementId: "G-M3MTYLH9K7"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const analytics = getAnalytics(app);
