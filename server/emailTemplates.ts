import Mailgen from 'mailgen';

const mailGenerator = new Mailgen({
    theme: 'default',
    product: {
        name: 'FMPLUS R3',
        link: process.env.APP_URL || 'https://fmplus.me',
        logo: 'https://ais-dev-6uphkdkincly2xvrgjctrg-73582246081.europe-west3.run.app/favicon.ico'
    }
});

export function generateOrderEmail(event: string, order: any, details?: string) {
    let title = '';
    let intro = '';
    let actionLabel = 'View Order';
    let color = '#3b82f6';

    switch (event) {
        case 'ORDER_CREATED':
            title = 'New Service Order Created';
            intro = `A new service request (${order.id}) has been entered into the system.`;
            break;
        case 'ORDER_ASSIGNED':
            title = 'Service Order Assigned to You';
            intro = `You have been assigned to service order ${order.id}. Please review the details below.`;
            color = '#8b5cf6';
            break;
        case 'STATUS_UPDATED':
            title = `Order Status: ${order.status}`;
            intro = `The status of order ${order.id} has been updated to ${order.status}.`;
            if (order.status === 'Completed') {
                title = 'Order Successfully Completed';
                color = '#10b981';
            } else if (order.status === 'Not Completed') {
                title = 'Order Not Completed - Action Required';
                color = '#ef4444';
            }
            break;
        default:
            title = 'System Notification';
            intro = 'An update has been made to a service order.';
    }

    const email = {
        body: {
            title: title,
            intro: intro,
            table: {
                data: [
                    {
                        key: 'Order ID',
                        value: order.id
                    },
                    {
                        key: 'Customer',
                        value: order.customerName
                    },
                    {
                        key: 'Category',
                        value: order.serviceCategory
                    },
                    {
                        key: 'Status',
                        value: order.status
                    },
                    {
                        key: 'Final Price',
                        value: `EGP ${order.finalPrice.toFixed(2)}`
                    }
                ]
            },
            action: {
                instructions: 'To view the full details and manage this order, click the button below:',
                button: {
                    color: color,
                    text: actionLabel,
                    link: `${process.env.APP_URL || ''}/operations`
                }
            },
            outro: details ? `Note: ${details}` : 'Need help? Contact the support team.'
        }
    };

    return {
        html: mailGenerator.generate(email),
        text: mailGenerator.generatePlaintext(email)
    };
}
