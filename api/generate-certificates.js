import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import nodemailer from 'nodemailer';
// Corrected import for canvas and path
import { createCanvas, loadImage, registerFont } from 'canvas';
import path from 'path'; // CORRECTED: Import the built-in Node.js 'path' module
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

// --- Register Font with node-canvas ---
// This tells the canvas where to find the Roboto font file.
// It assumes you have a folder named 'fonts' inside your 'api' directory
// and that this file is included in your deployment.
try {
    const fontPath = path.join(process.cwd(), 'api', 'fonts', 'Roboto-Regular.ttf');
    console.log(`Attempting to register font from path: ${fontPath}`);
    registerFont(fontPath, { family: 'Roboto' });
    console.log("Font 'Roboto' registered successfully.");
} catch (error) {
    console.error("Could not register font. Make sure 'api/fonts/Roboto-Regular.ttf' exists in your project's root directory when deployed.", error);
}


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

            // Construct list of recipients (Lead + Members)
            let recipients = [];
            if (attendee.teamMembers && Array.isArray(attendee.teamMembers) && attendee.teamMembers.length > 0) {
                // Add Lead
                recipients.push({
                    name: attendee.teamLead?.name || attendee.name || user.name,
                    regNo: attendee.teamLead?.regNo || attendee.regNo,
                    type: 'Lead'
                });
                // Add Members
                attendee.teamMembers.forEach(member => {
                    recipients.push({
                        name: member.name,
                        regNo: member.regNo,
                        type: 'Member'
                    });
                });
            } else {
                // Individual
                recipients.push({
                    name: attendee.name || user.name,
                    regNo: attendee.regNo,
                    type: 'Individual'
                });
            }

            // Generate certificate for EACH recipient
            for (const recipient of recipients) {
                const certificateRef = db.collection('certificates').doc();
                const certificateId = certificateRef.id;

                const verificationUrl = `https://live-campus.vercel.app/verify-certificate?id=${certificateId}`;
                const qrCodeImage = await QRCode.toDataURL(verificationUrl);

                ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear canvas before drawing
                ctx.drawImage(templateImage, 0, 0);

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
                ctx.font = `${finalNameFontSize}px "Roboto"`; // Ensure the family name matches the one registered
                ctx.textAlign = finalLayoutRatios.name.align;
                ctx.fillText(recipient.name, finalNameX, finalNameY);

                if (recipient.regNo) {
                    ctx.fillStyle = finalLayoutRatios.regNo.color;
                    ctx.font = `${finalRegNoFontSize}px "Roboto"`; // Ensure the family name matches
                    ctx.textAlign = finalLayoutRatios.regNo.align;
                    ctx.fillText(recipient.regNo, finalRegNoX, finalRegNoY);
                }

                const qrImage = await loadImage(qrCodeImage);
                ctx.drawImage(qrImage, finalQrX - (finalQrSize / 2), finalQrY - (finalQrSize / 2), finalQrSize, finalQrSize);

                const buffer = canvas.toBuffer('image/png');
                const dataUri = `data:image/png;base64,${buffer.toString('base64')}`;

                // Use unique public_id for each member
                const safeName = recipient.name.replace(/[^a-zA-Z0-9]/g, '_');
                const uniqueId = `${attendee.userId}_${safeName}`;

                const uploadResult = await cloudinary.uploader.upload(dataUri, {
                    folder: `certificates/${eventId}`,
                    public_id: uniqueId,
                    overwrite: true
                });

                const downloadUrl = uploadResult.secure_url;

                await certificateRef.set({
                    id: certificateId,
                    userId: attendee.userId, // Link to Lead's account
                    userName: recipient.name || '', // Ensure name is not undefined
                    recipientName: recipient.name || '', // Ensure name is not undefined
                    regNo: recipient.regNo || '', // Ensure regNo is not undefined
                    eventId: eventId,
                    eventName: event.title,
                    issuedAt: new Date().toISOString(),
                    certificateUrl: downloadUrl,
                    isTeamMember: recipient.type === 'Member'
                });

                await transporter.sendMail({
                    from: '"LiveCampus" <livecampuss@gmail.com>',
                    to: user.email, // Send to Lead's email
                    subject: `Certificate for ${recipient.name} - ${event.title}`,
                    html: `
                        <p>Hello ${user.name},</p>
                        <p>Here is the certificate for <strong>${recipient.name}</strong> for attending "${event.title}".</p>
                        <p>You can download it by clicking the link below.</p>
                        <a href="${downloadUrl}" style="display: inline-block; padding: 10px 20px; color: white; background-color: #007bff; text-decoration: none; border-radius: 5px;">Download Certificate</a>
                    `,
                });
            }

            // Create in-app notification for Lead
            const certCount = recipients.length;
            await db.collection('notifications').add({
                userId: attendee.userId,
                title: 'Certificates Ready',
                message: `Certificates for your team (${certCount} members) for "${event.title}" are now available for download! check your mail`,
                type: 'success',
                read: false,
                createdAt: new Date().toISOString()
            });
        }

        res.status(200).json({ success: true, message: 'Certificates generated and sent successfully.' });

    } catch (error) {
        console.error('Error generating certificates:', error);
        res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
}
