import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useEventStore } from '../stores/eventStore';
import NavigationView from '../components/ui/NavigationView';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import Button from '../components/ui/Button';
import { AlertCircle, ArrowLeft } from 'lucide-react';

const NavigationPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { getEventById, fetchEvents } = useEventStore();
    const [event, setEvent] = useState(getEventById(id || ''));
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadEvent = async () => {
            setIsLoading(true);
            try {
                let fetchedEvent = getEventById(id || '');

                if (!fetchedEvent) {
                    await fetchEvents();
                    fetchedEvent = getEventById(id || '');
                }

                if (fetchedEvent) {
                    setEvent(fetchedEvent);

                    // Check if venue location exists
                    if (!fetchedEvent.venueLocation) {
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
    }, [id, getEventById, fetchEvents]);

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
