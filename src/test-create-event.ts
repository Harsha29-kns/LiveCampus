import { useEventStore } from './stores/eventStore';
import { useAuthStore } from './stores/authStore';

// Quick test for creating an event as admin
window.testCreateEvent = async () => {
    console.log('🧪 Starting test event creation...');

    const { user } = useAuthStore.getState();
    if (!user) {
        console.error('❌ User not logged in');
        return;
    }

    if (user.role !== 'admin') {
        console.error('❌ Only admin can use this test. Current role:', user.role);
        return;
    }

    const { createEvent } = useEventStore.getState();

    const testEvent = {
        title: `Test Event ${new Date().getTime()}`,
        description: 'This is a test event to check notifications',
        date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
        time: '10:00',
        location: 'Test Location',
        imageUrl: 'https://via.placeholder.com/400x300',
        category: 'workshop' as any,
        organizerId: user.id,
        organizerType: 'admin' as const,
        maxAttendees: 50,
        status: 'approved' as const,
        isPaid: false,
        price: 0,
        facultyApprovalRequired: false,
        facultyApprovalStatus: 'approved' as const
    };

    console.log('📝 Creating event with data:', testEvent);

    try {
        const result = await createEvent(testEvent);
        console.log('✅ Event created successfully:', result);
        console.log('🔔 Check console above for notification creation logs');
        console.log('📊 Check Firebase notifications collection');
        return result;
    } catch (error) {
        console.error('❌ Event creation failed:', error);
        return null;
    }
};

console.log('✅ Test script loaded!');
console.log('📝 Run: window.testCreateEvent()');
console.log('⚠️ Make sure you are logged in as ADMIN first!');
