import { db } from './firebase.js';
import { collection, addDoc } from "firebase/firestore";

async function saveUserData() {
  try {
    const docRef = await addDoc(collection(db, "users"), {
      name: "Alice",
      age: 21,
      createdAt: new Date()
    });
    console.log("Document written with ID:", docRef.id);
  } catch (e) {
    console.error("Error adding document:", e);
  }
}

saveUserData();
