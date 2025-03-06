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
 * @param {string} date - Date in YYYY-MM-DD format.
 * @returns {Promise<number>} Total hours logged.
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
 * @param {number} hours - Number of hours to log.
 * @param {string} comment - A comment for the time entry.
 * @param {number} attempt - Retry attempt number.
 */
async function logTime(hours, comment, attempt = 1) {
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
        console.error(`Error logging time (attempt ${attempt}) for ${date}:`, error.message);
        if (attempt < 3) {
            const delay = attempt === 1 ? 2 * 60 * 1000 : 5 * 60 * 1000; // Retry after 2 min, then 5 min
            console.log(`Retrying in ${delay / 60000} minutes...`);
            setTimeout(() => logTime(hours, comment, attempt + 1), delay);
        } else {
            console.error(`Failed to log time after ${attempt} attempts.`);
        }
    }
}

/**
 * Scheduled function that logs time at 18:00.
 */
async function scheduleTimeLog() {
    const today = moment().tz(selectedTimezone).format('YYYY-MM-DD');
    const totalHoursLogged = await checkLoggedTime(today);
    const remainingHours = 8 - totalHoursLogged;

    if (remainingHours > 0) {
        console.log(`Logging ${remainingHours} hour(s) to reach 8 hours.`);
        await logTime(remainingHours, 'Automated logging');
    } else {
        console.log('8 hours already logged today. No action needed.');
    }
}

/**
 * Recheck function that verifies logs the next morning at 06:05 AM.
 * If the previous day's log is incomplete, it corrects it.
 */
async function recheckAndLogIfNeeded() {
    const yesterday = moment().tz(selectedTimezone).subtract(1, 'day').format('YYYY-MM-DD');
    const loggedHours = await checkLoggedTime(yesterday);

    if (loggedHours < 8) {
        console.log(`Fixing missing hours from ${yesterday}. Logging additional ${8 - loggedHours} hours.`);
        await logTime(8 - loggedHours, 'Missed logging correction');
    } else {
        console.log(`No correction needed for ${yesterday}.`);
    }
}

// Export Netlify functions
exports.scheduleTimeLog = async (event, context) => {
    try {
        await scheduleTimeLog();
        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Time logging executed successfully.' })
        };
    } catch (error) {
        console.error('Scheduled function error:', error.message);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        };
    }
};

exports.recheckAndLogIfNeeded = async (event, context) => {
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
