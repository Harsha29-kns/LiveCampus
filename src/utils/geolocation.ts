import { Coordinates } from '../types';

export interface GeolocationError {
    code: number;
    message: string;
}

export type GeolocationPermissionState = 'granted' | 'denied' | 'prompt';

class GeolocationService {
    /**
     * Check if geolocation is supported by the browser
     */
    isSupported(): boolean {
        return 'geolocation' in navigator;
    }

    /**
     * Get the current position of the user
     * @param options - Geolocation options
     * @returns Promise with coordinates or null if failed
     */
    async getCurrentPosition(options?: PositionOptions): Promise<Coordinates | null> {
        if (!this.isSupported()) {
            console.error('Geolocation is not supported by this browser');
            return null;
        }

        const defaultOptions: PositionOptions = {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0,
            ...options,
        };

        return new Promise((resolve) => {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    resolve({
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                    });
                },
                (error) => {
                    console.error('Error getting current position:', error.message);
                    resolve(null);
                },
                defaultOptions
            );
        });
    }

    /**
     * Watch the user's position in real-time
     * @param onSuccess - Callback when position is updated
     * @param onError - Callback when error occurs
     * @param options - Geolocation options
     * @returns Watch ID to clear the watch later
     */
    watchPosition(
        onSuccess: (coords: Coordinates) => void,
        onError?: (error: GeolocationError) => void,
        options?: PositionOptions
    ): number | null {
        if (!this.isSupported()) {
            console.error('Geolocation is not supported');
            return null;
        }

        const defaultOptions: PositionOptions = {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 0,
            ...options,
        };

        return navigator.geolocation.watchPosition(
            (position) => {
                onSuccess({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                });
            },
            (error) => {
                onError?.({
                    code: error.code,
                    message: error.message,
                });
            },
            defaultOptions
        );
    }

    /**
     * Clear a position watch
     * @param watchId - Watch ID returned by watchPosition
     */
    clearWatch(watchId: number): void {
        if (this.isSupported()) {
            navigator.geolocation.clearWatch(watchId);
        }
    }

    /**
     * Check permission status for geolocation
     * @returns Permission state or null if Permissions API not supported
     */
    async checkPermission(): Promise<GeolocationPermissionState | null> {
        if (!('permissions' in navigator)) {
            // Permissions API not supported
            return null;
        }

        try {
            const result = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
            return result.state as GeolocationPermissionState;
        } catch (error) {
            console.error('Error checking geolocation permission:', error);
            return null;
        }
    }

    /**
     * Request geolocation permission by attempting to get position
     * Returns true if permission granted, false otherwise
     */
    async requestPermission(): Promise<boolean> {
        const coords = await this.getCurrentPosition({ timeout: 5000 });
        return coords !== null;
    }

    /**
     * Get user-friendly error message based on error code
     * @param error - Geolocation error
     * @returns User-friendly error message
     */
    getErrorMessage(error: GeolocationError): string {
        switch (error.code) {
            case 1: // PERMISSION_DENIED
                return 'Location permission denied. Please enable location access in your browser settings.';
            case 2: // POSITION_UNAVAILABLE
                return 'Location information is unavailable. Please check your device settings.';
            case 3: // TIMEOUT
                return 'Location request timed out. Please try again.';
            default:
                return 'An unknown error occurred while getting your location.';
        }
    }
}

export const geolocationService = new GeolocationService();
