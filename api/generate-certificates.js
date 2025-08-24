import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import nodemailer from 'nodemailer';
import { createCanvas, loadImage, registerFont } from 'canvas';
import QRCode from 'qrcode';

// Initialize Firebase Admin SDK
// Note: You'll need to set up service account credentials in your Vercel environment variables
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);

if (!initializeApp.length) {
    initializeApp({
        credential: cert(serviceAccount),
        storageBucket: `${process.env.VITE_FIREBASE_PROJECT_ID}.appspot.com`
    });
}


const db = getFirestore();
const bucket = getStorage().bucket();

// --- Nodemailer Transport ---
const transporter = nodemailer.createTransport({
    host: 'smtp-relay.brevo.com',
    port: 587,
    auth: {
        user: process.env.BREVO_USER,
        pass: process.env.BREVO_PASS,
    },
});

// --- Main Handler ---
export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { eventId, attendees } = req.body;

    if (!eventId || !attendees || !Array.isArray(attendees)) {
        return res.status(400).json({ error: 'Missing required eventId or attendees data.' });
    }

    try {
        const eventDoc = await db.collection('events').doc(eventId).get();
        if (!eventDoc.exists) {
            return res.status(404).json({ error: 'Event not found.' });
        }
        const event = eventDoc.data();
        const templateImageUrl = event.certificateTemplateUrl;

        if (!templateImageUrl) {
            return res.status(400).json({ error: 'No certificate template found for this event.' });
        }

        // Load the certificate template image
        const templateImage = await loadImage(templateImageUrl);
        const canvas = createCanvas(templateImage.width, templateImage.height);
        const ctx = canvas.getContext('2d');

        // Register a font (optional, but recommended for better text rendering)
        // You would need to have this font file in your project
        // registerFont('fonts/Roboto-Bold.ttf', { family: 'Roboto' });

        for (const attendee of attendees) {
            // 1. Generate a unique ID for the certificate
            const certificateRef = db.collection('certificates').doc();
            const certificateId = certificateRef.id;

            // 2. Create the verification URL and QR Code
            const verificationUrl = `https://live-campus.vercel.app/verify-certificate?id=${certificateId}`;
            const qrCodeImage = await QRCode.toDataURL(verificationUrl);

            // 3. Composite the new certificate image
            ctx.drawImage(templateImage, 0, 0);
            
            // --- Customize these values based on your template ---
            ctx.fillStyle = 'black';
            ctx.font = '80px "Roboto", sans-serif'; // Example font
            ctx.textAlign = 'center';
            ctx.fillText(attendee.name, canvas.width / 2, canvas.height / 2); // Center the name
            
            const qrImage = await loadImage(qrCodeImage);
            ctx.drawImage(qrImage, (canvas.width / 2) - 100, canvas.height - 300, 200, 200); // Position QR code
            // ----------------------------------------------------

            // 4. Upload the generated certificate to Firebase Storage
            const buffer = canvas.toBuffer('image/png');
            const fileName = `certificates/${eventId}/${attendee.userId}.png`;
            const file = bucket.file(fileName);
            await file.save(buffer, {
                metadata: { contentType: 'image/png' },
            });
            const downloadUrl = await file.getSignedUrl({ action: 'read', expires: '03-09-2491' });

            // 5. Save certificate metadata to Firestore
            await certificateRef.set({
                id: certificateId,
                userId: attendee.userId,
                userName: attendee.name,
                eventId: eventId,
                eventName: event.title,
                issuedAt: new Date().toISOString(),
                certificateUrl: downloadUrl[0],
            });

            // 6. Send the certificate email
            await transporter.sendMail({
                from: '"LiveCampus" <livecampuss@gmail.com>',
                to: attendee.email,
                subject: `Your Certificate for ${event.title}`,
                html: `
                    <p>Hello ${attendee.name},</p>
                    <p>Congratulations on attending "${event.title}"! Please find your certificate attached.</p>
                    <p>You can also download it from your profile on LiveCampus.</p>
                    <a href="${downloadUrl[0]}">Download Your Certificate</a>
                `,
            });
        }

        res.status(200).json({ success: true, message: 'Certificates generated and sent.' });

    } catch (error) {
        console.error('Error generating certificates:', error);
        res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
}
