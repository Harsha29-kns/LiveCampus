import { Coordinates } from '../types';

export interface GeocodingResult {
    displayName: string;
    location: Coordinates;
    address: {
        city?: string;
        state?: string;
        country?: string;
        road?: string;
        suburb?: string;
    };
}

class GeocodingService {
    private readonly NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org';
    private readonly USER_AGENT = 'LiveCampus/1.0'; // Required by Nominatim
    private searchCache: Map<string, { results: GeocodingResult[]; timestamp: number }> = new Map();
    private readonly CACHE_DURATION = 600000; // 10 minutes

    /**
     * Search for locations using Nominatim API
     * @param query - Search query (e.g., "Chennai", "Main Gate")
     * @param limit - Maximum number of results (default: 5)
     * @returns Array of geocoding results
     */
    async searchLocation(query: string, limit: number = 5): Promise<GeocodingResult[]> {
        if (!query || query.trim().length < 2) {
            return [];
        }

        const cacheKey = `${query.toLowerCase()}-${limit}`;

        // Check cache
        const cached = this.searchCache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
            return cached.results;
        }

        try {
            const url = `${this.NOMINATIM_BASE_URL}/search?` +
                `format=json&` +
                `q=${encodeURIComponent(query)}&` +
                `limit=${limit}&` +
                `countrycodes=in&` +
                `addressdetails=1`;

            const response = await fetch(url, {
                headers: {
                    'User-Agent': this.USER_AGENT,
                },
            });

            if (!response.ok) {
                console.error('Geocoding API error:', response.status);
                return [];
            }

            const data = await response.json();

            const results: GeocodingResult[] = data.map((item: any) => ({
                displayName: item.display_name,
                location: {
                    latitude: parseFloat(item.lat),
                    longitude: parseFloat(item.lon),
                },
                address: {
                    city: item.address?.city || item.address?.town || item.address?.village,
                    state: item.address?.state,
                    country: item.address?.country,
                    road: item.address?.road,
                    suburb: item.address?.suburb,
                },
            }));

            // Cache the results
            this.searchCache.set(cacheKey, {
                results,
                timestamp: Date.now(),
            });

            return results;
        } catch (error) {
            console.error('Error fetching geocoding results:', error);
            return [];
        }
    }

    /**
     * Reverse geocode: convert coordinates to address
     * @param coordinates - Latitude and longitude
     * @returns Geocoding result with address details
     */
    async reverseGeocode(coordinates: Coordinates): Promise<GeocodingResult | null> {
        try {
            const url = `${this.NOMINATIM_BASE_URL}/reverse?` +
                `format=json&` +
                `lat=${coordinates.latitude}&` +
                `lon=${coordinates.longitude}&` +
                `addressdetails=1`;

            const response = await fetch(url, {
                headers: {
                    'User-Agent': this.USER_AGENT,
                },
            });

            if (!response.ok) {
                console.error('Reverse geocoding error:', response.status);
                return null;
            }

            const data = await response.json();

            if (data.error) {
                return null;
            }

            return {
                displayName: data.display_name,
                location: {
                    latitude: parseFloat(data.lat),
                    longitude: parseFloat(data.lon),
                },
                address: {
                    city: data.address?.city || data.address?.town || data.address?.village,
                    state: data.address?.state,
                    country: data.address?.country,
                    road: data.address?.road,
                    suburb: data.address?.suburb,
                },
            };
        } catch (error) {
            console.error('Error in reverse geocoding:', error);
            return null;
        }
    }

    /**
     * Format address for display
     * @param result - Geocoding result
     * @returns Formatted address string
     */
    formatAddress(result: GeocodingResult): string {
        const parts: string[] = [];

        if (result.address.road) parts.push(result.address.road);
        if (result.address.suburb) parts.push(result.address.suburb);
        if (result.address.city) parts.push(result.address.city);
        if (result.address.state) parts.push(result.address.state);

        return parts.length > 0 ? parts.join(', ') : result.displayName;
    }

    /**
     * Get short display name (city, state)
     * @param result - Geocoding result
     * @returns Short display name
     */
    getShortName(result: GeocodingResult): string {
        const parts: string[] = [];

        if (result.address.city) parts.push(result.address.city);
        if (result.address.state) parts.push(result.address.state);

        return parts.length > 0 ? parts.join(', ') : result.displayName.split(',')[0];
    }

    /**
     * Clear cache (useful for testing or manual refresh)
     */
    clearCache(): void {
        this.searchCache.clear();
    }
}

export const geocodingService = new GeocodingService();
