const fetch = require('node-fetch');

const apiToken = '7c16f3ae8735cb869c692acf2f7abba978c1d79';

exports.handler = async () => {
    const apiUrl = 'https://redmine.integrity.com.ua/time_entries.json';
    const issueId = 32760;
    const hours = 8;

    const payload = {
        time_entry: {
            issue_id: issueId,
            hours: hours,
            comments: 'Automated daily log',
            activity_id: 9 // Replace with the correct activity ID from your Redmine instance
        }
    };

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Redmine-API-Key': apiToken
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`Failed to log time: ${response.statusText}`);
        }

        return {
            statusCode: 200,
            body: 'Time logged successfully!'
        };
    } catch (error) {
        return {
            statusCode: 500,
            body: `Error: ${error.message}`
        };
    }
};
