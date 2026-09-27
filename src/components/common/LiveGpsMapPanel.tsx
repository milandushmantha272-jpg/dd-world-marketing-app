import React, { useEffect, useMemo, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPinned, Radio, ShieldCheck, ExternalLink } from 'lucide-react';

export type LiveGpsRow = {
  id: string;
  user_id: string;
  date: string;
  status: string;
  check_in_time?: string | null;
  check_out_time?: string | null;
  gps_location?: {
    latitude?: number;
    longitude?: number;
    accuracy?: number;
    timestamp?: string;
    lastLocation?: { latitude?: number; longitude?: number; accuracy?: number; timestamp?: string };
  } | null;
};

type UserRow = { id: string; name: string; agent_code?: string | null; role: string; team_id?: string | null };
type Props = { rows: LiveGpsRow[]; users: UserRow[]; title?: string };

const icon = L.divIcon({
  className: 'dd-live-gps-marker',
  html: '<div style="width:18px;height:18px;border-radius:999px;background:#10b981;border:3px solid white;box-shadow:0 0 0 5px rgba(16,185,129,.22)"></div>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

const escapeHtml = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] || c));
const sriLankaDate = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Colombo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const formatTimestamp = (value?: string) => {
  if (!value) return 'Time unavailable';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Time unavailable';
  return new Intl.DateTimeFormat('en-LK', { timeZone: 'Asia/Colombo', dateStyle: 'medium', timeStyle: 'medium' }).format(date);
};

export const LiveGpsMapPanel: React.FC<Props> = ({ rows, users, title = 'Live GPS Map Tracking' }) => {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const markers = useRef<L.LayerGroup | null>(null);
  const today = useMemo(sriLankaDate, []);
  const activeRows = useMemo(
    () => rows.filter(r => r.date === today && Boolean(r.check_in_time) && !r.check_out_time),
    [rows, today],
  );

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;
    const map = L.map(mapRef.current, { zoomControl: true }).setView([7.8731, 80.7718], 7);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);
    markers.current = L.layerGroup().addTo(map);
    mapInstance.current = map;
    const resize = window.setTimeout(() => map.invalidateSize(), 150);
    return () => {
      window.clearTimeout(resize);
      map.remove();
      mapInstance.current = null;
      markers.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapInstance.current;
    const layer = markers.current;
    if (!map || !layer) return;
    layer.clearLayers();
    const points: L.LatLng[] = [];
    activeRows.forEach(row => {
      const gps = row.gps_location?.lastLocation || row.gps_location;
      const lat = Number(gps?.latitude);
      const lng = Number(gps?.longitude);
      // Reject missing, non-finite, and out-of-range coordinates rather than plotting a false location.
      if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) return;
      const point = L.latLng(lat, lng);
      points.push(point);
      const user = users.find(u => u.id === row.user_id);
      const accuracy = Number(gps?.accuracy);
      const timestamp = gps?.timestamp || row.gps_location?.timestamp;
      const mapsUrl = `https://www.google.com/maps?q=${encodeURIComponent(`${lat},${lng}`)}`;
      const popup = [
        `<strong>${escapeHtml(user?.name || 'Agent')}</strong>`,
        escapeHtml(user?.agent_code || ''),
        escapeHtml(user?.role || ''),
        `<b>GPS coordinates:</b> ${lat.toFixed(6)}, ${lng.toFixed(6)}`,
        `<b>Accuracy:</b> ${Number.isFinite(accuracy) && accuracy > 0 ? `${Math.round(accuracy)} m` : 'Not reported'}`,
        `<b>Last GPS update:</b> ${escapeHtml(formatTimestamp(timestamp))}`,
        `<a href="${mapsUrl}" target="_blank" rel="noopener noreferrer">Open exact point in Google Maps</a>`,
      ].filter(Boolean).join('<br>');
      L.marker(point, { icon, keyboard: true, title: user?.name || 'Agent location' }).bindPopup(popup).addTo(layer);
    });

    if (points.length === 1) map.setView(points[0], 17);
    else if (points.length > 1) map.fitBounds(L.latLngBounds(points), { padding: [30, 30], maxZoom: 16 });
    else map.setView([7.8731, 80.7718], 7);
    window.setTimeout(() => map.invalidateSize(), 50);
  }, [activeRows, users]);

  const liveCount = activeRows.filter(row => {
    const gps = row.gps_location?.lastLocation || row.gps_location;
    const lat = Number(gps?.latitude);
    const lng = Number(gps?.longitude);
    return Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
  }).length;

  return <section className="rounded-3xl border border-emerald-500/20 bg-slate-900 p-4 shadow-xl md:p-5">
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3"><div className="rounded-2xl bg-emerald-500/10 p-3 text-emerald-400"><MapPinned className="h-5 w-5" /></div><div><h2 className="text-lg font-black text-white">{title}</h2><p className="text-xs text-slate-400">GPS points from active Field Work users · Sri Lanka time</p></div></div>
      <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs font-black text-emerald-300"><Radio className="h-4 w-4 animate-pulse" />{liveCount} LOCATIONS</div>
    </div>
    <div ref={mapRef} className="h-[420px] w-full overflow-hidden rounded-2xl border border-slate-700" />
    <p className="mt-2 flex items-center gap-2 text-xs text-slate-400"><ExternalLink className="h-3.5 w-3.5 shrink-0" />Tap a map pin to see the exact GPS coordinates, accuracy, and last update time. Open the point in Google Maps for street-level context.</p>
    <div className="mt-3 flex items-start gap-2 rounded-2xl border border-slate-800 bg-slate-950/60 p-3 text-[11px] leading-5 text-slate-400"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />Location visibility must be restricted by the server to the signed-in Agent, their assigned Team Leader, or Owner according to role.</div>
  </section>;
};
