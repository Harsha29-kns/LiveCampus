import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { db } from '../firebaseConfig';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { Card, CardBody, CardHeader } from '../components/ui/Card';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { CheckCircle, XCircle, Award, Calendar, User, QrCode } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import Button from '../components/ui/Button';

interface CertificateData {
    id: string;
    userName: string;
    eventName: string;
    issuedAt: string;
    certificateUrl: string;
}

const VerifyCertificate: React.FC = () => {
    const [searchParams] = useSearchParams();
    const certificateId = searchParams.get('id');

    const [certificate, setCertificate] = useState<CertificateData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const verifyCertificate = async () => {
            if (!certificateId) {
                setIsLoading(false);
                return;
            }

            setIsLoading(true);
            setError(null);

            try {
                const q = query(
                    collection(db, 'certificates'), 
                    where('id', '==', certificateId), 
                    limit(1)
                );
                const snapshot = await getDocs(q);

                if (snapshot.empty) {
                    setCertificate(null);
                } else {
                    const docData = snapshot.docs[0].data() as CertificateData;
                    setCertificate(docData);
                }
            } catch (err) {
                console.error("Error verifying certificate:", err);
                setError("An error occurred while trying to verify the certificate.");
            } finally {
                setIsLoading(false);
            }
        };

        verifyCertificate();
    }, [certificateId]);

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[70vh] text-center">
                <LoadingSpinner size="lg" text="Verifying Certificate..." />
            </div>
        );
    }

    if (!certificateId) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[70vh] text-center p-4">
                 <QrCode size={64} className="text-gray-400 mb-4" />
                <h1 className="text-2xl font-bold text-gray-800">No Certificate ID Provided</h1>
                <p className="mt-2 text-gray-600">
                    Please scan a valid certificate QR code to verify its authenticity.
                </p>
                <Button onClick={() => window.location.href = '/'} className="mt-6">
                    Back to Home
                </Button>
            </div>
        );
    }
    
    return (
        <div className="max-w-2xl mx-auto py-12 px-4">
            {certificate ? (
                <Card className="border-t-4 border-green-500 shadow-lg animate-fade-in">
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <CheckCircle className="w-8 h-8 text-green-500" />
                            <h1 className="text-2xl font-bold text-gray-800">Certificate Verified</h1>
                        </div>
                    </CardHeader>
                    <CardBody className="space-y-4">
                        <p className="text-gray-600">This certificate is authentic and has been successfully verified in our records.</p>
                        <div className="p-4 bg-gray-50 rounded-lg border space-y-3">
                            <div className="flex items-center">
                                <User className="w-5 h-5 text-gray-500 mr-3" />
                                <div>
                                    <h3 className="font-medium text-gray-500 text-sm">Recipient</h3>
                                    <p className="font-semibold text-gray-900">{certificate.userName}</p>
                                </div>
                            </div>
                             <div className="flex items-center">
                                <Award className="w-5 h-5 text-gray-500 mr-3" />
                                <div>
                                    <h3 className="font-medium text-gray-500 text-sm">Event</h3>
                                    <p className="font-semibold text-gray-900">{certificate.eventName}</p>
                                </div>
                            </div>
                             <div className="flex items-center">
                                <Calendar className="w-5 h-5 text-gray-500 mr-3" />
                                <div>
                                    <h3 className="font-medium text-gray-500 text-sm">Date Issued</h3>
                                    <p className="font-semibold text-gray-900">{format(parseISO(certificate.issuedAt), 'MMMM d, yyyy')}</p>
                                </div>
                            </div>
                        </div>
                        <Button onClick={() => window.open(certificate.certificateUrl, '_blank')} fullWidth>
                            View Original Certificate
                        </Button>
                    </CardBody>
                </Card>
            ) : (
                 <Card className="border-t-4 border-red-500 shadow-lg animate-fade-in">
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <XCircle className="w-8 h-8 text-red-500" />
                            <h1 className="text-2xl font-bold text-gray-800">Certificate Not Valid</h1>
                        </div>
                    </CardHeader>
                    <CardBody>
                        <p className="text-gray-600">
                            We could not find a record of this certificate. It may be invalid, expired, or the link may be incorrect.
                        </p>
                        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
                         <Button onClick={() => window.location.href = '/'} className="mt-6">
                            Back to Home
                        </Button>
                    </CardBody>
                </Card>
            )}
        </div>
    );
};

export default VerifyCertificate;
