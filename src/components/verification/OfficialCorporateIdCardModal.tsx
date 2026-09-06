import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { ShieldCheck, User, IdCard, Calendar, Phone } from 'lucide-react';
import { DdWorldLogo } from '../common/DdWorldLogo';

export const OfficialCorporateIdCardModal: React.FC<{ onClose?: () => void }> = ({ onClose }) => {
  const { currentUserProfile } = useAuth();
  const { isConnected } = useData();

  if (!currentUserProfile) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl relative space-y-6 overflow-hidden">
        
        {/* Decorative Top Bar */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600" />

        {/* Header Logo */}
        <div className="flex justify-between items-center pt-2">
          <DdWorldLogo size="sm" showText={false} />
          <div className="flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
              {isConnected ? 'Verified' : 'Offline Mode'}
            </span>
          </div>
        </div>

        {/* Identity Card UI */}
        <div className="bg-slate-950 rounded-2xl p-5 border border-slate-800/80 space-y-4 shadow-inner relative group">
          <div className="flex flex-col items-center text-center space-y-3">
            
            {/* Avatar / Profile Image Placeholder */}
            <div className="relative">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 flex items-center justify-center shadow-lg group-hover:border-amber-500/50 transition-all duration-300">
                {currentUserProfile.profileImageUrl ? (
                  <img 
                    src={currentUserProfile.profileImageUrl} 
                    alt={currentUserProfile.fullName} 
                    className="w-full h-full object-cover rounded-2xl"
                  />
                ) : (
                  <User className="w-10 h-10 text-slate-500" />
                )}
              </div>
              <div className="absolute -bottom-1 -right-1 bg-amber-500 rounded-lg p-1 border-2 border-slate-950 shadow-md">
                <ShieldCheck className="w-3.5 h-3.5 text-slate-950" />
              </div>
            </div>

            {/* Profile Info */}
            <div className="space-y-1">
              <h2 className="text-base font-black text-white tracking-tight">
                {currentUserProfile.fullName || currentUserProfile.name || 'DD World Member'}
              </h2>
              <p className="text-[11px] text-amber-500 font-bold uppercase tracking-wider bg-amber-500/10 px-2.5 py-0.5 rounded-md border border-amber-500/20 inline-block">
                {currentUserProfile.roleMetadata?.displayName || 'Field Representative'}
              </p>
            </div>
          </div>

          {/* Corporate Metadata Metrics */}
          <div className="pt-2 border-t border-slate-900 space-y-2 text-xs">
            <div className="flex items-center justify-between text-slate-400">
              <div className="flex items-center gap-2">
                <IdCard className="w-3.5 h-3.5 text-slate-500" />
                <span>Employee ID</span>
              </div>
              <span className="font-mono font-bold text-white">
                {currentUserProfile.agentCode || currentUserProfile.employeeId || 'N/A'}
              </span>
            </div>

            <div className="flex items-center justify-between text-slate-400">
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-slate-500" />
                <span>Contact Number</span>
              </div>
              <span className="font-mono text-slate-300">{currentUserProfile.phoneNumber || 'N/A'}</span>
            </div>

            <div className="flex items-center justify-between text-slate-400">
              <div className="flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                <span>Issued Date</span>
              </div>
              <span className="text-slate-300">
                {currentUserProfile.createdAt 
                  ? new Date(currentUserProfile.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short' }) 
                  : 'Active'}
              </span>
            </div>
          </div>
        </div>

        {/* Actions Button */}
        {onClose && (
          <button
            onClick={onClose}
            className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs py-2.5 px-4 rounded-xl transition-all border border-slate-700/60 shadow-md active:scale-[0.98]"
          >
            Close Identity Card
          </button>
        )}
      </div>
    </div>
  );
};

export default OfficialCorporateIdCardModal;
