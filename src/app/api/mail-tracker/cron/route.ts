import { NextResponse } from 'next/server';
import { getGraphClient } from '@/lib/graph';

// Security check to ensure it's called by Vercel Cron or an authorized admin
// Vercel Cron sends an Authorization header with a Bearer token matching CRON_SECRET
export async function GET(request: Request) {
    try {
        const authHeader = request.headers.get('authorization');
        const cronSecret = process.env.CRON_SECRET;
        
        // Simple protection: requires cron secret if configured
        if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
             return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const client = getGraphClient();
        console.log('[CRON] Starting daily mail tracker report...');

        // 1. Fetch tracked users
        const EXTENSION_NAME = 'com.eqncs.mailtracker';
        let trackedUsers: any[] = [];
        let nextLink: string | null = '/users';
        
        while (nextLink) {
            const response = await client.api(nextLink)
                .select('id,displayName,mail,userPrincipalName')
                .expand(`extensions($filter=id eq '${EXTENSION_NAME}')`)
                .get();
                
            const currentlyTracked = (response.value || []).filter((u: any) => 
                u.extensions && u.extensions.length > 0 && u.extensions[0].isTracked === true
            );
            
            trackedUsers = [...trackedUsers, ...currentlyTracked];
            nextLink = response['@odata.nextLink'] ? response['@odata.nextLink'] : null;
        }

        console.log(`[CRON] Found ${trackedUsers.length} total users with tracking extension.`);

        // 2. Filter unexpired users
        const now = new Date();
        const validUsers = trackedUsers.filter(u => {
            const exp = u.extensions[0].expiresAt;
            if (!exp) return true; // Unlimited
            return new Date(exp) > now;
        });

        console.log(`[CRON] ${validUsers.length} users are currently actively tracked (unexpired).`);

        if (validUsers.length === 0) {
             return NextResponse.json({ message: 'No active tracked users. Skipping report.' });
        }

        // 3. Fetch sent items for the last 24 hours
        // We calculate exactly 24 hours ago
        const yesterday = new Date(now.getTime() - (24 * 60 * 60 * 1000));
        const filterDateString = yesterday.toISOString();
        
        let reportHtml = `
            <h2>EQN Pro Daily Mail Tracker Report</h2>
            <p>Report generated at ${now.toLocaleString()}</p>
            <p>Showing emails sent from tracked users in the last 24 hours.</p>
            <hr />
        `;

        let totalEmailsTracked = 0;

        for (const user of validUsers) {
            const userEmail = user.mail || user.userPrincipalName;
            reportHtml += `<h3>${user.displayName} (${userEmail})</h3>`;
            
            try {
                // Fetch emails sent AFTER exactly 24 hours ago
                const messagesResponse = await client.api(`/users/${user.id}/mailFolders/SentItems/messages`)
                    .filter(`isDraft eq false and sentDateTime ge ${filterDateString}`)
                    .select('subject,toRecipients,ccRecipients,sentDateTime,hasAttachments')
                    .top(100)
                    .orderby('sentDateTime desc')
                    .get();
                
                const msgs = messagesResponse.value || [];
                
                if (msgs.length === 0) {
                     reportHtml += `<p style="color: gray;">No emails sent in the last 24 hours.</p>`;
                } else {
                     totalEmailsTracked += msgs.length;
                     reportHtml += `
                        <table border="1" cellpadding="5" style="border-collapse: collapse; width: 100%; text-align: left;">
                            <thead style="background-color: #f3f4f6;">
                                <tr>
                                    <th>Time</th>
                                    <th>Subject</th>
                                    <th>To</th>
                                    <th>📎 Attachments</th>
                                </tr>
                            </thead>
                            <tbody>
                     `;
                     
                     for (const msg of msgs) {
                         const time = new Date(msg.sentDateTime).toLocaleTimeString();
                         const subject = msg.subject || '(No Subject)';
                         
                         const formatRecipients = (recipients: any[]) => {
                             if (!recipients || !Array.isArray(recipients) || recipients.length === 0) return '';
                             return recipients.map((r: any) => {
                                 if (r.emailAddress?.address) return r.emailAddress.address;
                                 if (r.emailAddress?.name) return r.emailAddress.name;
                                 if (typeof r.emailAddress === 'string') return r.emailAddress;
                                 return 'Unknown Recipient';
                             }).filter(Boolean).join(', ');
                         };
                         
                         let toString = formatRecipients(msg.toRecipients);
                         if (!toString) toString = '(No To Recipients)';
                         
                         const ccString = formatRecipients(msg.ccRecipients);
                         if (ccString) toString += `<br/><small style="color:gray;">CC: ${ccString}</small>`;
                         
                         const attachmentStr = msg.hasAttachments ? 'Yes' : 'No';
                         
                         reportHtml += `
                             <tr>
                                 <td>${time}</td>
                                 <td>${subject}</td>
                                 <td>${toString}</td>
                                 <td style="text-align:center;">${attachmentStr}</td>
                             </tr>
                         `;
                     }
                     reportHtml += `</tbody></table><br/>`;
                }
            } catch (userErr: any) {
                console.error(`[CRON] Error fetching mail for ${userEmail}:`, userErr.message);
                reportHtml += `<p style="color: red;">Error retrieving emails: Missing Mail.Read permissions or user mailbox inaccessible.</p>`;
            }
        }

        reportHtml += `<hr /><p><em>Total emails logged across tracked users: ${totalEmailsTracked}</em></p>`;

        // 4. Send the report via Graph API
        const sendFrom = process.env.MAIL_TRACKER_SEND_FROM;
        const deliverTo = process.env.MAIL_TRACKER_DELIVER_TO;

        if (!sendFrom || !deliverTo) {
             console.error('[CRON] Missing MAIL_TRACKER_SEND_FROM or MAIL_TRACKER_DELIVER_TO in environment.');
             return NextResponse.json({ error: 'Mail distribution configuration missing', html: reportHtml }, { status: 500 });
        }

        const mailMessage = {
            message: {
                subject: `EQN Pro - Daily Mail Tracker Report (${now.toLocaleDateString()})`,
                body: {
                    contentType: 'HTML',
                    content: reportHtml
                },
                toRecipients: [
                    { emailAddress: { address: deliverTo } }
                ]
            },
            saveToSentItems: 'false'
        };

        try {
            await client.api(`/users/${sendFrom}/sendMail`).post(mailMessage);
            console.log(`[CRON] Daily report dispatched from ${sendFrom} to ${deliverTo}.`);
        } catch (sendErr: any) {
            console.error('[CRON] Failed to dispatch email via Graph API. Check Mail.Send permission:', sendErr.message);
            throw sendErr;
        }

        return NextResponse.json({ success: true, emailsTracked: totalEmailsTracked });
    } catch (error: any) {
        console.error('[CRON] Global Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
