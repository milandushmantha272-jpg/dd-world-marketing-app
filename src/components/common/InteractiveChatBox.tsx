import React, { useState } from 'react';
import { Send, MessageSquare } from 'lucide-react';

export const InteractiveChatBox: React.FC<{ teamId?: string }> = ({ teamId }) => {
  const [msg, setMsg] = useState('');
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3 text-white">
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <MessageSquare className="w-4 h-4 text-amber-500" />
        <h4 className="font-bold text-xs uppercase tracking-wider">Team Chat / Live Discussion</h4>
      </div>
      <div className="h-32 bg-slate-950 rounded-lg p-3 text-xs text-slate-400 overflow-y-auto">
        <p className="italic">No messages yet. Send a message to start conversation.</p>
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Type message..."
          value={msg}
          onChange={(e) => setMsg(e.target.value)}
          className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
        />
        <button className="bg-amber-500 text-slate-950 p-2 rounded-lg hover:bg-amber-400">
          <Send className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
