from pathlib import Path


def replace_once(path: str, old: str, new: str):
    p = Path(path)
    s = p.read_text(encoding='utf-8')
    if old not in s:
        raise SystemExit(f'Pattern not found in {path}: {old[:120]!r}')
    p.write_text(s.replace(old, new, 1), encoding='utf-8')

replace_once('src/types.ts', "  status?: 'COMPLETED' | 'PENDING' | 'CANCELLED' | string;\n  amount?: number;", "  status?: 'COMPLETED' | 'PENDING' | 'CANCELLED' | string;\n  verificationStatus?: 'PENDING' | 'VERIFIED' | 'REJECTED' | string;\n  verifiedAt?: string;\n  verifiedBy?: string;\n  verificationNote?: string;\n  amount?: number;")

dc = Path('src/context/DataContext.tsx')
s = dc.read_text(encoding='utf-8')
s = s.replace("    appShareChannel?: 'WHATSAPP' | 'SMS' | 'QR' | 'DIRECT';\n  }) => void;\n  addIvrEntry:", "    appShareChannel?: 'WHATSAPP' | 'SMS' | 'QR' | 'DIRECT';\n    id?: string;\n    status?: ProductSale['status'];\n  }) => void;\n  updateProductSaleVerification: (saleId: string, status: 'COMPLETED' | 'PENDING' | 'CANCELLED', reviewedBy: string, note?: string) => boolean;\n  addIvrEntry:", 1)
s = s.replace("    appShareChannel?: 'WHATSAPP' | 'SMS' | 'QR' | 'DIRECT';\n  }) => {\n    const agentUser = users.find(", "    appShareChannel?: 'WHATSAPP' | 'SMS' | 'QR' | 'DIRECT';\n    id?: string;\n    status?: ProductSale['status'];\n  }) => {\n    const agentUser = users.find(", 1)
s = s.replace("      id: `sale-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,", "      id: saleData.id || `sale-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,", 1)
s = s.replace("      appShareChannel: saleData.appShareChannel,\n      status: 'COMPLETED',\n      notes: saleData.notes,", "      appShareChannel: saleData.appShareChannel,\n      status: saleData.status || 'COMPLETED',\n      verificationStatus: saleData.status === 'PENDING' ? 'PENDING' : 'VERIFIED',\n      verifiedAt: saleData.status === 'PENDING' ? undefined : new Date().toISOString(),\n      verifiedBy: saleData.status === 'PENDING' ? undefined : saleData.agentName,\n      notes: saleData.notes,", 1)
helper = """  const updateProductSaleVerification = (saleId: string, status: 'COMPLETED' | 'PENDING' | 'CANCELLED', reviewedBy: string, note?: string): boolean => {
    const existing = sales.find((sale) => sale.id === saleId);
    if (!existing) return false;
    const now = new Date().toISOString();
    const updatedSale: ProductSale = {
      ...existing,
      status,
      verificationStatus: status === 'COMPLETED' ? 'VERIFIED' : status === 'CANCELLED' ? 'REJECTED' : 'PENDING',
      verifiedAt: status === 'COMPLETED' || status === 'CANCELLED' ? now : undefined,
      verifiedBy: status === 'COMPLETED' || status === 'CANCELLED' ? reviewedBy : undefined,
      verificationNote: note,
    };
    setSales((prev) => {
      const updated = prev.map((sale) => sale.id === saleId ? updatedSale : sale);
      safeStorage.setItem(STORAGE_KEY_SALES, JSON.stringify(updated));
      return updated;
    });
    if (db) safeSetDoc(doc(db, 'sales', saleId), updatedSale, { merge: true }).catch(console.error);
    broadcastRealtimeEvent('UPDATE_SALE_VERIFICATION', updatedSale);
    return true;
  };

"""
if 'const updateProductSaleVerification = ' not in s:
    marker = "  const addIvrEntry = (entryData: {"
    if marker not in s: raise SystemExit('addIvrEntry marker not found')
    s = s.replace(marker, helper + marker, 1)
dc.write_text(s, encoding='utf-8')

