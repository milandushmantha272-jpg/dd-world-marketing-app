import type { ProductSale } from '../types';

export type AppActivationProductKey = 'sayuru' | 'govimithuru';

export interface AppActivationProduct {
  key: AppActivationProductKey;
  displayName: string;
  productType: ProductSale['productType'];
  playStoreUrl: string;
  channel: 'APP';
  activationMethod: 'APP_LINK_SHARE';
}

export const APP_ACTIVATION_PRODUCTS: Record<AppActivationProductKey, AppActivationProduct> = {
  sayuru: {
    key: 'sayuru',
    displayName: 'Sayuru APP Activation',
    productType: 'sayuru',
    playStoreUrl: 'https://play.google.com/store/apps/details?id=lk.dialog.sayuruapp',
    channel: 'APP',
    activationMethod: 'APP_LINK_SHARE',
  },
  govimithuru: {
    key: 'govimithuru',
    displayName: 'Govi Mithuru APP Activation',
    productType: 'govimithuru',
    playStoreUrl: 'https://play.google.com/store/apps/details?id=com.arimaclanka.android.govimithuru',
    channel: 'APP',
    activationMethod: 'APP_LINK_SHARE',
  },
};

export const APP_ACTIVATION_PRODUCT_LIST = Object.values(APP_ACTIVATION_PRODUCTS);
