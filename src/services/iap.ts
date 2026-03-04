import { Platform } from "react-native";
import { useEconomyStore } from "../state/economyStore";
import { GEM_PACKS, REVENUECAT_API_KEY_ANDROID, REVENUECAT_API_KEY_IOS } from "./iapConfig";

let configured = false;

function isPlaceholderKey(key: string) {
  return key.includes("REPLACE_WITH");
}

/** Call once, early (App.tsx), before any purchase UI is shown. */
export async function configureIAP() {
  if (configured || Platform.OS === "web") return;
  const apiKey = Platform.OS === "ios" ? REVENUECAT_API_KEY_IOS : REVENUECAT_API_KEY_ANDROID;
  if (isPlaceholderKey(apiKey)) {
    console.warn(
      "[iap] RevenueCat API key not set — add your key in src/services/iapConfig.ts. Purchases are disabled until then."
    );
    return;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Purchases = require("react-native-purchases").default;
    Purchases.configure({ apiKey });
    configured = true;
  } catch (err) {
    console.warn("[iap] failed to configure RevenueCat", err);
  }
}

export async function fetchGemOfferings() {
  if (!configured) return [];
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Purchases = require("react-native-purchases").default;
    const offerings = await Purchases.getOfferings();
    const current = offerings.current;
    if (!current) return [];
    return GEM_PACKS.map((def) => ({
      def,
      rcPackage: current.availablePackages.find(
        (p: any) => p.identifier === def.packageIdentifier
      ),
    })).filter((entry) => !!entry.rcPackage);
  } catch (err) {
    console.warn("[iap] fetchGemOfferings failed", err);
    return [];
  }
}

export async function purchaseGemPack(
  packageIdentifier: string
): Promise<{ success: boolean; gemsGranted?: number; error?: string }> {
  const def = GEM_PACKS.find((p) => p.packageIdentifier === packageIdentifier);
  if (!def) return { success: false, error: "Unknown gem pack" };

  if (!configured) {
    return {
      success: false,
      error: "In-app purchases are not configured yet. See README for RevenueCat setup.",
    };
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Purchases = require("react-native-purchases").default;
    const offerings = await Purchases.getOfferings();
    const rcPackage = offerings.current?.availablePackages.find(
      (p: any) => p.identifier === packageIdentifier
    );
    if (!rcPackage) return { success: false, error: "Offering not found" };

    await Purchases.purchasePackage(rcPackage);
    // Client-side grant on confirmed purchase. For production hardening,
    // verify the receipt server-side (e.g. a Firebase Cloud Function
    // triggered by a RevenueCat webhook) before crediting currency — see
    // README "Hardening IAP against fraud".
    useEconomyStore.getState().addGems(def.gems);
    return { success: true, gemsGranted: def.gems };
  } catch (err: any) {
    if (err?.userCancelled) return { success: false, error: "cancelled" };
    console.warn("[iap] purchase failed", err);
    return { success: false, error: err?.message ?? "Purchase failed" };
  }
}

export async function restorePurchases(): Promise<boolean> {
  if (!configured) return false;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Purchases = require("react-native-purchases").default;
    await Purchases.restorePurchases();
    return true;
  } catch (err) {
    console.warn("[iap] restore failed", err);
    return false;
  }
}

export function isIAPConfigured() {
  return configured;
}
