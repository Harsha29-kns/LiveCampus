import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import { Icon, LatLngExpression } from 'leaflet';
import { VenueLocation, Coordinates } from '../../types';
import { CAMPUS_CONFIG } from '../../config/campusConfig';
import Button from './Button';
import Input from './Input';
import { MapPin, X, Navigation } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icon
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete (Icon.Default.prototype as any)._getIconUrl;
Icon.Default.mergeOptions({
    iconRetinaUrl: markerIcon2x,
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
});

interface VenueMapSelectorProps {
    initialValue?: VenueLocation | null;
    onSave: (venueLocation: VenueLocation) => void;
    onClose: () => void;
}

// Component to handle map clicks
const MapClickHandler: React.FC<{ onLocationSelect: (coords: Coordinates) => void }> = ({ onLocationSelect }) => {
    useMapEvents({
        click: (e) => {
            onLocationSelect({
                latitude: e.latlng.lat,
                longitude: e.latlng.lng,
            });
        },
    });
    return null;
};

const VenueMapSelector: React.FC<VenueMapSelectorProps> = ({ initialValue, onSave, onClose }) => {
    const [venueCoords, setVenueCoords] = useState<Coordinates | null>(
        initialValue?.coordinates || null
    );
    const [venueName, setVenueName] = useState(initialValue?.name || '');
    const [buildingName, setBuildingName] = useState(initialValue?.buildingName || '');
    const [floorNumber, setFloorNumber] = useState(initialValue?.floorNumber || '');
    const [roomNumber, setRoomNumber] = useState(initialValue?.roomNumber || '');
    const [instructions, setInstructions] = useState(initialValue?.instructions || '');
    const [selectedStartingPoints, setSelectedStartingPoints] = useState<string[]>(
        initialValue?.startingPoints.map((sp) => sp.id) || []
    );

    const handleSave = () => {
        if (!venueCoords || selectedStartingPoints.length === 0) {
            alert('Please select a venue location and at least one starting point');
            return;
        }

        const venueLocation: VenueLocation = {
            coordinates: venueCoords,
            name: venueName || 'Event Venue',
            buildingName,
            floorNumber,
            roomNumber,
            instructions,
            startingPoints: CAMPUS_CONFIG.startingPoints.filter((sp) =>
                selectedStartingPoints.includes(sp.id)
            ),
        };

        onSave(venueLocation);
    };

    const toggleStartingPoint = (pointId: string) => {
        setSelectedStartingPoints((prev) =>
            prev.includes(pointId) ? prev.filter((id) => id !== pointId) : [...prev, pointId]
        );
    };

    const mapCenter: LatLngExpression = venueCoords
        ? [venueCoords.latitude, venueCoords.longitude]
        : [CAMPUS_CONFIG.center.latitude, CAMPUS_CONFIG.center.longitude];

    return (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="p-4 border-b flex items-center justify-between bg-indigo-50">
                    <div className="flex items-center gap-2">
                        <MapPin className="text-indigo-600" size={24} />
                        <h2 className="text-xl font-bold text-gray-900">Select Venue Location</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-indigo-100 rounded-full transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-auto p-4">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        {/* Map */}
                        <div className="lg:col-span-2">
                            <div className="bg-gray-100 rounded-lg overflow-hidden border-2 border-gray-300" style={{ height: '500px' }}>
                                <MapContainer
                                    key={`${mapCenter[0]}-${mapCenter[1]}`}
                                    center={mapCenter}
                                    zoom={CAMPUS_CONFIG.defaultZoom}
                                    style={{ height: '100%', width: '100%' }}
                                    scrollWheelZoom={true}
                                >
                                    <TileLayer
                                        attribution='&copy; <a href="https://www.esri.com/">Esri</a> &mdash; Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community'
                                        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                                    />
                                    <MapClickHandler onLocationSelect={setVenueCoords} />

                                    {/* Venue marker */}
                                    {venueCoords && (
                                        <Marker position={[venueCoords.latitude, venueCoords.longitude]}>
                                            <Popup>
                                                <strong>Venue Location</strong>
                                                <br />
                                                {venueName || 'Event Venue'}
                                            </Popup>
                                        </Marker>
                                    )}

                                    {/* Starting point markers */}
                                    {CAMPUS_CONFIG.startingPoints
                                        .filter((sp) => selectedStartingPoints.includes(sp.id))
                                        .map((sp) => (
                                            <Marker
                                                key={sp.id}
                                                position={[sp.coordinates.latitude, sp.coordinates.longitude]}
                                                icon={
                                                    new Icon({
                                                        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
                                                        shadowUrl: markerShadow,
                                                        iconSize: [25, 41],
                                                        iconAnchor: [12, 41],
                                                        popupAnchor: [1, -34],
                                                        shadowSize: [41, 41],
                                                    })
                                                }
                                            >
                                                <Popup>
                                                    <strong>Starting Point</strong>
                                                    <br />
                                                    {sp.name}
                                                </Popup>
                                            </Marker>
                                        ))}
                                </MapContainer>
                            </div>
                            <p className="text-sm text-gray-500 mt-2">
                                <Navigation className="inline" size={14} /> Click on the map to set the venue location
                            </p>
                        </div>

                        {/* Form */}
                        <div className="space-y-4">
                            <div>
                                <h3 className="font-semibold text-gray-900 mb-3">Venue Details</h3>
                                <div className="space-y-3">
                                    <Input
                                        label="Venue Name"
                                        value={venueName}
                                        onChange={(e) => setVenueName(e.target.value)}
                                        placeholder="e.g., Auditorium"
                                    />
                                    <Input
                                        label="Building Name (Optional)"
                                        value={buildingName}
                                        onChange={(e) => setBuildingName(e.target.value)}
                                        placeholder="e.g., Main Block"
                                    />
                                    <Input
                                        label="Floor Number (Optional)"
                                        value={floorNumber}
                                        onChange={(e) => setFloorNumber(e.target.value)}
                                        placeholder="e.g., 2nd Floor"
                                    />
                                    <Input
                                        label="Room Number (Optional)"
                                        value={roomNumber}
                                        onChange={(e) => setRoomNumber(e.target.value)}
                                        placeholder="e.g., Room 201"
                                    />
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Navigation Instructions (Optional)
                                        </label>
                                        <textarea
                                            value={instructions}
                                            onChange={(e) => setInstructions(e.target.value)}
                                            placeholder="e.g., Enter from the east gate"
                                            rows={2}
                                            className="w-full p-2 border rounded-md text-sm"
                                        />
                                    </div>
                                </div>
                            </div>

                            {venueCoords && (
                                <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
                                    <strong>Coordinates:</strong>
                                    <br />
                                    Lat: {venueCoords.latitude.toFixed(6)}
                                    <br />
                                    Lng: {venueCoords.longitude.toFixed(6)}
                                </div>
                            )}

                            <div>
                                <h3 className="font-semibold text-gray-900 mb-2">Starting Points *</h3>
                                <p className="text-xs text-gray-500 mb-3">
                                    Select where students can navigate from
                                </p>
                                <div className="space-y-2 max-h-48 overflow-y-auto">
                                    {CAMPUS_CONFIG.startingPoints.map((point) => (
                                        <label
                                            key={point.id}
                                            className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                                        >
                                            <input
                                                type="checkbox"
                                                checked={selectedStartingPoints.includes(point.id)}
                                                onChange={() => toggleStartingPoint(point.id)}
                                                className="rounded text-indigo-600"
                                            />
                                            <span className="text-sm">{point.name}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t bg-gray-50 flex justify-end gap-3">
                    <Button variant="outline" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={!venueCoords || selectedStartingPoints.length === 0}>
                        Save Venue Location
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default VenueMapSelector;
