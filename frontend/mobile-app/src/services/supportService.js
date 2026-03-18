import { authService } from './authService';
import { authService } from './authService';

class SupportService {
    /**
     * Submit a support request
     * @param {string} subject - The subject of the request
     * @param {string} message - The message body
     * @param {string} category - The category of the request
     * @returns {Promise<Object>} - The response data
     */
    async submitSupportRequest(subject, message, category) {
        try {
            const response = await authService.authenticatedRequest('/support', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    subject,
                    message,
                    category,
                }),
            });

            return response;
        } catch (error) {
            console.error('Support request failed:', error);
            throw error;
        }
    }
}

export const supportService = new SupportService();
