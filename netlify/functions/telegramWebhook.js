const axios = require('axios');
const moment = require('moment-timezone');

// Environment variables
const redmineUrl = process.env.REDMINE_URL;
const apiKey = process.env.REDMINE_API_KEY;
const selectedIssueId = process.env.REDMINE_ISSUE_ID;
const selectedTimezone = process.env.REDMINE_TIMEZONE || 'Europe/Kyiv';
const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN;

// Function to check logged time for a given date
async function checkLoggedTime(date) {
    try {
        const response = await axios.get(`${redmineUrl}/time_entries.json`, {
            params: { issue_id: selectedIssueId, spent_on: date },
            headers: { 'X-Redmine-API-Key': apiKey }
        });
        return response.data.time_entries.reduce((total, entry) => total + entry.hours, 0);
    } catch (error) {
        console.error(`Error checking logged time for ${date}:`, error.message);
        return 0;
    }
}

// Function to send a message via Telegram
async function sendTelegramMessage(chatId, text) {
    const url = `https://api.telegram.org/bot${telegramBotToken}/sendMessage`;
    try {
        await axios.post(url, {
            chat_id: chatId,
            text: text
        })
        console.log('Telegram notification sent:', text);
    } catch (error) {
        console.error('Error sending Telegram message:', error.message);
    }
}

// Main handler for the webhook
exports.handler = async (event, context) => {
    try {
        const body = JSON.parse(event.body);
        const message = body.message;

        if (message) {
            const chatId = message.chat.id;
            const text = message.text || '';

            if (text.startsWith('/checktime')) {
                // Calculate today's date using the selected timezone
                const today = moment().tz(selectedTimezone).format('YYYY-MM-DD');
                // Check the total logged hours for today
                const totalHours = await checkLoggedTime(today);
                const reply = `Logged hours for ${today}: ${totalHours} hour(s).`;
                await sendTelegramMessage(chatId, reply);
            } else {
                // Optional: handle other commands or default message
                await sendTelegramMessage(chatId, 'Unknown command. Please use /checktime to check logged time.');
            }
        }

        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Webhook received.' })
        };
    } catch (error) {
        console.error('Error handling Telegram webhook:', error.message);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        };
    }
};
