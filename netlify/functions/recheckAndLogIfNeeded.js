const axios = require('axios');
const moment = require('moment-timezone');

// Environment variables
const redmineUrl = process.env.REDMINE_URL;
const apiKey = process.env.REDMINE_API_KEY;
const selectedProjectId = process.env.REDMINE_PROJECT_ID;
const selectedIssueId = process.env.REDMINE_ISSUE_ID;
const selectedTimezone = process.env.REDMINE_TIMEZONE || 'Europe/Kyiv';

/**
 * Check the total logged time for a given date.
 */
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

/**
 * Log time for the selected issue.
 */
async function logTime(hours, comment) {
    const date = moment().tz(selectedTimezone).format('YYYY-MM-DD');
    const payload = {
        time_entry: {
            project_id: selectedProjectId,
            issue_id: selectedIssueId,
            spent_on: date,
            hours,
            comments: comment,
            activity_id: 9
        }
    };

    try {
        const response = await axios.post(`${redmineUrl}/time_entries.json`, payload, {
            headers: { 'X-Redmine-API-Key': apiKey, 'Content-Type': 'application/json' }
        });

        if (response.status === 201) {
            console.log(`Time logged successfully for ${date}: ${hours} hours.`);
            return response.data;
        }
    } catch (error) {
        console.error(`Error logging time for ${date}:`, error.message);
    }
}

/**
 * Recheck function that verifies logs at 6:05 PM.
 * If today's log is incomplete, it corrects it.
 */
async function recheckAndLogIfNeeded() {
    const today = moment().tz(selectedTimezone).format('YYYY-MM-DD');
    const loggedHours = await checkLoggedTime(today);

    if (loggedHours < 8) {
        console.log(`Fixing missing hours for ${today}. Logging additional ${8 - loggedHours} hours.`);
        await logTime(8 - loggedHours, 'Missed logging correction');
        await sendTelegramNotification(`Recheck: Logged additional ${8 - loggedHours} hour(s) for ${today}.`);
    } else {
        console.log(`No correction needed for ${today}.`);
        await sendTelegramNotification(`Recheck: No correction needed for ${today}. Total hours: ${loggedHours}.`);
    }
}

exports.handler = async () => {
    try {
        await recheckAndLogIfNeeded();
        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Recheck and logging correction executed successfully.' })
        };
    } catch (error) {
        console.error('Scheduled function error:', error.message);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        };
    }
};
