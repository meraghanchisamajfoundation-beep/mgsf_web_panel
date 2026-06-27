import { NextResponse } from "next/server";
import admin from "../admin";

const db = admin.firestore();
const auth = admin.auth();

/**
 * CREATE MEMBER ACCOUNT
 * POST
 */
export async function POST(req) {
  try {
    const body = await req.json();

    const {
      memberId,
      displayName,
      photoURL,
      password,
      programId,
      registrationNumber,
      memberCollectionPath,
      createdBy
    } = body;

    if (!memberId || !registrationNumber) {
      return NextResponse.json(
        { success: false, message: "memberId and registrationNumber required" },
        { status: 400 }
      );
    }

    const email = `${registrationNumber}@gmail.com`;

    // check if auth already exists
    try {
      const existingUser = await auth.getUser(memberId);

      return NextResponse.json({
        success: true,
        message: "User already exists",
        user: existingUser
      });
    } catch (err) {
      // user not found -> create
    }

    const user = await auth.createUser({
      uid: memberId,
      email,
      emailVerified: true,
      displayName: displayName || "",
      photoURL: photoURL || null,
      password: password || "Member@123"
    });

    // custom claims
    await auth.setCustomUserClaims(memberId, {
      role: "member",
      programId: programId || "",
      createdBy: createdBy || "",
      displayName: displayName || "",
      email: email,
      photoURL: photoURL || null
    });

    // update firestore member doc
    const memberRef = db.collection(memberCollectionPath).doc(memberId);
    const memberDoc = await memberRef.get();

    if (memberDoc.exists) {
      await memberRef.update({
        uid: memberId,
        account_flag: true,
        password: password || "Member@123"
      });
    }

    return NextResponse.json({
      success: true,
      message: "Member account created successfully",
      user
    });

  } catch (error) {
    console.error("CREATE ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: error.message
      },
      { status: 500 }
    );
  }
}

/**
 * UPDATE PASSWORD
 * PUT
 */
export async function PUT(req) {
  try {
    const body = await req.json();
    const { memberId, newPassword } = body;

    if (!memberId || !newPassword) {
      return NextResponse.json(
        {
          success: false,
          message: "memberId and newPassword required"
        },
        { status: 400 }
      );
    }

    await auth.updateUser(memberId, {
      password: newPassword
    });

    return NextResponse.json({
      success: true,
      message: "Password updated successfully"
    });

  } catch (error) {
    console.error("PASSWORD UPDATE ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: error.message
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE MEMBER ACCOUNT
 * DELETE
 */
export async function DELETE(req) {
  try {
    const body = await req.json();
    const { memberId, memberCollectionPath } = body;

    if (!memberId) {
      return NextResponse.json(
        {
          success: false,
          message: "memberId required"
        },
        { status: 400 }
      );
    }

    // get member doc to find file URLs
    const memberRef = db.collection(memberCollectionPath).doc(memberId);
    const memberDoc = await memberRef.get();
    const memberData = memberDoc.exists ? memberDoc.data() : {};

    // delete auth user
    try {
      await auth.deleteUser(memberId);
    } catch (authErr) {
      if (authErr.code !== "auth/user-not-found") {
        console.error("Auth delete error:", authErr.message);
      }
    }

    // delete storage files
    const fileFields = ["photoURL", "extraImageURL", "documentFrontURL", "documentBackURL", "guardianDocumentURL", "guardianDocumentBackURL"];
    const bucket = admin.storage().bucket();
    for (const field of fileFields) {
      const url = memberData[field];
      if (url && url.startsWith("https://firebasestorage.googleapis.com")) {
        try {
          // extract path from URL: /v0/b/{bucket}/o/{encoded-path}?...
          const match = url.match(/\/o\/(.+?)(\?|$)/);
          if (match) {
            const filePath = decodeURIComponent(match[1]);
            await bucket.file(filePath).delete();
          }
        } catch (fileErr) {
          console.error(`Failed to delete ${field}:`, fileErr.message);
        }
      }
    }

    // delete member document
    if (memberDoc.exists) {
      await memberRef.delete();
    }

    return NextResponse.json({
      success: true,
      message: "Member deleted successfully (auth + files + document)"
    });

  } catch (error) {
    console.error("DELETE ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: error.message
      },
      { status: 500 }
    );
  }
}