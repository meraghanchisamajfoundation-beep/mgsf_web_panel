
import { NextRequest, NextResponse } from "next/server";
import admin from "../../admin";
import { getAuth } from "firebase/auth";
import { verifyAdmin } from "../../helperfile/commonFun";
const adminAuth = getAuth(admin)
export async function GET(req) {

    const auth = await verifyAdmin(req);
    if (!auth.success) {
        return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    try {
        const listUsers = await adminAuth.listUsers(1000); // max 1000 per call
        const users = listUsers.users.map(user => ({
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            role: user.customClaims?.role,
            eventId: user.customClaims?.eventId,
            disabled: user.disabled,
        }));

        return NextResponse.json({ users });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}