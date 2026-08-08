/**
 * @file useLayerData.js
 * @description Custom React data-fetching hook connecting 3D globe layers to the FastAPI backend API.
 * Implements initial dataset fetching, error handling, and layer-specific auto-refresh polling intervals.
 */

import { useEffect, useCallback } from 'react';
import useStore from '../store/useStore';

/** @type {string} FastAPI backend API base URL */
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

/** @type {Object.<string, number>} Polling auto-refresh intervals in milliseconds per layer */
const REFRESH_INTERVALS = {
  earthquakes: 5 * 60 * 1000,  // 5 min
  flights: 30 * 1000,           // 30 sec
  weather: 30 * 60 * 1000,      // 30 min
  countries: 24 * 60 * 60 * 1000, // 24 hours
  neo: 60 * 60 * 1000,          // 1 hour
};

/**
 * Custom hook managing network fetching and polling for a specific data layer.
 *
 * @param {string} layerName - Name of the layer ('earthquakes', 'flights', 'weather', 'neo', 'countries').
 * @returns {{data: any, loading: boolean, error: string|null, refetch: Function}} Layer state & refetch function.
 */
export function useLayerData(layerName) {
  const layer = useStore((state) => state.layers[layerName]);
  const setLayerData = useStore((state) => state.setLayerData);
  const setLayerLoading = useStore((state) => state.setLayerLoading);
  const setLayerError = useStore((state) => state.setLayerError);

  const filtersString = JSON.stringify(layer.filters);

  const refetch = useCallback(async () => {
    if (!layer.enabled) return;
    
    setLayerLoading(layerName, true);
    
    try {
      const params = new URLSearchParams();
      if (layer.filters) {
        Object.entries(layer.filters).forEach(([key, val]) => {
          if (val !== undefined && val !== null) {
            params.append(key, typeof val === 'object' ? JSON.stringify(val) : String(val));
          }
        });
      }
      const queryParams = params.toString();
      const url = `${API_URL}/layers/${layerName}${queryParams ? `?${queryParams}` : ''}`;
      
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Failed to fetch ${layerName} data`);
      
      const data = await response.json();
      setLayerData(layerName, data);
    } catch (err) {
      setLayerError(layerName, err.message);
    }
  }, [layerName, layer.enabled, filtersString, setLayerData, setLayerLoading, setLayerError]);

  useEffect(() => {
    if (!layer.enabled) return;
    
    refetch();
    
    const intervalTime = REFRESH_INTERVALS[layerName] || 60000;
    const intervalId = setInterval(refetch, intervalTime);
    
    return () => clearInterval(intervalId);
  }, [layer.enabled, layerName, refetch]);

  return {
    data: layer.data,
    loading: layer.loading,
    error: layer.error,
    refetch
  };
}
