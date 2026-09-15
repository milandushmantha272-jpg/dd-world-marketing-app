export interface SummaryBreakdown {
  week1: number;
  week2: number;
  week3: number;
  week4: number;
  monthlyTotal: number;
}

export interface AttendanceSummaryBreakdown {
  week1Present: number;
  week2Present: number;
  week3Present: number;
  week4Present: number;
  monthlyPresent: number;
  totalRecords: number;
}

export interface SalesSummaryBreakdown {
  week1Count: number;
  week2Count: number;
  week3Count: number;
  week4Count: number;
  monthlyCount: number;
  week1Quantity: number;
  week2Quantity: number;
  week3Quantity: number;
  week4Quantity: number;
  monthlyQuantity: number;
}

const isActiveSale = (record: any) => {
  const status = String(record?.verificationStatus || record?.status || '').toLowerCase();
  return ['active', 'verified', 'confirmed', 'completed'].includes(status);
};

/** Calculates weekly & monthly summary for attendance records. */
export function getAttendanceSummary(
  records: Array<{ date?: string; timestamp?: string; status: string }>,
  targetMonthYear?: string
): AttendanceSummaryBreakdown {
  const now = new Date();
  const currentMonthStr = targetMonthYear || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  let week1 = 0, week2 = 0, week3 = 0, week4 = 0, monthly = 0, total = 0;
  records.forEach((r) => {
    const rawDate = r.date || r.timestamp || '';
    if (!rawDate) return;
    const recordDateStr = rawDate.split('T')[0];
    if (recordDateStr.startsWith(currentMonthStr) || !recordDateStr.includes('-')) {
      total++;
      const day = parseInt(recordDateStr.split('-')[2] || '1', 10);
      const isPresent = r.status === 'present' || r.status === 'half_day';
      if (isPresent) {
        monthly++;
        if (day <= 7) week1++;
        else if (day <= 14) week2++;
        else if (day <= 21) week3++;
        else week4++;
      }
    }
  });
  return { week1Present: week1, week2Present: week2, week3Present: week3, week4Present: week4, monthlyPresent: monthly, totalRecords: total };
}

/** Calculates 4 calendar-week + monthly sales using only Active/Verified records. */
export function getSalesSummary(
  records: Array<{ date?: string; timestamp?: string; quantity?: number; status?: string; verificationStatus?: string }>,
  targetMonthYear?: string
): SalesSummaryBreakdown {
  const now = new Date();
  const currentMonthStr = targetMonthYear || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  let w1Count = 0, w2Count = 0, w3Count = 0, w4Count = 0, mCount = 0;
  let w1Qty = 0, w2Qty = 0, w3Qty = 0, w4Qty = 0, mQty = 0;
  records.forEach((r) => {
    if (!isActiveSale(r)) return;
    const rawDate = r.date || r.timestamp || '';
    if (!rawDate) return;
    const recordDateStr = rawDate.split('T')[0];
    if (!recordDateStr.startsWith(currentMonthStr) && recordDateStr.includes('-')) return;
    const day = parseInt(recordDateStr.split('-')[2] || '1', 10);
    const value = Number(r.quantity) || 1;
    mCount++;
    mQty += value;
    if (day <= 7) { w1Count++; w1Qty += value; }
    else if (day <= 14) { w2Count++; w2Qty += value; }
    else if (day <= 21) { w3Count++; w3Qty += value; }
    else { w4Count++; w4Qty += value; }
  });
  return { week1Count: w1Count, week2Count: w2Count, week3Count: w3Count, week4Count: w4Count, monthlyCount: mCount, week1Quantity: w1Qty, week2Quantity: w2Qty, week3Quantity: w3Qty, week4Quantity: w4Qty, monthlyQuantity: mQty };
}