p = Path('src/components/sales/IvrKeypadAndAppShareModal.tsx')
s = p.read_text(encoding='utf-8')
s = s.replace("  const { addProductSale, updateUserGps } = useData();", "  const { addProductSale, updateProductSaleVerification, updateUserGps } = useData();", 1)
s = s.replace("  const [appShareSuccess, setAppShareSuccess] = useState<string | null>(null);", "  const [appShareSuccess, setAppShareSuccess] = useState<string | null>(null);\n  const [pendingAppSaleId, setPendingAppSaleId] = useState<string | null>(null);", 1)
start = s.index("  const logAppActivationSale = ")
end = s.index("  const handleShareWhatsApp = ", start)
new_fn = """  const logAppActivationSale = (shareChannel: 'WHATSAPP' | 'SMS' | 'QR' | 'DIRECT') => {
    const productType = selectedApp === 'govimithuru' ? 'ගොවිමිතුරු' : 'සයුරු';
    const productName = `${getAppName()} [Play Store Share]`;
    const lat = currentUser.location?.latitude || 6.9271;
    const lng = currentUser.location?.longitude || 79.8612;
    const district = currentUser.location?.district || currentUser.assignedDistrict || 'Colombo';
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const pendingId = `app-pending-${currentUser.id}-${Date.now()}`;
    addProductSale({
      id: pendingId,
      agentId: currentUser.id,
      agentName: currentUser.name,
      agentCode: currentUser.agentCode || 'AG-000',
      teamId: currentUser.teamId || 'team-1',
      productType,
      productName,
      channel: 'APP',
      quantity: 1,
      customerName: undefined,
      customerMobile: undefined,
      amount: 0,
      notes: `Play Store App Share (${shareChannel}) - Pending customer installation/activation confirmation.`,
      location: `${district} (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
      latitude: lat,
      longitude: lng,
      district,
      time: timeStr,
      activationMethod: 'APP_LINK_SHARE',
      appShareChannel: shareChannel,
      status: 'PENDING',
    });
    setPendingAppSaleId(pendingId);
    setAppCustomerPhone('');
    setAppCustomerName('');
    setAppShareSuccess(`⏳ ${getAppName()} Link යවා ඇත. Sale එක තවම Count නොවේ. Customer App එක Install/Activate කළ පසු Confirm කරන්න.`);
    setTimeout(() => setAppShareSuccess(null), 6000);
  };

  const confirmAppActivation = () => {
    if (!pendingAppSaleId) {
      alert('පළමුව Customer App Link එක Share කරන්න.');
      return;
    }
    const ok = updateProductSaleVerification(pendingAppSaleId, 'COMPLETED', currentUser.name, `Customer confirmed ${getAppName()} installed/activated.`);
    if (ok) {
      setPendingAppSaleId(null);
      setAppShareSuccess('✅ Customer App activation තහවුරු විය. Sale එක දැන් Count වේ.');
      setTimeout(() => setAppShareSuccess(null), 5000);
    }
  };

"""
s = s[:start] + new_fn + s[end:]
s = s.replace("    logAppActivationSale('DIRECT');\n  };", "    // Copying a link is not a sale and does not create a pending record.\n  };")
old_btn = """            <button
              type=\"button\"
              onClick={() => logAppActivationSale('DIRECT')}
              className=\"w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition flex items-center justify-center gap-2 border border-slate-700\"
            >
              <CheckCircle2 className=\"w-4 h-4 text-emerald-400\" />
              <span>පාරිභෝගික දුරකථනයට Download කළ පසු Sale එක Count කරන්න</span>
            </button>"""
new_btn = """            <button
              type=\"button\"
              onClick={confirmAppActivation}
              disabled={!pendingAppSaleId}
              className=\"w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-200 font-bold text-xs transition flex items-center justify-center gap-2 border border-slate-700\"
            >
              <CheckCircle2 className=\"w-4 h-4 text-emerald-400\" />
              <span>{pendingAppSaleId ? 'Customer App Install / Activation OK — Sale Count කරන්න' : 'පළමුව App Link Share කරන්න'}</span>
            </button>"""
if old_btn not in s: raise SystemExit('manual app count button not found')
s = s.replace(old_btn, new_btn, 1)
p.write_text(s, encoding='utf-8')
print('FIELD_ACTIVATION_MIGRATION_OK')
