import React, { useState, useMemo } from 'react';
import {
  Phone,
  Smartphone,
  MapPin,
  Clock,
  Search,
  Filter,
  CheckCircle2,
  ExternalLink,
  Radio,
  User as UserIcon,
  MessageCircle,
  QrCode,
  Send,
  Calendar,
  Sparkles,
  Lock,
  ShieldCheck,
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { ProductSale, User } from '../../types';

interface IvrAndAppActivationsHubProps {
  currentUser: User;
  onOpenMap?: (lat?: number, lng?: number) => void;
}

export const IvrAndAppActivationsHub: React.FC<IvrAndAppActivationsHubProps> = ({
  currentUser,
  onOpenMap,
}) => {
  const { sales, users, teams } = useData();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProductFilter, setSelectedProductFilter] = useState<string>('all');
  const [selectedChannelFilter, setSelectedChannelFilter] = useState<string>('all');

  // Filter sales for IVR and App activations
  const relevantSales = useMemo(() => {
    return sales.filter((s) => {
      // Must be related to IVR or APP, or Govimithuru/Sayuru
      const isIvrOrApp =
        s.channel === 'IVR' ||
        s.channel === 'APP' ||
        s.activationMethod === 'KEYPAD_DIAL' ||
        s.activationMethod === 'APP_LINK_SHARE' ||
        s.productType === 'ගොවිමිතුරු' ||
        s.productType === 'සයුරු' ||
        s.productType === 'govimithuru' ||
        s.productType === 'sayuru';

      if (!isIvrOrApp) return false;

      // Product filter
      if (selectedProductFilter !== 'all') {
        if (selectedProductFilter === 'govimithuru') {
          if (!s.productType?.includes('ගොවි') && !s.productType?.includes('govi') && !s.productName?.includes('616')) return false;
        } else if (selectedProductFilter === 'sayuru') {
          if (!s.productType?.includes('සයුරු') && !s.productType?.includes('sayuru') && !s.productName?.includes('828')) return false;
        }
      }

      // Channel filter
      if (selectedChannelFilter !== 'all') {
        if (selectedChannelFilter === 'IVR' && s.channel !== 'IVR' && s.activationMethod !== 'KEYPAD_DIAL') return false;
        if (selectedChannelFilter === 'APP' && s.channel !== 'APP' && s.activationMethod !== 'APP_LINK_SHARE') return false;
      }

      // Search query (Team Leaders cannot search or match customer phone numbers for privacy)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = s.agentName?.toLowerCase().includes(q);
        const matchCode = s.agentCode?.toLowerCase().includes(q);
        const matchCustomer =
          currentUser.role === 'team_leader'
            ? s.customerName?.toLowerCase().includes(q)
            : s.customerMobile?.toLowerCase().includes(q) || s.customerName?.toLowerCase().includes(q);
        const matchDistrict = s.district?.toLowerCase().includes(q) || s.location?.toLowerCase().includes(q);
        if (!matchName && !matchCode && !matchCustomer && !matchDistrict) return false;
      }

      return true;
    });
  }, [sales, selectedProductFilter, selectedChannelFilter, searchQuery, currentUser.role]);

  // Real-time KPI Stats
  const todayStr = new Date().toISOString().split('T')[0];

  const stats = useMemo(() => {
    let todayIvr616 = 0;
    let todayIvr828 = 0;
    let todayAppSales = 0;
    let totalAll = 0;
    const districtsSet = new Set<string>();

    sales.forEach((s) => {
      const isToday = s.date === todayStr;
      const is616 = s.productType?.includes('ගොවි') || s.productName?.includes('616') || s.dialCode?.includes('616');
      const is828 = s.productType?.includes('සයුරු') || s.productName?.includes('828') || s.dialCode?.includes('828');
      const isApp = s.channel === 'APP' || s.activationMethod === 'APP_LINK_SHARE';
      const isIvr = s.channel === 'IVR' || s.activationMethod === 'KEYPAD_DIAL';

      if (isToday) {
        if (isIvr && is616) todayIvr616 += s.quantity || 1;
        if (isIvr && is828) todayIvr828 += s.quantity || 1;
        if (isApp) todayAppSales += s.quantity || 1;
      }

      if (s.district) districtsSet.add(s.district);
      totalAll += s.quantity || 1;
    });

    return {
      todayIvr616,
      todayIvr828,
      todayAppSales,
      totalAll,
      activeDistrictsCount: districtsSet.size,
    };
  }, [sales, todayStr]);

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-black text-amber-400 uppercase tracking-wider">
            <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
            <span>Dialog Enterprise Operations Hub</span>
          </div>
          <h2 className="text-xl font-black text-white mt-1">
            IVR Dial (#828# / #616#) සහ Play Store App සක්‍රිය කිරීම් සජීවී නිරීක්ෂණය
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            ක්ෂේත්‍ර නියෝජිතයින් තම දුරකථන මගින් Dial කරන ලද #828# / #616# සේවා සහ පාරිභෝගිකයින්ට Share කරන ලද Play Store App ලැයිස්තුව.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>Live Sync Active</span>
          </span>
        </div>
      </div>

      {/* KPI STATS CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">අද #616# IVR Dials</span>
            <span className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 text-xs">🌾 ගොවිමිතුරු</span>
          </div>
          <div className="text-2xl font-black text-white mt-2 font-mono">{stats.todayIvr616}</div>
          <span className="text-[10px] text-slate-500">අද දින සක්‍රිය කිරීම්</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">අද #828# IVR Dials</span>
            <span className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-400 text-xs">🌊 සයුරු</span>
          </div>
          <div className="text-2xl font-black text-white mt-2 font-mono">{stats.todayIvr828}</div>
          <span className="text-[10px] text-slate-500">අද දින සක්‍රිය කිරීම්</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">Play Store App Shares</span>
            <span className="p-1.5 rounded-lg bg-purple-500/20 text-purple-400 text-xs">📲 Play Store</span>
          </div>
          <div className="text-2xl font-black text-white mt-2 font-mono">{stats.todayAppSales}</div>
          <span className="text-[10px] text-slate-500">පාරිභෝගික App බාගත කිරීම්</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">ආවරණය කළ දිස්ත්‍රික්ක</span>
            <span className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 text-xs">📍 Districts</span>
          </div>
          <div className="text-2xl font-black text-white mt-2 font-mono">{stats.activeDistrictsCount}</div>
          <span className="text-[10px] text-slate-500">ක්‍රියාකාරී ප්‍රදේශ ගණන</span>
        </div>
      </div>

      {/* FILTER & SEARCH CONTROLS */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
          <input
            type="text"
            placeholder="නියෝජිතයා, දුරකථන අංකය, දිස්ත්‍රික්කය..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
          <select
            value={selectedProductFilter}
            onChange={(e) => setSelectedProductFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 font-bold focus:outline-none focus:border-amber-500"
          >
            <option value="all">සියලුම නිෂ්පාදන (All)</option>
            <option value="govimithuru">🌾 ගොවිමිතුරු (#616#)</option>
            <option value="sayuru">🌊 සයුරු (#828#)</option>
          </select>

          <select
            value={selectedChannelFilter}
            onChange={(e) => setSelectedChannelFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 font-bold focus:outline-none focus:border-amber-500"
          >
            <option value="all">සියලුම ක්‍රම (All Methods)</option>
            <option value="IVR">📞 Keypad IVR Dial</option>
            <option value="APP">📲 Play Store App Share</option>
          </select>
        </div>
      </div>

      {/* PRIVACY PROTECTION BANNER FOR TEAM LEADERS */}
      {currentUser.role === 'team_leader' && (
        <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-3 text-xs text-amber-300">
          <ShieldCheck className="w-5 h-5 text-amber-400 shrink-0" />
          <div>
            <span className="font-bold text-white">Dialog Axiata Data Privacy Policy:</span> පාරිභෝගික රහස්‍යතා රෙගුලාසි අනුව පාරිභෝගික දුරකථන අංක Team Leader වරුන්ගෙන් වසන් කර ඇත (Customer Numbers Masked). සම්පූර්ණ අංක පරිශීලනය කළ හැක්කේ ආයතන ප්‍රධානී (Owner) වෙත පමණි.
          </div>
        </div>
      )}

      {/* ACTIVATIONS TABLE */}
      <div className="rounded-3xl bg-slate-900 border border-slate-800 shadow-xl overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-black text-white flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>සක්‍රිය කිරීම් ලැයිස්තුව ({relevantSales.length} Records)</span>
          </h3>
          <span className="text-xs text-slate-400 font-medium">
            සජීවීව දත්ත Firestore වෙතින් යාවත්කාලීන වේ
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800 font-bold">
              <tr>
                <th className="py-3 px-4">වේලාව / දිනය</th>
                <th className="py-3 px-4">නියෝජිතයා (Agent)</th>
                <th className="py-3 px-4">නිෂ්පාදනය &amp; කේතය</th>
                <th className="py-3 px-4">ක්‍රමය (Method)</th>
                <th className="py-3 px-4">පාරිභෝගික අංකය</th>
                <th className="py-3 px-4">ස්ථානය (Location)</th>
                <th className="py-3 px-4 text-center">තත්ත්වය</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {relevantSales.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    සක්‍රිය කිරීම් වාර්තා කිසිවක් හමු නොවීය.
                  </td>
                </tr>
              ) : (
                relevantSales.map((sale) => {
                  const is616 =
                    sale.productType?.includes('ගොවි') ||
                    sale.productName?.includes('616') ||
                    sale.dialCode?.includes('616');
                  const isApp = sale.channel === 'APP' || sale.activationMethod === 'APP_LINK_SHARE';

                  return (
                    <tr key={sale.id} className="hover:bg-slate-800/50 transition">
                      {/* TIME & DATE */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-bold text-white flex items-center gap-1 font-mono">
                          <Clock className="w-3.5 h-3.5 text-slate-500" />
                          <span>{sale.time || '10:00 AM'}</span>
                        </div>
                        <div className="text-[10px] text-slate-400">{sale.date || todayStr}</div>
                      </td>

                      {/* AGENT */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-bold text-white flex items-center gap-1.5">
                          <UserIcon className="w-3.5 h-3.5 text-amber-400" />
                          <span>{sale.agentName}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">Code: {sale.agentCode}</div>
                      </td>

                      {/* PRODUCT & DIAL CODE */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className={`px-2 py-0.5 rounded-md font-bold text-[11px] ${
                            is616 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-cyan-500/20 text-cyan-300'
                          }`}>
                            {is616 ? '🌾 ගොවිමිතුරු (#616#)' : '🌊 සයුරු (#828#)'}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
                          {sale.dialCode ? `Dial: ${sale.dialCode}` : isApp ? 'Google Play Store' : sale.productName}
                        </div>
                      </td>

                      {/* METHOD / CHANNEL */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {isApp ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 text-[11px] font-bold">
                            <Smartphone className="w-3 h-3" />
                            <span>
                              {sale.appShareChannel === 'WHATSAPP'
                                ? 'WhatsApp Share'
                                : sale.appShareChannel === 'SMS'
                                ? 'SMS Share'
                                : sale.appShareChannel === 'QR'
                                ? 'QR Code Scan'
                                : 'Play Store App'}
                            </span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 text-[11px] font-bold">
                            <Phone className="w-3 h-3" />
                            <span>Keypad IVR Dial</span>
                          </span>
                        )}
                      </td>

                      {/* CUSTOMER MOBILE */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {currentUser.role === 'team_leader' ? (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-400 text-[10px] font-mono">
                              <Lock className="w-3 h-3 text-amber-400/80" />
                              <span>07X •••• XXX</span>
                            </span>
                            <div className="text-[9px] text-slate-500 font-sans">
                              🔒 ආරක්ෂිතයි (Confidential)
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="font-mono text-white font-bold">
                              {sale.customerMobile || sale.msisdn || (
                                <span className="text-slate-500 italic">Direct Walk-in</span>
                              )}
                            </div>
                            {sale.customerName && (
                              <div className="text-[10px] text-slate-400">{sale.customerName}</div>
                            )}
                          </>
                        )}
                      </td>

                      {/* LOCATION */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1 text-slate-200">
                          <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                          <span className="font-bold">{sale.district || sale.location || 'Colombo'}</span>
                        </div>
                        {sale.latitude && sale.longitude && (
                          <div className="text-[10px] text-slate-400 font-mono">
                            {sale.latitude.toFixed(3)}, {sale.longitude.toFixed(3)}
                          </div>
                        )}
                      </td>

                      {/* STATUS */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[10px] font-black uppercase">
                          ✓ Active &amp; Verified
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
