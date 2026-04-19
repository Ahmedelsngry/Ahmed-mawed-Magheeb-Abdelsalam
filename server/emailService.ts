import sgMail from '@sendgrid/mail';

if (process.env.SENDGRID_API_KEY) {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

export async function sendEmail({ to, subject, html, text }: { to: string | string[], subject: string, html: string, text?: string }) {
    if (!process.env.SENDGRID_API_KEY) {
        console.warn('[EMAIL SERVICE] SENDGRID_API_KEY missing. Printing email to console instead.');
        console.log(`[EMAIL MOCK] TO: ${to}`);
        console.log(`[EMAIL MOCK] SUBJECT: ${subject}`);
        return { success: true, mock: true };
    }

    const msg = {
        to: to,
        from: process.env.SENDER_EMAIL || 'no-reply@fmplus.me',
        subject: subject,
        text: text || '',
        html: html,
    };

    try {
        await sgMail.send(msg);
        console.log(`[EMAIL SERVICE] Email sent successfully to ${to}`);
        return { success: true };
    } catch (error: any) {
        console.error('[EMAIL SERVICE] Error sending email:', error);
        if (error.response) {
            console.error(error.response.body);
        }
        throw error;
    }
}
