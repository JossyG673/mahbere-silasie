import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { checkConnection, checkTablesExist, initializeDatabase } from "@/db/init";
import { users, members, contributions, events, announcements, serviceHistory } from "@/db/schema";
import { hashPassword } from "@/lib/auth";
import { count } from "drizzle-orm";

// GET — check database status
export async function GET() {
  // 1. Can we connect?
  const conn = await checkConnection();
  if (!conn.connected) {
    return NextResponse.json(
      {
        connected: false,
        tablesExist: false,
        seeded: false,
        message: "Cannot connect to database. Check your DATABASE_URL.",
        error: conn.error,
      },
      { status: 503 }
    );
  }

  // 2. Do tables exist?
  const tablesOk = await checkTablesExist();
  if (!tablesOk) {
    return NextResponse.json({
      connected: true,
      tablesExist: false,
      seeded: false,
      message: 'Connected but tables do not exist yet. Click "One-Click Full Setup".',
    });
  }

  // 3. Is there data?
  try {
    const [userCount] = await db.select({ total: count() }).from(users);
    return NextResponse.json({
      connected: true,
      tablesExist: true,
      seeded: userCount.total > 0,
      userCount: userCount.total,
      message:
        userCount.total > 0
          ? `Database ready — ${userCount.total} users`
          : "Tables exist but empty. Click setup to seed demo data.",
    });
  } catch (err) {
    return NextResponse.json({
      connected: true,
      tablesExist: true,
      seeded: false,
      message: "Could not query users table",
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

// POST — create tables + seed data
export async function POST(req: NextRequest) {
  const url = new URL(req.url);
  const reset = url.searchParams.get("reset") === "true";

  // ── Step 1: ensure connection ──
  const conn = await checkConnection();
  if (!conn.connected) {
    return NextResponse.json(
      { success: false, error: "Cannot connect to database", details: conn.error },
      { status: 503 }
    );
  }

  // ── Step 2: create tables ──
  const init = await initializeDatabase();
  if (!init.success) {
    return NextResponse.json(
      { success: false, error: "Failed to create tables", details: init.message },
      { status: 500 }
    );
  }

  // ── Step 3: check existing data ──
  let userTotal = 0;
  try {
    const [row] = await db.select({ total: count() }).from(users);
    userTotal = row.total;
  } catch {
    userTotal = 0;
  }

  if (userTotal > 0 && !reset) {
    return NextResponse.json({
      success: true,
      message: "Already seeded",
      hint: "Add ?reset=true to wipe and re-seed",
    });
  }

  // ── Step 4: clear if resetting ──
  if (reset && userTotal > 0) {
    try {
      await db.delete(serviceHistory);
      await db.delete(contributions);
      await db.delete(members);
      await db.delete(announcements);
      await db.delete(events);
      await db.delete(users);
    } catch (err) {
      return NextResponse.json(
        { success: false, error: "Failed to clear data", details: String(err) },
        { status: 500 }
      );
    }
  }

  // ── Step 5: seed ──
  try {
    const adminHash = await hashPassword("admin123");
    const [adminUser] = await db
      .insert(users)
      .values({ email: "admin@mahiberesilassie.org", passwordHash: adminHash, role: "admin" })
      .returning();

    const memberHash = await hashPassword("member123");
    const [memberUser] = await db
      .insert(users)
      .values({ email: "member@example.com", passwordHash: memberHash, role: "member" })
      .returning();

    const inserted = await db
      .insert(members)
      .values([
        {
          memberId: "MS-20240101-A1B2", userId: memberUser.id,
          legalFirstName: "Abebe", legalLastName: "Kebede", legalMiddleName: "Tadesse",
          baptismalName: "Gebremedhin", amharicName: "አበበ ከበደ",
          dateOfBirth: "1985-03-15", gender: "Male",
          email: "member@example.com", phone: "+251-911-234567",
          city: "Sebeta", subcity: "Wata", region: "Oromia",
          parish: "የሰበታ ዋታ ቅድስት ሥላሴ ቤ/ክ", confessionFather: "Abba Gebriel",
          status: "active",
          emergencyContactName: "Tigist Kebede", emergencyContactPhone: "+251-922-345678", emergencyContactRelation: "Spouse",
        },
        {
          memberId: "MS-20240115-C3D4",
          legalFirstName: "Tigist", legalLastName: "Mengistu",
          baptismalName: "Mariam", amharicName: "ትግስት መንግስቱ",
          dateOfBirth: "1990-07-22", gender: "Female",
          email: "tigist@example.com", phone: "+251-912-345678",
          city: "Sebeta", subcity: "Wata", region: "Oromia",
          parish: "የሰበታ ዋታ ቅድስት ሥላሴ ቤ/ክ",
          status: "active",
          emergencyContactName: "Dawit Mengistu", emergencyContactPhone: "+251-933-456789", emergencyContactRelation: "Brother",
        },
        {
          memberId: "MS-20240201-E5F6",
          legalFirstName: "Dawit", legalLastName: "Haile",
          baptismalName: "Tekle", amharicName: "ዳዊት ኃይሌ",
          dateOfBirth: "1978-11-08", gender: "Male",
          email: "dawit@example.com", phone: "+251-913-456789",
          city: "Sebeta", region: "Oromia",
          parish: "የሰበታ ዋታ ቅድስት ሥላሴ ቤ/ክ",
          status: "active",
          emergencyContactName: "Sara Haile", emergencyContactPhone: "+251-944-567890", emergencyContactRelation: "Wife",
        },
        {
          memberId: "MS-20240210-G7H8",
          legalFirstName: "Hana", legalLastName: "Solomon",
          baptismalName: "Eleni", amharicName: "ሃና ሰለሞን",
          dateOfBirth: "1995-01-20", gender: "Female",
          email: "hana@example.com", phone: "+251-914-567890",
          city: "Sebeta", region: "Oromia",
          parish: "የሰበታ ዋታ ቅድስት ሥላሴ ቤ/ክ",
          status: "pending",
        },
      ])
      .returning();

    const now = new Date();

    await db.insert(contributions).values([
      { memberId: inserted[0].id, amount: "500.00", type: "tsedeq", paymentStatus: "paid", receiptNumber: "RCP-001", paymentDate: new Date("2024-01-15") },
      { memberId: inserted[0].id, amount: "1000.00", type: "donation", paymentStatus: "paid", receiptNumber: "RCP-002", paymentDate: new Date("2024-02-15") },
      { memberId: inserted[1].id, amount: "500.00", type: "tsedeq", paymentStatus: "paid", receiptNumber: "RCP-003", paymentDate: new Date("2024-01-20") },
    ]);

    await db.insert(events).values([
      {
        titleEn: "Sunday Liturgy Service", titleAm: "የእሁድ ቅዳሴ",
        descriptionEn: "Weekly Liturgy at Sebeta Wata Kidist Silassie Church.",
        descriptionAm: "በሰበታ ዋታ ቅድስት ሥላሴ ቤ/ክ ሳምንታዊ ቅዳሴ።",
        eventDate: new Date(now.getTime() + 2 * 86400000),
        location: "ሰበታ ዋታ ቅድስት ሥላሴ ቤ/ክ", eventType: "liturgy", isLiturgical: true,
      },
      {
        titleEn: "Community Fellowship", titleAm: "የማህበረሰብ ኅብረት",
        descriptionEn: "Monthly community gathering.", descriptionAm: "ወርሃዊ ስብሰባ።",
        eventDate: new Date(now.getTime() + 7 * 86400000),
        location: "ሰበታ ዋታ", eventType: "community", isLiturgical: false,
      },
    ]);

    await db.insert(announcements).values([
      {
        titleEn: "Church Building Fund", titleAm: "የቤተ ክርስቲያን ግንባታ መዋጮ",
        contentEn: "Support Sebeta Wata Kidist Silassie Church construction!",
        contentAm: "የሰበታ ዋታ ቅድስት ሥላሴ ቤ/ክ ግንባታ ይደግፉ!",
        priority: 2, isActive: true,
      },
    ]);

    await db.insert(serviceHistory).values([
      {
        memberId: inserted[0].id, serviceName: "Baptism", serviceNameAm: "ጥምቀት",
        serviceDate: new Date("2023-01-19"), officiant: "Abba Gebriel",
      },
    ]);

    return NextResponse.json({
      success: true,
      message: "Database initialized and seeded successfully!",
      adminCredentials: { email: "admin@mahiberesilassie.org", password: "admin123" },
      memberCredentials: { email: "member@example.com", password: "member123" },
    });
  } catch (err) {
    console.error("Seed error:", err);
    return NextResponse.json(
      { success: false, error: "Seeding failed", details: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
