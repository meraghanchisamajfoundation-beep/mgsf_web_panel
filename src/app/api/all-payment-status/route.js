// app/api/all-payment-status/route.js
import { NextResponse } from 'next/server';
import admin from '../admin';

const adminDb = admin.firestore();
const adminAuth = admin.auth();

// ── Auth helper ───────────────────────────────────────────────────────────────
async function verifyToken(request) {
  const token = request.headers.get('Authorization')?.split('Bearer ')[1];
  if (!token) return { uid: null, error: 'Unauthorized' };
  try {
    const decoded = await adminAuth.verifyIdToken(token);
    return { uid: decoded.uid, error: null };
  } catch {
    return { uid: null, error: 'Invalid or expired token' };
  }
}

// ── Core data fetching logic (shared between GET & POST) ──────────────────────
async function fetchPaymentData(uid, agentId, programId, groupId = null) {
  const base = adminDb
    .collection('users')
    .doc(uid)
    .collection('programs')
    .doc(programId);

  // Build members query
  const membersQuery = base
    .collection('members')
    .where('agentId', '==', agentId)
    .where('active_flag', '==', true)
    .where('delete_flag', '==', false)
    .where('status', '==', 'accepted');

  // Build payments query
  let paymentsQuery = base
    .collection('payment_pending')
    .where('memberDetails.agentId', '==', agentId);

  if (groupId) {
    paymentsQuery = paymentsQuery.where('closingGroupId', '==', groupId);
  }

  // Execute all queries in parallel
  const [membersSnap, paymentsSnap, programSnap, groupsSnap] = await Promise.all([
    membersQuery.get(),
    paymentsQuery.get(),
    base.get(),
    base.collection('closing_groups').get(),
  ]);

  const programName = programSnap.data()?.name || programId;

  // Build payments map by memberId
  const paymentsByMember = {};
  paymentsSnap.forEach((doc) => {
    const p = doc.data();
    const key = p.memberId;
    if (!paymentsByMember[key]) paymentsByMember[key] = [];
    paymentsByMember[key].push({ id: doc.id, ...p });
  });

  // Aggregate rows — EVERY active member is included, even one with no closing
  // payments yet (those come through with zero totals and status 'none') so the
  // list/PDF is a complete roster rather than only members who owe or paid.
  const rows = [];
  membersSnap.forEach((doc) => {
    const m = doc.data();
    const payments = paymentsByMember[doc.id] || [];

    let totalPaid = 0, totalPending = 0, paidCount = 0, pendingCount = 0;

    for (const p of payments) {
      const amt = Number(p.payAmount || 0);
      if (p.status === 'paid') {
        totalPaid += amt;
        paidCount++;
      } else {
        totalPending += amt;
        pendingCount++;
      }
    }

    rows.push({
      memberId: doc.id,
      registrationNumber: m.registrationNumber,
      memberName: m.displayName,
      fatherName: m.fatherName,
      phone: m.phone,
      village: m.village,
      applicationNumber: m.applicationNumber || '',
      guardian: m.guardian || '',
      guardianRelation: m.guardianRelation || '',
      district: m.district || '',
      state: m.state || '',
      programName,
      programId,
      totalPaid,
      totalPending,
      paidCount,
      pendingCount,
      // This member's own closing (marriage) — set by the Closing form
      isClosed: m.marriage_flag === true,
      closingDate: m.closing_date || '',
      closingDateQuery: m.closing_date_query || '',
      closingGroupName: m.closingGroupName || '',
      status: paidCount > 0 && pendingCount > 0 ? 'both'
        : paidCount > 0 ? 'paid'
        : pendingCount > 0 ? 'pending'
        : 'none',
    });
  });

  // ── Closed members ────────────────────────────────────────────────────────
  // The agent's own members whose closing (marriage) has happened. For these we
  // report what has been COLLECTED FOR them — contributions come from members
  // across all agents, so this needs its own query on `closingMemberId` rather
  // than reusing the payer-side result above.
  const closedMembers = rows.filter((r) => r.isClosed);

  if (closedMembers.length > 0) {
    const ids = closedMembers.map((r) => r.memberId);
    const chunks = [];
    for (let i = 0; i < ids.length; i += 30) chunks.push(ids.slice(i, i + 30));

    const snaps = await Promise.all(
      chunks.map((chunk) =>
        base.collection('payment_pending').where('closingMemberId', 'in', chunk).get()
      )
    );

    const byClosing = {};
    snaps.forEach((snap) =>
      snap.forEach((doc) => {
        const p = doc.data();
        if (p.delete_flag === true) return;
        const key = p.closingMemberId;
        if (!byClosing[key]) {
          byClosing[key] = { collected: 0, due: 0, paidCount: 0, pendingCount: 0 };
        }
        const amt = Number(p.payAmount || 0);
        if (p.status === 'paid') {
          byClosing[key].collected += amt;
          byClosing[key].paidCount++;
        } else {
          byClosing[key].due += amt;
          byClosing[key].pendingCount++;
        }
      })
    );

    closedMembers.forEach((r) => {
      const agg = byClosing[r.memberId] || {
        collected: 0, due: 0, paidCount: 0, pendingCount: 0,
      };
      r.collectedForMember   = agg.collected;
      r.dueForMember         = agg.due;
      r.contributorsPaid     = agg.paidCount;
      r.contributorsPending  = agg.pendingCount;
      r.contributorsTotal    = agg.paidCount + agg.pendingCount;
    });
  }

  // Closing groups list
  const closingGroups = groupsSnap.docs.map((d) => ({
    id: d.id,
    name: d.data().name,
    memberCount: d.data().memberCount || 0,
  }));

  return {
    rows: rows.map((r, i) => ({ ...r, index: i + 1 })),
    closedRows: closedMembers.map((r, i) => ({ ...r, index: i + 1 })),
    closingGroups,
    programName,
    total: rows.length,
    totalClosed: closedMembers.length,
  };
}

