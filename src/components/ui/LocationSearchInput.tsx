import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Loader2, Navigation as NavigationIcon, X } from 'lucide-react';
import { geocodingService, GeocodingResult } from '../../services/geocodingService';
import { geolocationService } from '../../utils/geolocation';
import { Coordinates } from '../../types';

interface LocationSearchInputProps {
    value: string;
    onChange: (value: string) => void;
    onLocationSelect: (location: Coordinates, displayName: string) => void;
    placeholder?: string;
    label?: string;
    className?: string;
}

const LocationSearchInput: React.FC<LocationSearchInputProps> = ({
    value,
    onChange,
    onLocationSelect,
    placeholder = 'Search for a location...',
    label = 'Location',
    className = '',
}) => {
    const [suggestions, setSuggestions] = useState<GeocodingResult[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [isGettingLocation, setIsGettingLocation] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const debounceTimerRef = useRef<NodeJS.Timeout>();

    // Handle click outside to close suggestions
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(event.target as Node) &&
                inputRef.current &&
                !inputRef.current.contains(event.target as Node)
            ) {
                setShowSuggestions(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Debounced search
    useEffect(() => {
        if (value.trim().length < 2) {
            setSuggestions([]);
            return;
        }

        // Clear previous timer
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }

        // Set new timer
        debounceTimerRef.current = setTimeout(async () => {
            setIsLoading(true);
            const results = await geocodingService.searchLocation(value);
            setSuggestions(results);
            setIsLoading(false);
            setShowSuggestions(true);
        }, 300); // 300ms debounce

        return () => {
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }
        };
    }, [value]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onChange(e.target.value);
        setShowSuggestions(true);
    };

    const handleSuggestionClick = (result: GeocodingResult) => {
        const shortName = geocodingService.getShortName(result);
        onChange(shortName);
        onLocationSelect(result.location, result.displayName);
        setShowSuggestions(false);
        setSuggestions([]);
    };

    const handleCurrentLocation = async () => {
        setIsGettingLocation(true);

        const coords = await geolocationService.getCurrentPosition();

        if (coords) {
            // Reverse geocode to get address
            const result = await geocodingService.reverseGeocode(coords);

            if (result) {
                const shortName = geocodingService.getShortName(result);
                onChange(shortName);
                onLocationSelect(coords, result.displayName);
                setShowSuggestions(false);
            } else {
                onChange('Current Location');
                onLocationSelect(coords, 'Current Location');
            }
        } else {
            alert('Unable to get your current location. Please check your browser settings.');
        }

        setIsGettingLocation(false);
    };

    const handleClearInput = () => {
        onChange('');
        setSuggestions([]);
        setShowSuggestions(false);
        inputRef.current?.focus();
    };

    return (
        <div className={`relative ${className}`}>
            {label && (
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    {label}
                </label>
            )}

            <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                    <MapPin size={18} />
                </div>

                <input
                    ref={inputRef}
                    type="text"
                    value={value}
                    onChange={handleInputChange}
                    onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                    placeholder={placeholder}
                    className="w-full pl-10 pr-24 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                />

                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    {value && (
                        <button
                            type="button"
                            onClick={handleClearInput}
                            className="p-1 hover:bg-gray-100 rounded transition-colors"
                            title="Clear"
                        >
                            <X size={16} className="text-gray-400" />
                        </button>
                    )}

                    <button
                        type="button"
                        onClick={handleCurrentLocation}
                        disabled={isGettingLocation}
                        className="p-1.5 hover:bg-indigo-50 rounded transition-colors text-indigo-600 disabled:opacity-50"
                        title="Use current location"
                    >
                        {isGettingLocation ? (
                            <Loader2 size={18} className="animate-spin" />
                        ) : (
                            <NavigationIcon size={18} />
                        )}
                    </button>
                </div>
            </div>

            {/* Suggestions dropdown */}
            {showSuggestions && (suggestions.length > 0 || isLoading) && (
                <div
                    ref={dropdownRef}
                    className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto"
                >
                    {isLoading ? (
                        <div className="p-4 text-center text-gray-500">
                            <Loader2 size={20} className="animate-spin mx-auto mb-2" />
                            <p className="text-sm">Searching...</p>
                        </div>
                    ) : (
                        suggestions.map((result, index) => (
                            <button
                                key={index}
                                type="button"
                                onClick={() => handleSuggestionClick(result)}
                                className="w-full px-4 py-3 text-left hover:bg-indigo-50 transition-colors border-b border-gray-100 last:border-b-0"
                            >
                                <div className="flex items-start gap-3">
                                    <MapPin size={18} className="text-indigo-600 flex-shrink-0 mt-0.5" />
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-gray-900 truncate">
                                            {geocodingService.getShortName(result)}
                                        </p>
                                        <p className="text-xs text-gray-500 truncate mt-0.5">
                                            {result.displayName}
                                        </p>
                                    </div>
                                </div>
                            </button>
                        ))
                    )}
                </div>
            )}

            {/* No results message */}
            {showSuggestions && !isLoading && value.trim().length >= 2 && suggestions.length === 0 && (
                <div
                    ref={dropdownRef}
                    className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg p-4 text-center text-gray-500"
                >
                    <p className="text-sm">No locations found for "{value}"</p>
                    <p className="text-xs mt-1">Try a different search term</p>
                </div>
            )}
        </div>
    );
};

export default LocationSearchInput;
