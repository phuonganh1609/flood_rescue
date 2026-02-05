import { eventBus } from '../../utils/events.js';
import { notificationService } from './notification.service.js';
import { authService } from '../auth/auth.service.js';

/**
 * Listen for REQUEST_SUBMITTED event and create notifications for all coordinators
 */
eventBus.on('REQUEST_SUBMITTED', async (payload) => {
  try {
    const coordinators = await authService.getCurrentUsersByRole('Rescue Coordinator');

    for (const coordinator of coordinators) {
      await notificationService.create({
        userId: coordinator._id || coordinator.id,
        role: 'COORDINATOR',
        requestId: payload.requestId,
        type: 'SUBMITTED',
        message: '🚨 Có yêu cầu cứu hộ mới',
        isRead: false,
      });
    }
  } catch (error) {
    console.error('Error in REQUEST_SUBMITTED event listener:', error);
  }
});