import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { PushNotifications, type Token, type PushNotificationSchema, type ActionPerformed } from '@capacitor/push-notifications';
import { supabase } from './supabase';

let listenersRegistered = false;
let currentToken: string | null = null;

const isNativeAndroid = () => Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';

const saveDeviceToken = async (token: string) => {
  if (!token || token === currentToken) return;
  currentToken = token;
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return;
  const { data: profile } = await supabase.from('users').select('id').eq('auth_user_id', auth.user.id).maybeSingle();
  if (!profile) return;
  const { error } = await supabase.from('push_device_tokens').upsert({
    user_id: profile.id,
    fcm_token: token,
    platform: 'android',
    app_id: 'com.ddworld.marketing.app',
    active: true,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'fcm_token' });
  if (error) {
    currentToken = null;
    console.warn('Unable to save FCM token:', error.message);
  }
};

export const registerForPushNotifications = async (profileId: string): Promise<void> => {
  if (!isNativeAndroid() || !profileId) return;
  try {
    let permission = await PushNotifications.checkPermissions();
    if (permission.receive !== 'granted') permission = await PushNotifications.requestPermissions();
    if (permission.receive !== 'granted') return;
    await LocalNotifications.createChannel({ id: 'dd_world_marketing', name: 'DD WORLD MARKETING', description: 'DD WORLD MARKETING official notifications', importance: 5, visibility: 1, sound: 'default' });
    const localPermission = await LocalNotifications.checkPermissions();
    if (localPermission.display !== 'granted') await LocalNotifications.requestPermissions();

    if (!listenersRegistered) {
      listenersRegistered = true;
      await PushNotifications.addListener('registration', (token: Token) => { void saveDeviceToken(token.value); });
      await PushNotifications.addListener('registrationError', (error) => console.warn('FCM registration error:', error));
      await PushNotifications.addListener('pushNotificationReceived', async (notification: PushNotificationSchema) => {
        window.dispatchEvent(new CustomEvent('ddworld:push-received', { detail: notification }));
        try {
          await LocalNotifications.schedule({
            notifications: [{
              id: Math.floor(Date.now() % 2147483647),
              title: notification.title || 'DD WORLD MARKETING',
              body: notification.body || '',
              extra: notification.data || {},
              schedule: { at: new Date(Date.now() + 250) },
            }],
          });
        } catch (error) { console.warn('Foreground local notification warning:', error); }
      });
      await PushNotifications.addListener('pushNotificationActionPerformed', (action: ActionPerformed) => {
        const page = action.notification.data?.page;
        if (typeof page === 'string' && page) window.dispatchEvent(new CustomEvent('ddworld:navigate', { detail: { page } }));
      });
    }
    await PushNotifications.register();
  } catch (error) { console.warn('Push registration warning:', error); }
};

export const removeCurrentPushToken = async () => {
  if (!currentToken) return;
  await supabase.from('push_device_tokens').update({ active: false, updated_at: new Date().toISOString() }).eq('fcm_token', currentToken);
  currentToken = null;
};
