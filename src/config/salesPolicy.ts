import type { ProductSale, UserRole } from '../types';

/**
 * DD WORLD MARKETING field-sales policy.
 *
 * Default company rule:
 * - 20 approved working days per target period.
 * - 20 verified Sayuru sales per working day (Sayuru IVR + App Activation combined).
 * - 20 verified Govi Mithuru sales per working day (Govi Mithuru IVR + App Activation combined).
 * - Team Leaders are field sellers too and are measured on their own sales separately from team totals.
 * - Shared App links / pending attempts never count as completed sales.
 */
export const DD_WORLD_SALES_POLICY = {
  workingDaysTarget: 20,
  dailyProductTarget: 20,
  products: {
    sayuru: {
      label: 'Sayuru',
      ivrCode: '#828#',
      channels: ['IVR', 'APP_ACTIVATION'] as const,
    },
    govimithuru: {
      label: 'Govi Mithuru',
      ivrCode: '#616#',
      channels: ['IVR', 'APP_ACTIVATION'] as const,
    },
  },
  eligibleRoles: ['agent', 'team_leader'] as const,
} as const;

export const monthlyProductTarget = DD_WORLD_SALES_POLICY.workingDaysTarget * DD_WORLD_SALES_POLICY.dailyProductTarget;
export const monthlyTotalTarget = monthlyProductTarget * 2;

export function isCountableVerifiedSale(sale: ProductSale): boolean {
  const status = String(sale.status || '').toUpperCase();
  const verification = String(sale.verificationStatus || '').toUpperCase();
  return (status === 'COMPLETED' || verification === 'VERIFIED') && verification !== 'REJECTED' && status !== 'CANCELLED';
}

export function isFieldSeller(role?: UserRole): boolean {
  return role === 'agent' || role === 'team_leader';
}

export function getProductSales(sales: ProductSale[], product: 'sayuru' | 'govimithuru'): ProductSale[] {
  return sales.filter((sale) => String(sale.productType).toLowerCase() === product && isCountableVerifiedSale(sale));
}

export function getSellerProductCount(sales: ProductSale[], sellerId: string, product: 'sayuru' | 'govimithuru'): number {
  return getProductSales(sales, product)
    .filter((sale) => sale.agentId === sellerId)
    .reduce((total, sale) => total + Math.max(1, Number(sale.quantity || 1)), 0);
}

export function getSellerTargetSummary(sales: ProductSale[], sellerId: string, approvedWorkingDays: number) {
  const workingDays = Math.min(DD_WORLD_SALES_POLICY.workingDaysTarget, Math.max(0, approvedWorkingDays));
  const targetPerProduct = workingDays * DD_WORLD_SALES_POLICY.dailyProductTarget;
  const sayuru = getSellerProductCount(sales, sellerId, 'sayuru');
  const govimithuru = getSellerProductCount(sales, sellerId, 'govimithuru');
  const total = sayuru + govimithuru;
  const target = targetPerProduct * 2;
  const achievement = target > 0 ? Math.min(100, Math.round((total / target) * 100)) : 0;
  return {
    workingDays,
    sayuru,
    govimithuru,
    total,
    sayuruTarget: targetPerProduct,
    govimithuruTarget: targetPerProduct,
    totalTarget: target,
    achievement,
    status: achievement >= 100 ? 'GREEN' : achievement >= 75 ? 'AMBER' : 'RED',
  } as const;
}
