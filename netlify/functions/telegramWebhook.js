// netlify/functions/telegramWebhook.js
const axios = require('axios');
const moment = require('moment-timezone');
const { scheduleTimeLog, checkLoggedTime } = require('./redmineHelpers');

const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN;

async function sendTelegramMessage(chatId, text) {
    const url = `https://api.telegram.org/bot${telegramBotToken}/sendMessage`;
    try {
        await axios.post(url, { chat_id: chatId, text });
        console.log('Telegram notification sent:', text);
    } catch (error) {
        console.error('Error sending Telegram message:', error.message);
    }
}

exports.handler = async (event, context) => {
    try {
        let body = {};
        if (event.body) {
            body = JSON.parse(event.body);
        } else {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'No request body provided.' })
            };
        }

        const message = body.message;
        if (message) {
            const chatId = message.chat.id;
            const text = message.text || '';

            // Handle /checktime command:
            if (text.startsWith('/checktime')) {
                const today = moment()
                    .tz(process.env.REDMINE_TIMEZONE || 'Europe/Kyiv')
                    .format('YYYY-MM-DD');
                const totalHours = await checkLoggedTime(today);
                const reply = `Logged hours for ${today}: ${totalHours} hour(s).`;
                await sendTelegramMessage(chatId, reply);
            }
            // Handle /schedule command:
            else if (text.startsWith('/schedule')) {
                const resultMessage = await scheduleTimeLog();
                await sendTelegramMessage(chatId, `Schedule invoked: ${resultMessage}`);
            } else {
                await sendTelegramMessage(chatId, 'Unknown command. Please use /checktime or /schedule.');
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
