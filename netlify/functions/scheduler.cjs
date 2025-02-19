const fetch = require('node-fetch');

const REDMINE_API_KEY = process.env.REDMINE_API_KEY;
const REDMINE_URL = process.env.REDMINE_URL; // e.g., https://your-redmine-instance.com

async function logTime(timeData) {
    try {
        const response = await fetch(`${REDMINE_URL}/time_entries.json`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Redmine-API-Key': REDMINE_API_KEY
            },
            body: JSON.stringify({ time_entry: timeData })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to log time: ${response.status} - ${errorText}`);
        }

        return await response.json();
    } catch (error) {
        console.error(error);
        throw error;
    }
}

// Export the handler that Netlify expects
module.exports.handler = async (event, context) => {
    console.log('Received event:', event);

    // Extract timeData from the request body (assumes JSON payload)
    let timeData;
    try {
        timeData = JSON.parse(event.body);
    } catch (err) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Invalid JSON in request body' })
        };
    }

    try {
        const result = await logTime(timeData);
        return {
            statusCode: 200,
            body: JSON.stringify(result)
        };
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        };
    }
};
