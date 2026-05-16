
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
        const { uid, newPassword } = await req.json();

        if (!uid || !newPassword || newPassword.length < 6) {
            return NextResponse.json({ error: "Valid UID and password (min 6 chars) required" }, { status: 400 });
        }

        await adminAuth.updateUser(uid, { password: newPassword });

        return NextResponse.json({ success: true, message: "Password updated successfully" });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}