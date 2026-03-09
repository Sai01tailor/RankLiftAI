import { useState, useEffect } from 'react';
import { settingsAPI } from '../../api/services';
import { Save, Loader } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminDesign() {
  const [settings, setSettings] = useState({
    siteName: '',
    logoUrl: '',
    aboutUs: '',
    termsAndConditions: '',
    footerText: '',
    loginContent: '',
    signupContent: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data } = await settingsAPI.getSettings();
      if (data.settings) {
        setSettings({
            siteName: data.settings.siteName || '',
            logoUrl: data.settings.logoUrl || '',
            aboutUs: data.settings.aboutUs || '',
            termsAndConditions: data.settings.termsAndConditions || '',
            footerText: data.settings.footerText || '',
            loginContent: data.settings.loginContent || '',
            signupContent: data.settings.signupContent || ''
        });
      }
    } catch (error) {
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setSettings({ ...settings, [e.target.name]: e.target.value });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await settingsAPI.updateSettings(settings);
      toast.success('Settings updated successfully');
    } catch (error) {
      toast.error('Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader className="animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black" style={{ fontFamily: 'Space Grotesk, sans-serif', color: 'var(--text-heading)' }}>
          Design & Site Settings
        </h1>
        <button onClick={handleSave} disabled={saving} className="btn btn-primary gap-2">
          {saving ? <Loader size={16} className="animate-spin" /> : <Save size={16} />}
          Save Changes
        </button>
      </div>

      <div className="card p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>Site Name</label>
            <input
              type="text"
              name="siteName"
              value={settings.siteName}
              onChange={handleChange}
              className="input-field w-full"
              placeholder="e.g. JeeWallah"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>Logo URL</label>
            <input
              type="text"
              name="logoUrl"
              value={settings.logoUrl}
              onChange={handleChange}
              className="input-field w-full"
              placeholder="https://example.com/logo.png"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>Footer Text</label>
          <input
            type="text"
            name="footerText"
            value={settings.footerText}
            onChange={handleChange}
            className="input-field w-full"
            placeholder="© 2026 JeeWallah. All rights reserved."
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>Login Page Content</label>
          <textarea
            name="loginContent"
            value={settings.loginContent}
            onChange={handleChange}
            className="input-field w-full min-h-[80px]"
            placeholder="Welcome back content..."
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>Signup Page Content</label>
          <textarea
            name="signupContent"
            value={settings.signupContent}
            onChange={handleChange}
            className="input-field w-full min-h-[80px]"
            placeholder="Join us content..."
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>About Us</label>
          <textarea
            name="aboutUs"
            value={settings.aboutUs}
            onChange={handleChange}
            className="input-field w-full min-h-[120px]"
            placeholder="About us content..."
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>Terms and Conditions</label>
          <textarea
            name="termsAndConditions"
            value={settings.termsAndConditions}
            onChange={handleChange}
            className="input-field w-full min-h-[120px]"
            placeholder="Terms and conditions..."
          />
        </div>
      </div>
    </div>
  );
}
