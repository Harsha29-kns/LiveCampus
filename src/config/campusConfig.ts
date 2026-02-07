import { StartingPoint, Coordinates } from '../types';

// Default campus center coordinates (will be configured later)
export const CAMPUS_CONFIG = {
    center: {
        latitude: 9.57495782391821, // Example: Bangalore coordinates
        longitude: 77.67564871019835,
    } as Coordinates,
    defaultZoom: 16,
    startingPoints: [
        {
            id: 'main-gate',
            name: 'Main Gate',
            coordinates: { latitude: 9.576170166404633, longitude: 77.6832775040452 },
        },
        {
            id: 'library',
            name: 'Library',
            coordinates: { latitude: 12.9720, longitude: 77.5950 },
        },
        {
            id: 'boys-hostel',
            name: 'Boys Hostel',
            coordinates: { latitude: 12.9710, longitude: 77.5940 },
        },
        {
            id: 'girls-hostel',
            name: 'Girls Hostel',
            coordinates: { latitude: 12.9725, longitude: 77.5955 },
        },
        {
            id: 'cafeteria',
            name: 'Cafeteria',
            coordinates: { latitude: 12.9718, longitude: 77.5948 },
        },
        {
            id: 'sports-complex',
            name: 'Sports Complex',
            coordinates: { latitude: 12.9712, longitude: 77.5952 },
        },
    ] as StartingPoint[],
};

// OSRM Public API endpoint (free, no API key required)
export const OSRM_CONFIG = {
    primaryServer: 'https://router.project-osrm.org/route/v1/foot',
    fallbackServers: [
        'https://routing.openstreetmap.de/routed-foot/route/v1/foot',
    ],
};
