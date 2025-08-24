import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import nodemailer from 'nodemailer';
import { createCanvas, loadImage } from 'canvas';
import QRCode from 'qrcode';
import { v2 as cloudinary } from 'cloudinary';

// --- Configure Cloudinary ---
if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    throw new Error('Cloudinary environment variables are not set.');
}
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
});

// --- Initialize Firebase Admin SDK for Firestore ---
if (!process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY is not set in environment variables.');
}
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);

if (getApps().length === 0) {
    initializeApp({
        credential: cert(serviceAccount),
    });
}

const db = getFirestore();

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

    const { eventId } = req.body;

    if (!eventId) {
        return res.status(400).json({ error: 'Missing required eventId.' });
    }

    try {
        const eventDoc = await db.collection('events').doc(eventId).get();
        if (!eventDoc.exists) {
            return res.status(404).json({ error: 'Event not found.' });
        }
        const event = eventDoc.data();
        const templateImageUrl = event.certificateTemplateUrl;
        const layout = event.certificateLayout;

        if (!templateImageUrl) {
            return res.status(400).json({ error: 'No certificate template found for this event.' });
        }

        const attendeesSnapshot = await db.collection('eventRegistrations')
            .where('eventId', '==', eventId)
            .where('status', '==', 'attended')
            .get();

        if (attendeesSnapshot.empty) {
            return res.status(400).json({ error: 'No attended users found for this event.' });
        }

        const attendees = attendeesSnapshot.docs.map(doc => doc.data());

        const templateImage = await loadImage(templateImageUrl);
        const canvas = createCanvas(templateImage.width, templateImage.height);
        const ctx = canvas.getContext('2d');

        const defaultLayout = {
            name: { x: canvas.width / 2, y: canvas.height / 2, fontSize: 80, color: 'black', align: 'center' },
            regNo: { x: canvas.width / 2, y: canvas.height / 2 + 100, fontSize: 40, color: 'black', align: 'center' },
            qrCode: { x: (canvas.width / 2) - 100, y: canvas.height - 300, size: 200 }
        };

        const finalLayout = {
            name: { ...defaultLayout.name, ...layout?.name },
            regNo: { ...defaultLayout.regNo, ...layout?.regNo },
            qrCode: { ...defaultLayout.qrCode, ...layout?.qrCode }
        };

        for (const attendee of attendees) {
            const userDoc = await db.collection('users').doc(attendee.userId).get();
            if (!userDoc.exists) {
                console.warn(`Skipping certificate for user ID that does not exist: ${attendee.userId}`);
                continue;
            }
            const user = userDoc.data();

            if (!user.email) {
                console.warn(`Skipping attendee without an email: ${user.name || 'Unknown'}`);
                continue;
            }
            
            const certificateRef = db.collection('certificates').doc();
            const certificateId = certificateRef.id;

            const verificationUrl = `https://live-campus.vercel.app/verify-certificate?id=${certificateId}`;
            const qrCodeImage = await QRCode.toDataURL(verificationUrl);
            
            ctx.drawImage(templateImage, 0, 0);
            
            // --- MODIFICATION START ---
            
            // Set text baseline to middle for vertical centering
            ctx.textBaseline = 'middle';

            // Draw Student Name
            ctx.fillStyle = finalLayout.name.color;
            ctx.font = `${finalLayout.name.fontSize}px "Roboto", sans-serif`;
            ctx.textAlign = finalLayout.name.align;
            ctx.fillText(user.name, finalLayout.name.x, finalLayout.name.y);
            
            // Draw Registration Number
            if (attendee.regNo) {
                ctx.fillStyle = finalLayout.regNo.color;
                ctx.font = `${finalLayout.regNo.fontSize}px "Roboto", sans-serif`;
                ctx.textAlign = finalLayout.regNo.align;
                ctx.fillText(attendee.regNo, finalLayout.regNo.x, finalLayout.regNo.y);
            }

            // Draw QR Code (adjusting coordinates to draw from the center)
            const qrImage = await loadImage(qrCodeImage);
            const qrX = finalLayout.qrCode.x - (finalLayout.qrCode.size / 2);
            const qrY = finalLayout.qrCode.y - (finalLayout.qrCode.size / 2);
            ctx.drawImage(qrImage, qrX, qrY, finalLayout.qrCode.size, finalLayout.qrCode.size);

            // --- MODIFICATION END ---

            const buffer = canvas.toBuffer('image/png');
            const dataUri = `data:image/png;base64,${buffer.toString('base64')}`;
            
            const uploadResult = await cloudinary.uploader.upload(dataUri, {
                folder: `certificates/${eventId}`,
                public_id: attendee.userId,
                overwrite: true
            });
            
            const downloadUrl = uploadResult.secure_url;

            await certificateRef.set({
                id: certificateId,
                userId: attendee.userId,
                userName: user.name,
                eventId: eventId,
                eventName: event.title,
                issuedAt: new Date().toISOString(),
                certificateUrl: downloadUrl,
            });

            await transporter.sendMail({
                from: '"LiveCampus" <livecampuss@gmail.com>',
                to: user.email,
                subject: `Your Certificate for ${event.title}`,
                html: `
                    <p>Hello ${user.name},</p>
                    <p>Congratulations on attending "${event.title}"! Your certificate is ready.</p>
                    <p>You can download it from your profile on LiveCampus or by clicking the link below.</p>
                    <a href="${downloadUrl}" style="display: inline-block; padding: 10px 20px; color: white; background-color: #007bff; text-decoration: none; border-radius: 5px;">Download Your Certificate</a>
                `,
            });
        }

        res.status(200).json({ success: true, message: 'Certificates generated and sent successfully.' });

    } catch (error) {
        console.error('Error generating certificates:', error);
        res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
}