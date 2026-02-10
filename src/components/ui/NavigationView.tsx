import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { Icon, LatLngExpression } from 'leaflet';
import { Coordinates, StartingPoint } from '../../types';
import { CAMPUS_CONFIG } from '../../config/campusConfig';
import { navigationService } from '../../services/navigationService';
import Button from './Button';
import { Navigation, ExternalLink, Info, MapPin, Loader2 } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete (Icon.Default.prototype as any)._getIconUrl;
Icon.Default.mergeOptions({
    iconRetinaUrl: markerIcon2x,
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
});

interface NavigationViewProps {
    destination: Coordinates;
    destinationName: string;
    startingPoints: StartingPoint[];
    instructions?: string;
    onClose: () => void;
}

const NavigationView: React.FC<NavigationViewProps> = ({
    destination,
    destinationName,
    startingPoints,
    instructions,
    onClose,
}) => {
    const [selectedStartingPoint, setSelectedStartingPoint] = useState<StartingPoint>(
        startingPoints[0]
    );
    const [isLoadingLocation, setIsLoadingLocation] = useState(true);
    const [userLocation, setUserLocation] = useState<Coordinates | null>(null);
    const [isOffCampus, setIsOffCampus] = useState(false);
    const [distanceFromCampus, setDistanceFromCampus] = useState<number | null>(null);

    useEffect(() => {
        const detectLocation = async () => {
            setIsLoadingLocation(true);
            try {
                // Get user's current location
                const location = await navigationService.getCurrentLocation();

                if (location) {
                    setUserLocation(location);

                    // Calculate distance from campus center
                    const dist = navigationService.calculateDistance(
                        location,
                        CAMPUS_CONFIG.center
                    );
                    setDistanceFromCampus(dist);

                    // Check if user is off-campus (outside boundary radius)
                    // limit to 2km or configured radius
                    const threshold = CAMPUS_CONFIG.boundaryRadius || 2000;

                    if (dist > threshold) {
                        setIsOffCampus(true);
                        // Create a temporary starting point for user's location
                        setSelectedStartingPoint({
                            id: 'current-location',
                            name: 'Your Current Location',
                            coordinates: location
                        });
                    }
                }
            } catch (error) {
                console.error('Failed to detect location:', error);
            } finally {
                setIsLoadingLocation(false);
            }
        };

        detectLocation();
    }, []);

    const mapCenter: LatLngExpression = [destination.latitude, destination.longitude];

    const openInGoogleMaps = () => {
        const url = `https://www.google.com/maps/dir/${selectedStartingPoint.coordinates.latitude},${selectedStartingPoint.coordinates.longitude}/${destination.latitude},${destination.longitude}`;
        window.open(url, '_blank');
    };

    return (
        <div className="fixed inset-0 z-50 bg-white flex flex-col">
            {/* Header */}
            <div className="bg-indigo-600 text-white p-4 shadow-lg">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Navigation size={24} />
                        <div>
                            <h2 className="font-bold text-lg">{destinationName}</h2>
                            <p className="text-sm text-indigo-100">Navigate to event venue</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-indigo-700 rounded-full text-xl">
                        ✕
                    </button>
                </div>

                {/* Navigation Status / Selector */}
                <div className="mt-4 bg-indigo-700 bg-opacity-50 rounded-lg p-3">
                    {isLoadingLocation ? (
                        <div className="flex items-center gap-2 text-sm text-indigo-100">
                            <Loader2 size={16} className="animate-spin" />
                            Detecting your location...
                        </div>
                    ) : isOffCampus && userLocation ? (
                        // Off-campus view
                        <div>
                            <div className="flex items-start gap-2 mb-1">
                                <MapPin size={16} className="text-yellow-300 mt-0.5" />
                                <div>
                                    <p className="text-sm font-medium text-white">
                                        Navigating from your location
                                    </p>
                                    <p className="text-xs text-indigo-200">
                                        You are {navigationService.formatDistance(distanceFromCampus || 0)} from campus
                                    </p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        // On-campus view (Selector)
                        <div>
                            <label className="text-xs text-indigo-200 block mb-1">
                                {userLocation ? 'You are on campus. ' : ''}Navigate from:
                            </label>
                            <select
                                value={selectedStartingPoint.id === 'current-location' ? startingPoints[0].id : selectedStartingPoint.id}
                                onChange={(e) => {
                                    const point = startingPoints.find((p) => p.id === e.target.value);
                                    if (point) setSelectedStartingPoint(point);
                                }}
                                className="w-full p-2 rounded bg-indigo-500 text-white border border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                            >
                                {startingPoints.map((point) => (
                                    <option key={point.id} value={point.id}>
                                        {point.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>
            </div>

            {/* Map */}
            <div className="flex-1 relative">
                <MapContainer
                    key={`nav-${mapCenter[0]}-${mapCenter[1]}`}
                    center={mapCenter}
                    zoom={16}
                    style={{ height: '100%', width: '100%' }}
                    scrollWheelZoom={true}
                >
                    <TileLayer
                        attribution='&copy; <a href="https://www.esri.com/">Esri</a> &mdash; Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community'
                        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                    />

                    {/* Starting point marker */}
                    <Marker
                        position={[
                            selectedStartingPoint.coordinates.latitude,
                            selectedStartingPoint.coordinates.longitude,
                        ]}
                        icon={
                            new Icon({
                                iconUrl:
                                    'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
                                shadowUrl: markerShadow,
                                iconSize: [25, 41],
                                iconAnchor: [12, 41],
                                popupAnchor: [1, -34],
                                shadowSize: [41, 41],
                            })
                        }
                    >
                        <Popup>{selectedStartingPoint.name}</Popup>
                    </Marker>

                    {/* Destination marker */}
                    <Marker position={[destination.latitude, destination.longitude]}>
                        <Popup>{destinationName}</Popup>
                    </Marker>
                </MapContainer>
            </div>

            {/* Bottom panel */}
            <div className="bg-white border-t shadow-lg p-4 space-y-3">
                {instructions && (
                    <div className="bg-indigo-50 p-3 rounded-lg border border-indigo-200">
                        <p className="text-sm text-indigo-700 flex items-start gap-2">
                            <Info size={16} className="flex-shrink-0 mt-0.5" />
                            {instructions}
                        </p>
                    </div>
                )}

                <div className="space-y-2">
                    <Button fullWidth onClick={openInGoogleMaps} leftIcon={<ExternalLink size={18} />}>
                        Open in Google Maps
                    </Button>
                    <Button fullWidth variant="outline" onClick={onClose}>
                        Close
                    </Button>
                </div>

                <p className="text-xs text-gray-500 text-center">
                    Click "Open in Google Maps" for turn-by-turn navigation
                </p>
            </div>
        </div>
    );
};

export default NavigationView;
