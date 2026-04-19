import { getFirestore } from 'firebase-admin/firestore';
import { sendEmail } from './emailService';
import { generateOrderEmail } from './emailTemplates';

export async function setupFirestoreTriggers() {
    try {
        // IMPORTANT: Access the specific databaseId set by AI Studio
        const db = getFirestore('ai-studio-df7e2e20-8e58-4ad0-9778-e37fefdb20d2');
        console.log('[TRIGGERS] Setting up Firestore listeners...');

        // Trigger on New Order
        db.collection('orders').onSnapshot((snapshot) => {
            snapshot.docChanges().forEach(async (change) => {
                try {
                    const order = change.doc.data();
                    
                    if (change.type === 'added') {
                        // Check if it's actually new (within last minute to avoid legacy triggers on boot)
                        if (Date.now() - order.createdAt < 60000) {
                            console.log(`[TRIGGERS] New order detected: ${order.id}`);
                            await handleEmailRule('ORDER_CREATED', order);
                        }
                    }
                    
                    if (change.type === 'modified') {
                        console.log(`[TRIGGERS] Order updated: ${order.id}`);
                        await handleEmailRule('STATUS_UPDATED', order);
                    }
                } catch (err) {
                    console.error('[TRIGGERS] Error processing change:', err);
                }
            });
        }, (err) => {
            console.error('[TRIGGERS] onSnapshot error:', err);
        });
    } catch (err) {
        console.error('[TRIGGERS] Setup error:', err);
    }
}

async function handleEmailRule(eventType: string, order: any) {
    const db = getFirestore('ai-studio-df7e2e20-8e58-4ad0-9778-e37fefdb20d2');
    
    // 1. Fetch Mapping for this event
    const mappingSnap = await db.collection('emailMappings')
        .where('eventType', '==', eventType)
        .get();

    const recipients = new Set<string>();

    for (const doc of mappingSnap.docs) {
        const mapping = doc.data();
        
        // Add specific emails
        if (mapping.emails && Array.isArray(mapping.emails)) {
            mapping.emails.forEach((e: string) => recipients.add(e));
        }

        // Resolve roles
        if (mapping.roles && Array.isArray(mapping.roles)) {
            for (const role of mapping.roles) {
                const userSnap = await db.collection('users').where('role', '==', role).get();
                userSnap.forEach(u => recipients.add(u.data().email));
            }
        }
    }

    // Special case: Notification to the assigned executor
    if (eventType === 'ORDER_CREATED' || (eventType === 'STATUS_UPDATED' && order.status === 'Pending')) {
        if (order.assignedExecutor && order.assignedExecutor.includes('@')) {
            recipients.add(order.assignedExecutor);
        }
    }

    if (recipients.size > 0) {
        const { html, text } = generateOrderEmail(eventType, order);
        await sendEmail({
            to: Array.from(recipients),
            subject: `[FMPLUS] ${(eventType || '').replace('_', ' ')}: ${order.id}`,
            html,
            text
        });
    }
}
