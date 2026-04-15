/**
 * RevenueCat SDK wrapper with graceful fallback for Expo Go.
 *
 * react-native-purchases requires a native build (dev client / TestFlight).
 * When running in Expo Go the native module is missing, so every function
 * degrades gracefully and logs a warning instead of crashing the app.
 */

import Constants from 'expo-constants';
import { Platform } from 'react-native';

// ---------- Dynamic import with fallback ----------
let Purchases: typeof import('react-native-purchases').default | null = null;
let PURCHASES_ERROR_CODE: typeof import('react-native-purchases').PURCHASES_ERROR_CODE | null = null;

try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const rnp = require('react-native-purchases');
  Purchases = rnp.default;
  PURCHASES_ERROR_CODE = rnp.PURCHASES_ERROR_CODE;
} catch {
  console.warn('[purchases] react-native-purchases not available — running in Expo Go?');
}

// ---------- API key resolution ----------
function getApiKey(): string {
  const extra = Constants.expoConfig?.extra;
  if (Platform.OS === 'ios') {
    return extra?.revenueCatPublicIosKey ?? '';
  }
  return extra?.revenueCatPublicAndroidKey ?? '';
}

// ---------- Helpers ----------
const SDK_UNAVAILABLE = '[purchases] SDK unavailable — native module not loaded';

function sdkAvailable(): boolean {
  if (!Purchases) {
    console.warn(SDK_UNAVAILABLE);
    return false;
  }
  return true;
}

// ---------- Public API ----------

/**
 * Configure RevenueCat with the current user. Call once after sign-in.
 */
export async function initPurchases(userId: string): Promise<void> {
  if (!sdkAvailable()) return;

  const apiKey = getApiKey();
  if (!apiKey) {
    console.warn('[purchases] No RevenueCat API key configured — skipping init');
    return;
  }

  try {
    Purchases!.configure({ apiKey, appUserID: userId });
    console.log('[purchases] Configured for user', userId);
  } catch (error) {
    console.error('[purchases] configure() failed:', error);
  }
}

/**
 * Returns the current RevenueCat offerings (packages with localized prices).
 * Returns `null` when the SDK is unavailable or the fetch fails.
 */
export async function getOfferings() {
  if (!sdkAvailable()) return null;

  try {
    const offerings = await Purchases!.getOfferings();
    return offerings;
  } catch (error) {
    console.error('[purchases] getOfferings() failed:', error);
    return null;
  }
}

/**
 * Purchase a specific package. Returns `customerInfo` on success.
 * Throws on user-cancelled so the caller can distinguish cancel vs error.
 */
export async function purchasePackage(pkg: any) {
  if (!sdkAvailable()) {
    throw new Error('Purchases SDK not available');
  }

  try {
    const result = await Purchases!.purchasePackage(pkg);
    return result;
  } catch (error: any) {
    // Let callers detect cancellation
    if (error?.userCancelled || error?.code === PURCHASES_ERROR_CODE?.PURCHASE_CANCELLED_ERROR) {
      throw { cancelled: true };
    }
    throw error;
  }
}

/**
 * Restore previous purchases (e.g. after reinstall).
 */
export async function restorePurchases() {
  if (!sdkAvailable()) return null;

  try {
    const customerInfo = await Purchases!.restorePurchases();
    return customerInfo;
  } catch (error) {
    console.error('[purchases] restorePurchases() failed:', error);
    throw error;
  }
}

/**
 * Get current customer info (active subscriptions, entitlements, etc.).
 */
export async function getCustomerInfo() {
  if (!sdkAvailable()) return null;

  try {
    const customerInfo = await Purchases!.getCustomerInfo();
    return customerInfo;
  } catch (error) {
    console.error('[purchases] getCustomerInfo() failed:', error);
    return null;
  }
}

/**
 * Log out the current RevenueCat user. Call on sign-out.
 */
export async function logOutPurchases(): Promise<void> {
  if (!sdkAvailable()) return;

  try {
    const customerInfo = await Purchases!.getCustomerInfo();
    if (!customerInfo.originalAppUserId.startsWith('$RCAnonymousID:')) {
      await Purchases!.logOut();
      console.log('[purchases] Logged out');
    }
  } catch {
    // Silently ignore — user may not have been logged in to purchases
  }
}

/**
 * Whether the native SDK is loaded. Useful for showing/hiding
 * purchase UI when running in Expo Go.
 */
export function isPurchasesAvailable(): boolean {
  return Purchases !== null;
}
