import { NextResponse } from "next/server";
import admin from "../admin";

export async function POST(req) {
  const { action, email, password, uid, newPassword, OrgData } = await req.json();

  try {
    if (action === "create") {
      // Check if user already exists
      try {
        await admin.auth().getUserByEmail(email);
        return NextResponse.json({ error: "User with this email already exists." }, { status: 400 });
      } catch (err) {
        if (err.code !== "auth/user-not-found") {
          return NextResponse.json({ error: err.message }, { status: 500 });
        }
      }

      // Create Auth user
      const userRecord = await admin.auth().createUser({ email, password });

      // ---- SET CUSTOM CLAIMS HERE ----
      await admin.auth().setCustomUserClaims(userRecord.uid, {
        ...OrgData
      });

      return NextResponse.json({ success: true, user: userRecord });
    }

    if (action === "delete") {
      await admin.auth().deleteUser(uid);
      return NextResponse.json({ success: true });
    }

    if (action === "updatePassword") {
      await admin.auth().updateUser(uid, { password: newPassword });
      return NextResponse.json({ success: true });
    }

if (action === "checkEmail") {
  try {
    // 1. Check Firebase Auth
    await admin.auth().getUserByEmail(email);

    // 2. Check Firestore users collection
    const db = admin.firestore();
    const usersRef = db.collection("users");
    const snapshot = await usersRef.where("email", "==", email).limit(1).get();

    if (snapshot.empty) {
      return NextResponse.json({ exists: false });
    }

    return NextResponse.json({ exists: true });
  } catch (err) {
    if (err.code === "auth/user-not-found") {
      return NextResponse.json({ exists: false });
    }
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
