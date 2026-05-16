
import { NextRequest, NextResponse } from "next/server";
import admin from "../../admin";
import { getAuth } from "firebase/auth";
import { verifyAdmin } from "../../helperfile/commonFun";
const adminAuth = getAuth(admin)

export async function POST(req) {
        const auth = await verifyAdmin(req);
        if (!auth.success) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }
    try {
        const { uid, role, eventId, ...extraClaims } = await req.json();

        if (!uid) {
            return NextResponse.json({ error: "UID is required" }, { status: 400 });
        }

        const claims = {};
        if (role) claims.role = role;
        if (eventId) claims.eventId = eventId;
        Object.assign(claims, extraClaims); // any other custom data

        await adminAuth.setCustomUserClaims(uid, claims);

        // Force token refresh on next login
        await adminAuth.revokeRefreshTokens(uid);

        return NextResponse.json({
            success: true,
            message: "Custom claims updated",
            claims
        });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}