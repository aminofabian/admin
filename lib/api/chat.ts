import { API_BASE_URL, TOKEN_KEY } from '@/lib/constants/api';
import { storage } from '@/lib/utils/storage';

const ADMIN_STORAGE_KEY = 'user';

function getAdminUserId(): number {
  try {
    const userDataStr = storage.get(ADMIN_STORAGE_KEY);
    if (userDataStr) {
      const userData = JSON.parse(userDataStr);
      const id = userData.id ?? userData.user_id;
      if (typeof id === 'number' && id > 0) return id;
      if (typeof id === 'string') {
        const parsed = parseInt(id, 10);
        if (parsed > 0) return parsed;
      }
    }
  } catch {
    // Ignore parse errors
  }
  return 0;
}

export async function sendChatMessageToPlayer(
  receiverUserId: number,
  message: string,
): Promise<boolean> {
  const adminId = getAdminUserId();
  if (adminId <= 0) {
    console.error('Cannot send chat message: admin user ID not available');
    return false;
  }

  const token = storage.get(TOKEN_KEY);
  if (!token) {
    console.error('Cannot send chat message: no auth token');
    return false;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/chat/send/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        sender_id: adminId,
        receiver_id: receiverUserId,
        message,
        is_player_sender: false,
        sent_time: new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      console.error('Failed to send chat message:', response.status, response.statusText);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Failed to send chat message:', error);
    return false;
  }
}
