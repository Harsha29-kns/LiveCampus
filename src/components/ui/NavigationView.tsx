import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import { Icon, LatLngExpression } from 'leaflet';
import { Coordinates, StartingPoint } from '../../types';
import Button from './Button';
import { Navigation, ExternalLink, Info } from 'lucide-react';
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

                {/* Starting point selector */}
                {startingPoints.length > 1 && (
                    <div className="mt-3">
                        <label className="text-xs text-indigo-100 block mb-1">Navigate from:</label>
                        <select
                            value={selectedStartingPoint.id}
                            onChange={(e) => {
                                const point = startingPoints.find((p) => p.id === e.target.value);
                                if (point) setSelectedStartingPoint(point);
                            }}
                            className="w-full p-2 rounded bg-indigo-500 text-white border border-indigo-400"
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
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
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
                    />

                    {/* Destination marker */}
                    <Marker position={[destination.latitude, destination.longitude]} />
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
