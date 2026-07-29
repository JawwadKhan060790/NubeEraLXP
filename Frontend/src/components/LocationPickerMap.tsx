import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { X, Search, MapPin, Check, Loader2 } from 'lucide-react';

// Leaflet's default marker icon paths break under Vite bundling unless
// re-pointed at the bundled asset URLs explicitly.
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

interface NominatimResult {
  display_name: string;
  lat: string;
  lon: string;
}

interface LocationPickerMapProps {
  isOpen: boolean;
  initialLat?: number | null;
  initialLng?: number | null;
  onClose: () => void;
  onSelect: (lat: number, lng: number) => void;
}

// Roughly centers India when no coordinate is set yet.
const DEFAULT_CENTER: [number, number] = [20.5937, 78.9629];

function ClickHandler({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

/**
 * Free, no-API-key coordinate picker built on Leaflet + OpenStreetMap tiles,
 * with address search powered by the public Nominatim geocoding service.
 * Used by Schools.tsx to let admins visually set a campus's Latitude/Longitude.
 */
const LocationPickerMap: React.FC<LocationPickerMapProps> = ({
  isOpen, initialLat, initialLng, onClose, onSelect,
}) => {
  const [marker, setMarker] = useState<[number, number] | null>(
    initialLat != null && initialLng != null ? [initialLat, initialLng] : null
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<NominatimResult[]>([]);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (isOpen) {
      setMarker(initialLat != null && initialLng != null ? [initialLat, initialLng] : null);
      setSearchQuery('');
      setSearchResults([]);
    }
  }, [isOpen, initialLat, initialLng]);

  if (!isOpen) return null;

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearching(true);
    setSearchResults([]);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=5&q=${encodeURIComponent(searchQuery)}`
      );
      const data: NominatimResult[] = await res.json();
      setSearchResults(data || []);
    } catch (err) {
      console.error('Geocoding search failed', err);
    } finally {
      setSearching(false);
    }
  };

  const flyTo = (lat: number, lng: number) => {
    setMarker([lat, lng]);
    setSearchResults([]);
    mapRef.current?.flyTo([lat, lng], 16, { duration: 0.8 });
  };

  const center: [number, number] = marker ?? DEFAULT_CENTER;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div
        className="bg-white dark:bg-[#1e293b] rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col animate-in fade-in duration-200"
        style={{ maxHeight: '85vh' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-[#283548] flex-shrink-0">
          <div>
            <h3 className="text-sm font-black text-slate-800 dark:text-white flex items-center gap-2">
              <MapPin className="w-4 h-4 text-indigo-500 dark:text-indigo-400" /> Pick Campus Location
            </h3>
            <p className="text-[11px] text-slate-400 dark:text-[#64748b] font-medium mt-0.5">
              Search an address or click anywhere on the map to drop a pin
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-[#283548]
              hover:bg-rose-50 dark:hover:bg-rose-500/15 hover:text-rose-500 dark:hover:text-rose-400 text-slate-400 dark:text-[#94a3b8] transition-all flex-shrink-0"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search */}
        <div className="px-6 py-3 border-b border-slate-100 dark:border-[#283548] relative flex-shrink-0">
          <form onSubmit={handleSearch} className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-[#64748b]" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search for an address or place..."
              className="w-full pl-10 pr-20 py-2.5 bg-slate-50 dark:bg-[#283548] border border-slate-200 dark:border-[#334155] rounded-xl
                focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-400/20 focus:border-indigo-400 transition-all
                outline-none text-sm font-medium text-slate-800 dark:text-[#f1f5f9] placeholder:text-slate-400 dark:placeholder:text-[#64748b]"
            />
            <button
              type="submit"
              disabled={searching}
              className="absolute right-1.5 top-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700
                text-white text-xs font-bold transition-all disabled:opacity-50"
            >
              {searching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Search'}
            </button>
          </form>
          {searchResults.length > 0 && (
            <div className="absolute left-6 right-6 mt-1 bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-[#334155] rounded-xl shadow-lg z-10 max-h-48 overflow-y-auto">
              {searchResults.map((r, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => flyTo(parseFloat(r.lat), parseFloat(r.lon))}
                  className="w-full text-left px-4 py-2.5 text-xs font-medium text-slate-700 dark:text-[#e2e8f0] hover:bg-indigo-50 dark:hover:bg-indigo-500/15
                    border-b border-slate-50 dark:border-[#283548] last:border-0"
                >
                  {r.display_name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Map */}
        <div className="flex-1" style={{ minHeight: 320 }}>
          <MapContainer
            center={center}
            zoom={marker ? 15 : 5}
            style={{ height: '100%', width: '100%', minHeight: 320 }}
            ref={mapRef}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <ClickHandler onPick={(lat, lng) => setMarker([lat, lng])} />
            {marker && <Marker position={marker} />}
          </MapContainer>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-slate-100 dark:border-[#283548] flex-shrink-0">
          <p className="text-xs font-mono text-slate-500 dark:text-[#94a3b8]">
            {marker ? `Lat: ${marker[0].toFixed(6)}, Lng: ${marker[1].toFixed(6)}` : 'No location selected yet'}
          </p>
          <div className="flex items-center gap-2">
            <button type="button" onClick={onClose} className="modal-btn-cancel">
              <X className="w-3.5 h-3.5" />
              <span>Cancel</span>
            </button>
            <button
              type="button"
              disabled={!marker}
              onClick={() => marker && onSelect(marker[0], marker[1])}
              className="modal-btn-save disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Use This Location</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LocationPickerMap;
