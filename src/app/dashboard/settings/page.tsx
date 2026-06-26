"use client";

import { ProfileSection } from "@/components/settings/ProfileSection";
import { SecuritySection } from "@/components/settings/SecuritySection";
import { PreferencesSection } from "@/components/settings/PreferencesSection";
import { PrivacySection } from "@/components/settings/PrivacySection";
import { NotificationPreferencesSection } from "@/components/settings/NotificationPreferences";

export default function SettingsPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Settings</h1>
        <p className="text-sm text-slate-500 mt-0.5 dark:text-slate-400">
          Manage your account, security, privacy, and preferences.
        </p>
      </div>

      <ProfileSection />
      <SecuritySection />
      <NotificationPreferencesSection />
      <PrivacySection />
      <PreferencesSection />
    </div>
  );
}
