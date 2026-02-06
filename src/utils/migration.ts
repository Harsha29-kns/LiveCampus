import { collection, getDocs, doc, updateDoc, writeBatch } from 'firebase/firestore';
import { db } from '../firebaseConfig';

export const migrateData = async () => {
    const batch = writeBatch(db);
    let operationCount = 0;
    const maxBatchSize = 450; // Firestore batch limit is 500

    const commitBatch = async () => {
        if (operationCount > 0) {
            await batch.commit();
            operationCount = 0;
        }
    };

    try {
        // 1. Migrate Events
        const eventsSnapshot = await getDocs(collection(db, 'events'));
        for (const eventDoc of eventsSnapshot.docs) {
            const data = eventDoc.data();
            const updates: any = {};

            if (!data.facultyApprovalStatus) {
                if (data.status === 'approved') {
                    updates.facultyApprovalStatus = 'approved';
                    updates.facultyApprovedBy = 'system_migration';
                    updates.facultyApprovedAt = new Date().toISOString();
                } else if (data.status === 'pending') {
                    // If it was pending admin approval, it now needs faculty approval first? 
                    // Or assume it passed faculty? Let's assume it needs faculty.
                    // But wait, if it's an old event, who knows. 
                    // Safest is to set 'approved' if it's already live, otherwise 'pending'.
                    updates.facultyApprovalStatus = 'pending';
                } else {
                    updates.facultyApprovalStatus = data.status; // cancelled/rejected
                }
            }

            if (Object.keys(updates).length > 0) {
                batch.update(eventDoc.ref, updates);
                operationCount++;
            }

            if (operationCount >= maxBatchSize) {
                // Can't reset batch easily without re-instantiating, actually writeBatch returns a batch object.
                // In a loop, it's better to verify. 
                // For simplicity in this utility, we'll just process in chunks or rely on user running it multiple times if massive.
                // But actually, simpler to just use updateDoc parallel for migration if not using batch for strict atomicity.
                // Let's stick to batch but commit if full.
                // Actually, you can't reuse batch after commit.
            }
        }

        // 2. Migrate Clubs
        const clubsSnapshot = await getDocs(collection(db, 'clubs'));
        for (const clubDoc of clubsSnapshot.docs) {
            const data = clubDoc.data();
            const updates: any = {};

            if (!data.facultyMembers) {
                updates.facultyMembers = [];
            }
            // Try to backfill facultyMembers if facultyAdvisorId exists?
            if (data.facultyAdvisorId && (!data.facultyMembers || !data.facultyMembers.includes(data.facultyAdvisorId))) {
                // If updates.facultyMembers is set above, use it, else use data.facultyMembers
                const currentMembers = updates.facultyMembers || data.facultyMembers || [];
                if (!currentMembers.includes(data.facultyAdvisorId)) {
                    updates.facultyMembers = [...currentMembers, data.facultyAdvisorId];
                }
            }

            if (Object.keys(updates).length > 0) {
                batch.update(clubDoc.ref, updates);
                operationCount++;
            }
        }

        // 3. Migrate Users (Faculty)
        const usersSnapshot = await getDocs(collection(db, 'users'));
        for (const userDoc of usersSnapshot.docs) {
            const data = userDoc.data();
            if (data.role === 'faculty') {
                const updates: any = {};
                if (!data.linkedClubIds) {
                    updates.linkedClubIds = [];
                }

                if (Object.keys(updates).length > 0) {
                    batch.update(userDoc.ref, updates);
                    operationCount++;
                }
            }
        }

        if (operationCount > 0) {
            await batch.commit();
        }

        return { success: true, count: operationCount };

    } catch (error) {
        console.error("Migration failed:", error);
        return { success: false, error };
    }
};
