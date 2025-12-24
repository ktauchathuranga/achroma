'use strict';

import Gio from 'gi://Gio';
import Gtk from 'gi://Gtk';
import Adw from 'gi://Adw';

import {ExtensionPreferences, gettext as _} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

const PROFILES = {
    'grayscale': 'Grayscale - Standard grayscale',
    'soft':  'Soft - Subtle desaturation',
    'high-contrast': 'High Contrast - Enhanced contrast',
    'low-brightness': 'Low Brightness - Darker for night use',
    'sepia': 'Sepia - Warm vintage tone'
};

export default class AchromaPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings();

        // Create a preferences page
        const page = new Adw.PreferencesPage({
            title: 'General',
            icon_name: 'applications-graphics-symbolic',
        });
        window.add(page);

        // Create a preferences group
        const group = new Adw.PreferencesGroup({
            title: 'Profile Settings',
            description: 'Select your preferred monochrome profile',
        });
        page.add(group);

        // Create profile dropdown
        const profileRow = new Adw.ComboRow({
            title: 'Color Profile',
            subtitle: 'Choose the effect applied when toggling',
        });

        // Create string list for profiles
        const profileList = new Gtk.StringList();
        const profileKeys = Object.keys(PROFILES);

        for (const key of profileKeys) {
            profileList.append(PROFILES[key]);
        }

        profileRow.set_model(profileList);

        // Set current selection
        const currentProfile = settings.get_string('current-profile');
        const currentIndex = profileKeys.indexOf(currentProfile);
        if (currentIndex >= 0) {
            profileRow.set_selected(currentIndex);
        }

        // Connect to selection changes
        profileRow.connect('notify::selected', () => {
            const selectedIndex = profileRow.get_selected();
            const selectedKey = profileKeys[selectedIndex];
            settings.set_string('current-profile', selectedKey);
        });

        group.add(profileRow);

        // Add info group
        const infoGroup = new Adw.PreferencesGroup({
            title: 'Usage',
            description: 'How to use Achroma',
        });
        page.add(infoGroup);

        const infoRow = new Adw.ActionRow({
            title: 'Toggle Effect',
            subtitle: 'Click the icon in the top bar to toggle the monochrome effect on/off',
        });
        infoRow.add_prefix(new Gtk.Image({
            icon_name: 'input-mouse-symbolic',
            valign: Gtk.Align.CENTER,
        }));
        infoGroup.add(infoRow);
    }
}