// ── GET /api/all-payment-status ──────────────────────────────────────────────
export async function GET(request) {
  const startTime = Date.now();
  
  try {
    // 1. Auth
    const { uid, error: authError } = await verifyToken(request);
    if (authError) {
      return NextResponse.json({ error: authError }, { status: 401 });
    }

    // 2. Get query parameters
    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get('agentId');
    const programId = searchParams.get('programId');
    const groupId = searchParams.get('groupId');

    if (!agentId || !programId) {
      return NextResponse.json(
        { error: 'agentId and programId are required' },
        { status: 400 }
      );
    }

    // 3. Fetch data with timeout protection
    const fetchPromise = fetchPaymentData(uid, agentId, programId, groupId);
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Database query timeout')), 25000);
    });

    const data = await Promise.race([fetchPromise, timeoutPromise]);
    
    const duration = Date.now() - startTime;
    console.log(`[GET /api/all-payment-status] Completed in ${duration}ms`);

    return NextResponse.json(data);

  } catch (err) {
    console.error('[GET /api/all-payment-status]', err);
    const status = err.message === 'Database query timeout' ? 504 : 500;
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status }
    );
  }
}

// ── POST /api/all-payment-status ─────────────────────────────────────────────
export async function POST(request) {
  const startTime = Date.now();
  
  try {
    // 1. Auth
    const { uid, error: authError } = await verifyToken(request);
    if (authError) {
      return NextResponse.json({ error: authError }, { status: 401 });
    }

    // 2. Parse body
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 }
      );
    }

    const { agentId, programId, groupId } = body;

    if (!agentId || !programId) {
      return NextResponse.json(
        { error: 'agentId and programId are required' },
        { status: 400 }
      );
    }

    // 3. Fetch data with timeout protection
    const fetchPromise = fetchPaymentData(uid, agentId, programId, groupId);
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Database query timeout')), 25000);
    });

    const data = await Promise.race([fetchPromise, timeoutPromise]);
    
    const duration = Date.now() - startTime;
    console.log(`[POST /api/all-payment-status] Completed in ${duration}ms`);

    return NextResponse.json(data);

  } catch (err) {
    console.error('[POST /api/all-payment-status]', err);
    const status = err.message === 'Database query timeout' ? 504 : 500;
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status }
    );
  }
}