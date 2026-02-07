import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import NavigationView from '../components/ui/NavigationView';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import Button from '../components/ui/Button';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import { Event } from '../types';

const NavigationPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [event, setEvent] = useState<Event | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadEvent = async () => {
            if (!id) {
                setError('No event ID provided.');
                setIsLoading(false);
                return;
            }

            setIsLoading(true);
            try {
                // Fetch event directly from Firestore
                const eventDoc = await getDoc(doc(db, 'events', id));

                if (eventDoc.exists()) {
                    const eventData = { id: eventDoc.id, ...eventDoc.data() } as Event;
                    setEvent(eventData);

                    // Check if venue location exists
                    if (!eventData.venueLocation) {
                        setError('Navigation not available - venue location not configured for this event.');
                    }
                } else {
                    setError('Event not found.');
                }
            } catch (err) {
                console.error('Error loading event:', err);
                setError('Failed to load event. Please try again.');
            } finally {
                setIsLoading(false);
            }
        };

        loadEvent();
    }, [id]);

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <LoadingSpinner />
            </div>
        );
    }

    if (error || !event || !event.venueLocation) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
                    <div className="flex items-center gap-3 text-red-600 mb-4">
                        <AlertCircle size={32} />
                        <h2 className="text-xl font-bold">Navigation Unavailable</h2>
                    </div>
                    <p className="text-gray-700 mb-6">
                        {error || 'This event does not have navigation configured.'}
                    </p>
                    <div className="flex gap-3">
                        <Button
                            variant="outline"
                            leftIcon={<ArrowLeft size={16} />}
                            onClick={() => navigate(-1)}
                            fullWidth
                        >
                            Go Back
                        </Button>
                        <Button
                            onClick={() => navigate(`/events/${id}`)}
                            fullWidth
                        >
                            View Event Details
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <NavigationView
            destination={event.venueLocation.coordinates}
            destinationName={event.venueLocation.name}
            startingPoints={event.venueLocation.startingPoints}
            instructions={event.venueLocation.instructions}
            onClose={() => navigate(`/events/${id}`)}
        />
    );
};

export default NavigationPage;
