import { Coordinates } from '../types';
import { OSRM_CONFIG } from '../config/campusConfig';
import { getDistance } from 'geolib';

export interface RouteStep {
    instruction: string;
    distance: number; // in meters
    duration: number; // in seconds
    maneuver: {
        type: string;
        modifier?: string;
        location: [number, number]; // [longitude, latitude]
    };
}

export interface RouteData {
    distance: number; //  in meters
    duration: number; // in seconds
    steps: RouteStep[];
    geometry: [number, number][]; // array of [longitude, latitude] coordinates
}

class NavigationService {
    private routeCache: Map<string, { route: RouteData; timestamp: number }> = new Map();
    private readonly CACHE_DURATION = 300000; // 5 minutes

    /**
     * Get turn-by-turn directions from OSRM
     */
    async getDirections(origin: Coordinates, destination: Coordinates): Promise<RouteData | null> {
        const cacheKey = `${origin.latitude},${origin.longitude}-${destination.latitude},${destination.longitude}`;

        // Check cache
        const cached = this.routeCache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
            return cached.route;
        }

        // Format coordinates for OSRM (longitude,latitude)
        const coords = `${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}`;

        // Try primary server first, then fallbacks
        const servers = [OSRM_CONFIG.primaryServer, ...OSRM_CONFIG.fallbackServers];

        for (const server of servers) {
            try {
                const url = `${server}/${coords}?steps=true&geometries=geojson&overview=full`;
                const response = await fetch(url);

                if (!response.ok) continue;

                const data = await response.json();

                if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
                    continue;
                }

                const route = data.routes[0];
                const routeData: RouteData = {
                    distance: route.distance,
                    duration: route.duration,
                    steps: route.legs[0].steps.map((step: any) => ({
                        instruction: step.maneuver.instruction || this.generateInstruction(step.maneuver),
                        distance: step.distance,
                        duration: step.duration,
                        maneuver: {
                            type: step.maneuver.type,
                            modifier: step.maneuver.modifier,
                            location: step.maneuver.location,
                        },
                    })),
                    geometry: route.geometry.coordinates,
                };

                // Cache the result
                this.routeCache.set(cacheKey, {
                    route: routeData,
                    timestamp: Date.now(),
                });

                return routeData;
            } catch (error) {
                console.warn(`OSRM server ${server} failed:`, error);
                continue;
            }
        }

        console.error('All OSRM servers failed');
        return null;
    }

    /**
     * Get current location using browser Geolocation API
     */
    async getCurrentLocation(): Promise<Coordinates | null> {
        if (!navigator.geolocation) {
            console.error('Geolocation is not supported by this browser');
            return null;
        }

        return new Promise((resolve) => {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    resolve({
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                    });
                },
                (error) => {
                    console.error('Error getting location:', error.message);
                    resolve(null);
                },
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 0,
                }
            );
        });
    }

    /**
     * Watch user's location in real-time
     */
    watchLocation(
        onUpdate: (coords: Coordinates) => void,
        onError?: (error: string) => void
    ): number | null {
        if (!navigator.geolocation) {
            onError?.('Geolocation is not supported');
            return null;
        }

        return navigator.geolocation.watchPosition(
            (position) => {
                onUpdate({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                });
            },
            (error) => {
                onError?.(error.message);
            },
            {
                enableHighAccuracy: true,
                timeout: 5000,
                maximumAge: 0,
            }
        );
    }

    /**
     * Stop watching location
     */
    clearWatch(watchId: number): void {
        navigator.geolocation.clearWatch(watchId);
    }

    /**
     * Calculate distance between two points in meters
     */
    calculateDistance(point1: Coordinates, point2: Coordinates): number {
        return getDistance(
            { latitude: point1.latitude, longitude: point1.longitude },
            { latitude: point2.latitude, longitude: point2.longitude }
        );
    }

    /**
     * Check if user is on the route (within threshold)
     */
    isUserOnRoute(
        userLocation: Coordinates,
        routeGeometry: [number, number][],
        thresholdMeters: number = 50
    ): boolean {
        // Check if user is within threshold distance of any point on the route
        for (const point of routeGeometry) {
            const routePoint: Coordinates = {
                latitude: point[1],
                longitude: point[0],
            };
            const distance = this.calculateDistance(userLocation, routePoint);
            if (distance <= thresholdMeters) {
                return true;
            }
        }
        return false;
    }

    /**
     * Speak navigation instruction using Web Speech API
     */
    speakDirection(instruction: string): void {
        if (!('speechSynthesis' in window)) {
            console.warn('Speech synthesis not supported');
            return;
        }

        // Cancel any ongoing speech
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(instruction);
        utterance.rate = 0.9;
        utterance.pitch = 1;
        utterance.volume = 1;

        window.speechSynthesis.speak(utterance);
    }

    /**
     * Generate human-readable instruction from maneuver
     */
    private generateInstruction(maneuver: any): string {
        const { type, modifier } = maneuver;

        const typeMap: Record<string, string> = {
            turn: 'Turn',
            'new name': 'Continue on',
            depart: 'Head',
            arrive: 'You have arrived',
            merge: 'Merge',
            'on ramp': 'Take the ramp',
            'off ramp': 'Take the exit',
            fork: 'At the fork',
            'end of road': 'At the end of the road',
            continue: 'Continue',
            roundabout: 'At the roundabout',
            rotary: 'At the rotary',
            'roundabout turn': 'At the roundabout',
        };

        const modifierMap: Record<string, string> = {
            left: 'left',
            right: 'right',
            'slight left': 'slight left',
            'slight right': 'slight right',
            'sharp left': 'sharp left',
            'sharp right': 'sharp right',
            straight: 'straight',
            uturn: 'U-turn',
        };

        const action = typeMap[type] || 'Continue';
        const direction = modifier ? modifierMap[modifier] || modifier : '';

        return `${action} ${direction}`.trim();
    }

    /**
     * Format distance for display
     */
    formatDistance(meters: number): string {
        if (meters < 1000) {
            return `${Math.round(meters)} m`;
        }
        return `${(meters / 1000).toFixed(1)} km`;
    }

    /**
     * Format duration for display
     */
    formatDuration(seconds: number): string {
        const minutes = Math.round(seconds / 60);
        if (minutes < 60) {
            return `${minutes} min`;
        }
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;
        return `${hours}h ${remainingMinutes}m`;
    }
}

export const navigationService = new NavigationService();
