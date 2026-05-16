import {  NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth"
import admin from "../admin";

const adminAuth = getAuth(admin)

export async function verifyAdmin(req) {
    try {
        // Get token from Authorization header (Bearer token)
        const authHeader = req.headers.get("authorization");
        if (!authHeader?.startsWith("Bearer ")) {
            return { error: "Unauthorized: No token provided", status: 401 };
        }

        const idToken = authHeader.split("Bearer ")[1];

        // Verify the token with Firebase Admin
        const decodedToken = await adminAuth.verifyIdToken(idToken, true); // true = check revoked

        // Check if user is admin
        if (decodedToken.role !== "admin" && decodedToken.role !== "superadmin") {
            return { error: "Forbidden: Admin access required", status: 403 };
        }

        return { decodedToken, success: true };
    } catch (error) {
        console.error("Token verification failed:", error.message);
        return {
            error: "Invalid or expired token",
            status: 401
        };
    }
}