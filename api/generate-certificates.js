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
        const layout = event.certificateLayout; // This contains RATIOS (e.g., x: 0.5)

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

        // Default layout (in ratios) for fallback if no custom layout is saved
        const defaultLayout = {
            name: { x: 0.5, y: 0.5, fontSize: 0.05, color: 'black', align: 'center' },
            regNo: { x: 0.5, y: 0.56, fontSize: 0.025, color: 'black', align: 'center' },
            qrCode: { x: 0.5, y: 0.8, size: 0.15 }
        };

        const finalLayoutRatios = {
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
            
            // --- APPLY SCALED LAYOUT ---
            
            // Convert ratios to final pixel values based on the ACTUAL template dimensions
            const finalNameX = finalLayoutRatios.name.x * templateImage.width;
            const finalNameY = finalLayoutRatios.name.y * templateImage.height;
            const finalNameFontSize = finalLayoutRatios.name.fontSize * templateImage.height;

            const finalRegNoX = finalLayoutRatios.regNo.x * templateImage.width;
            const finalRegNoY = finalLayoutRatios.regNo.y * templateImage.height;
            const finalRegNoFontSize = finalLayoutRatios.regNo.fontSize * templateImage.height;
            
            const finalQrX = finalLayoutRatios.qrCode.x * templateImage.width;
            const finalQrY = finalLayoutRatios.qrCode.y * templateImage.height;
            const finalQrSize = finalLayoutRatios.qrCode.size * templateImage.width;

            // Draw elements using the calculated pixel values
            ctx.textBaseline = 'middle';
            ctx.fillStyle = finalLayoutRatios.name.color;
            ctx.font = `${finalNameFontSize}px "Roboto", sans-serif`;
            ctx.textAlign = finalLayoutRatios.name.align;
            ctx.fillText(user.name, finalNameX, finalNameY);
            
            if (attendee.regNo) {
                ctx.fillStyle = finalLayoutRatios.regNo.color;
                ctx.font = `${finalRegNoFontSize}px "Roboto", sans-serif`;
                ctx.textAlign = finalLayoutRatios.regNo.align;
                ctx.fillText(attendee.regNo, finalRegNoX, finalRegNoY);
            }

            const qrImage = await loadImage(qrCodeImage);
            ctx.drawImage(qrImage, finalQrX - (finalQrSize / 2), finalQrY - (finalQrSize / 2), finalQrSize, finalQrSize);

            // --- END OF FIX ---

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