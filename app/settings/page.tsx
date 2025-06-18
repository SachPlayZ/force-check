"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Settings,
  Clock,
  Calendar,
  RefreshCw,
  Save,
  AlertCircle,
  CheckCircle,
} from "lucide-react";

interface SyncSettings {
  id: string;
  cronExpression: string;
  isEnabled: boolean;
  lastSync?: string;
  nextSync?: string;
}

export default function SettingsPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<SyncSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    cronExpression: "0 2 * * *",
    isEnabled: true,
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch("/api/settings/sync");
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
        setFormData({
          cronExpression: data.cronExpression || "0 2 * * *",
          isEnabled: data.isEnabled !== false,
        });
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const response = await fetch("/api/settings/sync", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        fetchSettings();
        alert("Settings saved successfully!");
      } else {
        const error = await response.json();
        alert(error.error);
      }
    } catch (error) {
      console.error("Error saving settings:", error);
      alert("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleManualSync = async () => {
    try {
      const response = await fetch("/api/cron/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (response.ok) {
        alert("Manual sync completed successfully!");
        fetchSettings();
      } else {
        const error = await response.json();
        alert(error.error);
      }
    } catch (error) {
      console.error("Error running manual sync:", error);
      alert("Failed to run manual sync");
    }
  };

  const getCronDescription = (cronExpression: string) => {
    const parts = cronExpression.split(" ");
    if (parts.length !== 5) return "Invalid cron expression";

    const [minute, hour, day, month, weekday] = parts;

    if (
      minute === "0" &&
      hour === "2" &&
      day === "*" &&
      month === "*" &&
      weekday === "*"
    ) {
      return "Daily at 2:00 AM";
    }
    if (
      minute === "0" &&
      hour === "*/12" &&
      day === "*" &&
      month === "*" &&
      weekday === "*"
    ) {
      return "Every 12 hours";
    }
    if (
      minute === "0" &&
      hour === "*/6" &&
      day === "*" &&
      month === "*" &&
      weekday === "*"
    ) {
      return "Every 6 hours";
    }

    return cronExpression;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push("/")}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              </button>
              <div className="flex items-center space-x-3">
                <div className="bg-gray-600 p-2 rounded-lg">
                  <Settings className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Settings
                  </h1>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Manage system configuration
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Sync Settings */}
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center space-x-3">
                <RefreshCw className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                  Data Sync Settings
                </h2>
              </div>
            </div>

            <div className="p-6">
              <form onSubmit={handleSave} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Sync Frequency
                  </label>
                  <select
                    value={formData.cronExpression}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        cronExpression: e.target.value,
                      })
                    }
                    className="block w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="0 2 * * *">Daily at 2:00 AM</option>
                    <option value="0 */12 * * *">Every 12 hours</option>
                    <option value="0 */6 * * *">Every 6 hours</option>
                    <option value="0 */4 * * *">Every 4 hours</option>
                    <option value="0 */2 * * *">Every 2 hours</option>
                    <option value="0 * * * *">Every hour</option>
                  </select>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Current schedule:{" "}
                    {getCronDescription(formData.cronExpression)}
                  </p>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isEnabled"
                    checked={formData.isEnabled}
                    onChange={(e) =>
                      setFormData({ ...formData, isEnabled: e.target.checked })
                    }
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label
                    htmlFor="isEnabled"
                    className="ml-2 block text-sm text-gray-900 dark:text-white"
                  >
                    Enable automatic data sync
                  </label>
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={handleManualSync}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Run Manual Sync
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {saving ? "Saving..." : "Save Settings"}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Sync Status */}
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center space-x-3">
                <Clock className="h-6 w-6 text-green-600 dark:text-green-400" />
                <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                  Sync Status
                </h2>
              </div>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Status:
                    </span>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        settings?.isEnabled
                          ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                          : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                      }`}
                    >
                      {settings?.isEnabled ? (
                        <>
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Enabled
                        </>
                      ) : (
                        <>
                          <AlertCircle className="h-3 w-3 mr-1" />
                          Disabled
                        </>
                      )}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Schedule:
                    </span>
                    <span className="text-sm text-gray-900 dark:text-white">
                      {settings?.cronExpression
                        ? getCronDescription(settings.cronExpression)
                        : "Not set"}
                    </span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Last Sync:
                    </span>
                    <span className="text-sm text-gray-900 dark:text-white">
                      {settings?.lastSync
                        ? new Date(settings.lastSync).toLocaleString()
                        : "Never"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Next Sync:
                    </span>
                    <span className="text-sm text-gray-900 dark:text-white">
                      {settings?.nextSync
                        ? new Date(settings.nextSync).toLocaleString()
                        : "Not scheduled"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Information */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
            <div className="flex items-start space-x-3">
              <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div>
                <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">
                  About Automated Sync
                </h3>
                <div className="mt-2 text-sm text-blue-700 dark:text-blue-300 space-y-2">
                  <p>
                    The automated sync process runs according to the schedule
                    you set above. It will:
                  </p>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>
                      Fetch updated data from Codeforces for all active students
                    </li>
                    <li>
                      Update ratings, contest history, and submission data
                    </li>
                    <li>Detect inactive students (no submissions in 7 days)</li>
                    <li>
                      Send reminder emails to inactive students (if enabled)
                    </li>
                  </ul>
                  <p className="mt-3">
                    <strong>Note:</strong> You can also run a manual sync at any
                    time using the "Run Manual Sync" button above.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
