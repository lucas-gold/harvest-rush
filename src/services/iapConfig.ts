// RevenueCat *public* SDK keys — these are safe to ship in the client (they
// are not secrets; RevenueCat's dashboard has separate private keys for
// server-to-server use). Get real values from app.revenuecat.com after
// creating a project there and linking your App Store Connect / Play
// Console apps. See README "In-App Purchases setup".
export const REVENUECAT_API_KEY_IOS = "appl_REPLACE_WITH_YOUR_IOS_PUBLIC_SDK_KEY";
export const REVENUECAT_API_KEY_ANDROID = "goog_REPLACE_WITH_YOUR_ANDROID_PUBLIC_SDK_KEY";

// Package identifiers as configured in your RevenueCat "default" offering.
// Each must map to a real consumable IAP product created in App Store
// Connect and Google Play Console with matching prices.
export interface GemPackDef {
  packageIdentifier: string;
  gems: number;
  label: string;
}

export const GEM_PACKS: GemPackDef[] = [
  { packageIdentifier: "gems_small", gems: 100, label: "Handful of Gems" },
  { packageIdentifier: "gems_medium", gems: 550, label: "Sack of Gems" },
  { packageIdentifier: "gems_large", gems: 1200, label: "Crate of Gems" },
  { packageIdentifier: "gems_mega", gems: 2600, label: "Wagon of Gems" },
];
