import { getAuth, GoogleAuthProvider, signInWithCredential, signOut as firebaseSignOut } from "@react-native-firebase/auth";
import firestore from "@react-native-firebase/firestore";
import { GoogleSignin } from "@react-native-google-signin/google-signin";

const WEB_CLIENT_ID = "303552661726-8n1gh5ii595ntuqrv3h5v5t9mql2toog.apps.googleusercontent.com";

let isGoogleConfigured = false;

export interface FirebaseAuthUser {
  id: string;
  name: string;
  email: string;
  role: "owner" | "admin" | "employee";
  token: string;
  photoURL?: string | null;
}

export function configureGoogleSignIn() {
  if (isGoogleConfigured) return;

  GoogleSignin.configure({
    webClientId: WEB_CLIENT_ID,
  });

  isGoogleConfigured = true;
}

export async function signInWithGoogle(): Promise<FirebaseAuthUser | null> {
  configureGoogleSignIn();

  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

  const googleResult = await GoogleSignin.signIn();
  if (googleResult.type === "cancelled") {
    return null;
  }

  if (!googleResult.data.idToken) {
    throw new Error("Google sign-in did not return an ID token.");
  }

  const credential = GoogleAuthProvider.credential(googleResult.data.idToken);
  const authResult = await signInWithCredential(getAuth(), credential);
  const firebaseUser = authResult.user;
  const token = await firebaseUser.getIdToken();

  const appUser: FirebaseAuthUser = {
    id: firebaseUser.uid,
    name: firebaseUser.displayName || googleResult.data.user.name || "JCash User",
    email: firebaseUser.email || googleResult.data.user.email,
    role: "owner",
    token,
    photoURL: firebaseUser.photoURL || googleResult.data.user.photo,
  };

  saveUserProfile(appUser).catch((error) => {
    console.warn("[FirebaseAuth] User profile save skipped:", error?.message || error);
  });

  return appUser;
}

export async function getCurrentFirebaseUser(): Promise<FirebaseAuthUser | null> {
  const firebaseUser = getAuth().currentUser;
  if (!firebaseUser) return null;

  const token = await firebaseUser.getIdToken();

  return {
    id: firebaseUser.uid,
    name: firebaseUser.displayName || "JCash User",
    email: firebaseUser.email || "",
    role: "owner",
    token,
    photoURL: firebaseUser.photoURL,
  };
}

export async function signOutFromFirebase() {
  configureGoogleSignIn();

  await Promise.allSettled([
    firebaseSignOut(getAuth()),
    GoogleSignin.signOut(),
  ]);
}

async function saveUserProfile(user: FirebaseAuthUser) {
  await firestore()
    .collection("users")
    .doc(user.id)
    .set(
      {
        name: user.name,
        email: user.email,
        photoURL: user.photoURL || null,
        lastLoginAt: firestore.FieldValue.serverTimestamp(),
        updatedAt: firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
}
