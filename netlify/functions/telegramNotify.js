const axios = require('axios');

async function sendTelegramNotification(message) {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    if (!token || !chatId) {
        console.error('Telegram bot token or chat ID is not set.');
        return;
    }
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    try {
        await axios.post(url, {
            chat_id: chatId,
            text: message
        });
        console.log('Telegram notification sent:', message);
    } catch (error) {
        console.error('Failed to send Telegram notification:', error.message);
    }
}

module.exports = { sendTelegramNotification };
