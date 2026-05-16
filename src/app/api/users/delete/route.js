
import { NextRequest, NextResponse } from "next/server";
import admin from "../../admin";
import { getAuth } from "firebase/auth";
import { verifyAdmin } from "../../helperfile/commonFun";
const adminAuth = getAuth(admin)

export async function DELETE(req) {
        const auth = await verifyAdmin(req);
        if (!auth.success) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }
    try {
        const { uid } = await req.json();

        if (!uid) {
            return NextResponse.json({ error: "UID is required" }, { status: 400 });
        }

        await adminAuth.deleteUser(uid);

        return NextResponse.json({ success: true, message: "User deleted successfully" });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}