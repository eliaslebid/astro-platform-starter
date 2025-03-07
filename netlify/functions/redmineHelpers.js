// netlify/functions/redmineHelpers.js
const axios = require('axios');
const moment = require('moment-timezone');

const redmineUrl = process.env.REDMINE_URL;
const apiKey = process.env.REDMINE_API_KEY;
const selectedProjectId = process.env.REDMINE_PROJECT_ID;
const selectedIssueId = process.env.REDMINE_ISSUE_ID;
const selectedTimezone = process.env.REDMINE_TIMEZONE || 'Europe/Kyiv';

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

async function scheduleTimeLog() {
    const today = moment().tz(selectedTimezone).format('YYYY-MM-DD');
    const totalHoursLogged = await checkLoggedTime(today);
    const remainingHours = 8 - totalHoursLogged;

    if (remainingHours > 0) {
        console.log(`Logging ${remainingHours} hour(s) to reach 8 hours.`);
        await logTime(remainingHours, 'Automated logging via Telegram command');
        return `Logged additional ${remainingHours} hour(s) for ${today}.`;
    } else {
        console.log('8 hours already logged today. No action needed.');
        return `No action needed. 8 hours already logged for ${today}.`;
    }
}

module.exports = { checkLoggedTime, logTime, scheduleTimeLog };
