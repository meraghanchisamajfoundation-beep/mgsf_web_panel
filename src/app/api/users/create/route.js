

import { NextRequest, NextResponse } from "next/server";
import admin from "../../admin";
// import { getAuth } from "firebase/auth";
import { verifyAdmin } from "../../helperfile/commonFun";
import { getAuth } from "firebase-admin/auth";
const adminAuth = getAuth(admin)
export async function POST(req) {
        const auth = await verifyAdmin(req);
        if (!auth.success) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }
    try {
        const { email, password, displayName, role = "viewer", eventId, ...extraData } = await req.json();

        if (!email || !password) {
            return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
        }

        // Create user in Firebase Auth
        const userRecord = await adminAuth.createUser({
            email,
            password,
            displayName: displayName || undefined,
            emailVerified: false,
        });

        // Set custom claims (role + custom data)
        const customClaims = { role };
        if (eventId) customClaims.eventId = eventId;
        if (extraData) Object.assign(customClaims, extraData); // e.g., department, companyId

        await adminAuth.setCustomUserClaims(userRecord.uid, customClaims);

        // Optional: Revoke tokens so user gets new claims on next login
        await adminAuth.revokeRefreshTokens(userRecord.uid);

        return NextResponse.json({
            success: true,
            uid: userRecord.uid,
            email: userRecord.email,
            role,
            eventId,
        });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}