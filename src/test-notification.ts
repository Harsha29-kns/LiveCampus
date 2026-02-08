import { useNotificationStore } from './stores/notificationStore';
import { useAuthStore } from './stores/authStore';

// Test notification creation
// Open browser console and run this function to test
window.testNotification = async () => {
    const { user } = useAuthStore.getState();
    if (!user) {
        console.error('User not logged in');
        return;
    }

    const { addNotification } = useNotificationStore.getState();
    const result = await addNotification({
        userId: user.id,
        title: 'Test Notification',
        message: 'This is a test notification created manually',
        type: 'info'
    });

    console.log('Notification creation result:', result);
    return result;
};

console.log('Test function loaded. Run window.testNotification() to create a test notification');
