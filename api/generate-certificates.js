import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import nodemailer from 'nodemailer';
import { createCanvas, loadImage, registerFont } from 'canvas';
import QRCode from 'qrcode';

// --- Initialize Firebase Admin SDK ---
// Check if the environment variable exists before parsing
if (!process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY is not set in environment variables.');
}

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);

// Use getApps() to safely initialize the app, preventing re-initialization
if (getApps().length === 0) {
    initializeApp({
        credential: cert(serviceAccount),
        storageBucket: `${process.env.VITE_FIREBASE_PROJECT_ID}.appspot.com`
    });
}

// You can now safely call Firebase services
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
        const layout = event.certificateLayout; // <-- Get the custom layout object

        if (!templateImageUrl) {
            return res.status(400).json({ error: 'No certificate template found for this event.' });
        }

        // Load the certificate template image
        const templateImage = await loadImage(templateImageUrl);
        const canvas = createCanvas(templateImage.width, templateImage.height);
        const ctx = canvas.getContext('2d');
        
        // --- DEFINE DEFAULT LAYOUT AS A FALLBACK ---
        const defaultLayout = {
            name: { x: canvas.width / 2, y: canvas.height / 2, fontSize: 80, color: 'black', align: 'center' },
            regNo: { x: canvas.width / 2, y: canvas.height / 2 + 100, fontSize: 40, color: 'black', align: 'center' },
            qrCode: { x: (canvas.width / 2) - 100, y: canvas.height - 300, size: 200 }
        };

        // --- MERGE DEFAULTS WITH USER-DEFINED LAYOUT ---
        const finalLayout = {
            name: { ...defaultLayout.name, ...layout?.name },
            regNo: { ...defaultLayout.regNo, ...layout?.regNo },
            qrCode: { ...defaultLayout.qrCode, ...layout?.qrCode }
        };


        for (const attendee of attendees) {
            // 1. Generate a unique ID for the certificate
            const certificateRef = db.collection('certificates').doc();
            const certificateId = certificateRef.id;

            // 2. Create the verification URL and QR Code
            const verificationUrl = `https://live-campus.vercel.app/verify-certificate?id=${certificateId}`;
            const qrCodeImage = await QRCode.toDataURL(verificationUrl);

            // 3. Composite the new certificate image
            ctx.drawImage(templateImage, 0, 0);
            
            // --- USE FINAL LAYOUT FOR DYNAMIC PLACEMENT ---
            // Draw Student Name
            ctx.fillStyle = finalLayout.name.color;
            ctx.font = `${finalLayout.name.fontSize}px "Roboto", sans-serif`;
            ctx.textAlign = finalLayout.name.align;
            ctx.fillText(attendee.name, finalLayout.name.x, finalLayout.name.y);
            
            // Draw Registration Number (if it exists)
            if (attendee.regNo) {
                ctx.fillStyle = finalLayout.regNo.color;
                ctx.font = `${finalLayout.regNo.fontSize}px "Roboto", sans-serif`;
                ctx.textAlign = finalLayout.regNo.align;
                ctx.fillText(attendee.regNo, finalLayout.regNo.x, finalLayout.regNo.y);
            }

            // Draw QR Code
            const qrImage = await loadImage(qrCodeImage);
            ctx.drawImage(qrImage, finalLayout.qrCode.x, finalLayout.qrCode.y, finalLayout.qrCode.size, finalLayout.qrCode.size);
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