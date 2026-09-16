import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPinned, Radio, ShieldCheck } from 'lucide-react';

export type LiveGpsRow = {
  id: string;
  user_id: string;
  date: string;
  status: string;
  check_in_time?: string | null;
  check_out_time?: string | null;
  gps_location?: { latitude?: number; longitude?: number; accuracy?: number; lastLocation?: { latitude?: number; longitude?: number; accuracy?: number; timestamp?: string } } | null;
};

type UserRow = { id: string; name: string; agent_code?: string | null; role: string; team_id?: string | null };

type Props = { rows: LiveGpsRow[]; users: UserRow[]; title?: string };

const icon = L.divIcon({
  className: 'dd-live-gps-marker',
  html: '<div style="width:18px;height:18px;border-radius:999px;background:#10b981;border:3px solid white;box-shadow:0 0 0 5px rgba(16,185,129,.22)"></div>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

export const LiveGpsMapPanel: React.FC<Props> = ({ rows, users, title = 'Live GPS Map Tracking' }) => {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const markers = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;
    const map = L.map(mapRef.current, { zoomControl: true }).setView([7.8731, 80.7718], 7);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap contributors' }).addTo(map);
    markers.current = L.layerGroup().addTo(map);
    mapInstance.current = map;
    setTimeout(() => map.invalidateSize(), 100);
    return () => { map.remove(); mapInstance.current = null; markers.current = null; };
  }, []);

  useEffect(() => {
    const map = mapInstance.current;
    const layer = markers.current;
    if (!map || !layer) return;
    layer.clearLayers();
    const points: Array<[number, number]> = [];
    rows.filter(r => r.date === new Date().toISOString().slice(0, 10) && r.check_in_time && !r.check_out_time).forEach(row => {
      const gps = row.gps_location?.lastLocation || row.gps_location;
      const lat = Number(gps?.latitude); const lng = Number(gps?.longitude);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
      points.push([lat, lng]);
      const user = users.find(u => u.id === row.user_id);
      const popup = `<strong>${user?.name || 'Agent'}</strong><br>${user?.agent_code || ''}<br>${user?.role || ''}<br>Accuracy: ${Number(gps?.accuracy || 0).toFixed(0)} m`;
      L.marker([lat, lng], { icon }).bindPopup(popup).addTo(layer);
    });
    if (points.length === 1) map.setView(points[0], 14);
    else if (points.length > 1) map.fitBounds(L.latLngBounds(points), { padding: [30, 30], maxZoom: 14 });
  }, [rows, users]);

  const active = rows.filter(r => r.date === new Date().toISOString().slice(0, 10) && r.check_in_time && !r.check_out_time && r.gps_location?.lastLocation?.latitude != null).length;

  return <section className="rounded-3xl border border-emerald-500/20 bg-slate-900 p-4 shadow-xl md:p-5">
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3"><div className="rounded-2xl bg-emerald-500/10 p-3 text-emerald-400"><MapPinned className="h-5 w-5" /></div><div><h2 className="text-lg font-black text-white">{title}</h2><p className="text-xs text-slate-400">Only active Field Work users are shown live.</p></div></div>
      <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs font-black text-emerald-300"><Radio className="h-4 w-4 animate-pulse" />{active} LIVE</div>
    </div>
    <div ref={mapRef} className="h-[420px] w-full overflow-hidden rounded-2xl border border-slate-700" />
    <div className="mt-3 flex items-start gap-2 rounded-2xl border border-slate-800 bg-slate-950/60 p-3 text-[11px] leading-5 text-slate-400"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />GPS access is role-controlled. Owner sees company live tracking; Team Leader sees only the assigned team.</div>
  </section>;
};
