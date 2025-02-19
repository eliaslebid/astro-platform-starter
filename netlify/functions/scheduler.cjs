require('dotenv').config();
const axios = require('axios');
const moment = require('moment-timezone');

// Environment variables
const redmineUrl = process.env.REDMINE_URL; // e.g., "https://your-redmine-instance.com"
const apiKey = process.env.REDMINE_API_KEY; // Your Redmine API key
const selectedProjectId = process.env.REDMINE_PROJECT_ID; // Project ID to log time into
const selectedIssueId = process.env.REDMINE_ISSUE_ID; // Issue ID to log time for
const selectedTimezone = process.env.REDMINE_TIMEZONE || 'Europe/Kyiv'; // Default timezone

/**
 * Check the total logged time for the selected issue on the current day.
 * @returns {Promise<number>} Total hours logged.
 */
async function checkLoggedTime() {
    const date = moment().tz(selectedTimezone).format('YYYY-MM-DD');

    try {
        const response = await axios.get(`${redmineUrl}/time_entries.json`, {
            params: {
                issue_id: selectedIssueId,
                spent_on: date
            },
            headers: {
                'X-Redmine-API-Key': apiKey
            }
        });

        const totalHoursLogged = response.data.time_entries.reduce((total, entry) => total + entry.hours, 0);

        console.log(`Total hours logged on ${date}:`, totalHoursLogged);
        return totalHoursLogged;
    } catch (error) {
        console.error('Error checking logged time:', error.message);
        return 0;
    }
}

/**
 * Log time for the selected issue.
 * @param {number} hours - Number of hours to log.
 * @param {string} comment - A comment for the time entry.
 * @returns {Promise<Object>} The response data from Redmine.
 */
async function logTime(hours, comment) {
    const date = moment().tz(selectedTimezone).format('YYYY-MM-DD');
    const payload = {
        time_entry: {
            project_id: selectedProjectId,
            issue_id: selectedIssueId,
            spent_on: date,
            hours: hours,
            comments: comment,
            activity_id: 9 // Adjust the activity ID if needed
        }
    };

    try {
        const response = await axios.post(`${redmineUrl}/time_entries.json`, payload, {
            headers: {
                'X-Redmine-API-Key': apiKey,
                'Content-Type': 'application/json'
            }
        });

        if (response.status === 201) {
            console.log('Time logged successfully:', response.data);
            return response.data;
        } else {
            console.error(`Failed to log time: ${response.status}`);
            return null;
        }
    } catch (error) {
        console.error('Error logging time:', error.message);
        throw error;
    }
}

/**
 * Scheduled function that checks if 8 hours are logged today.
 * If not, logs the remaining hours.
 */
async function scheduleTimeLog() {
    const totalHoursLogged = await checkLoggedTime();
    const remainingHours = 8 - totalHoursLogged;

    if (remainingHours > 0) {
        console.log(`Logging ${remainingHours} hour(s) to reach 8 hours.`);
        // Customize the comment as needed
        await logTime(remainingHours, 'Scheduled time log entry');
    } else {
        console.log('8 hours already logged today. No action needed.');
    }
}

// Export the handler for a serverless function (e.g., Netlify)
exports.handler = async (event, context) => {
    try {
        await scheduleTimeLog();
        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Scheduled time log executed successfully.'
            })
        };
    } catch (error) {
        console.error('Scheduled function error:', error.message);
        return {
            statusCode: 500,
            body: JSON.stringify({
                error: error.message
            })
        };
    }
};
