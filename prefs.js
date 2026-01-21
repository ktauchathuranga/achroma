'use strict';

import Gtk from 'gi://Gtk';
import Adw from 'gi://Adw';
import Gdk from 'gi://Gdk';
import GLib from 'gi://GLib';

import { ExtensionPreferences } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

import { DEFAULT_PROFILE_NAMES } from './profiles.js';


export default class AchromaPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings();

        // Safety reset on load
        settings.set_boolean('is-previewing', false);

        // --- Page 1: General ---
        const page = new Adw.PreferencesPage({
            title: 'General',
            icon_name: 'preferences-system-symbolic',
        });
        window.add(page);

        // Group 1: Custom Profiles
        const customGroup = new Adw.PreferencesGroup({
            title: 'Custom Profiles',
            description: 'Create your own display effects',
        });
        page.add(customGroup);

        // Group 2: Selection
        const selectionGroup = new Adw.PreferencesGroup({
            title: 'Active Profile',
            description: 'Select the profile to apply',
        });
        page.add(selectionGroup);
        const comboRow = new Adw.ComboRow({ title: 'Current Profile' });
        selectionGroup.add(comboRow);

        // Track rows for proper cleanup
        let customRows = [];

        // Helper to refresh list
        const updateCustomList = () => {
            // Remove previously added rows
            customRows.forEach(row => {
                customGroup.remove(row);
            });
            customRows = [];

            const profiles = this._getCustomProfiles(settings);

            // Existing Profiles
            profiles.forEach((p, index) => {
                const row = new Adw.ActionRow({ title: p.name });
                const delBtn = new Gtk.Button({
                    icon_name: 'user-trash-symbolic',
                    valign: Gtk.Align.CENTER,
                });
                delBtn.add_css_class('destructive-action');
                delBtn.connect('clicked', () => {
                    const currentProfiles = this._getCustomProfiles(settings);
                    currentProfiles.splice(index, 1);
                    settings.set_string('custom-profiles', JSON.stringify(currentProfiles));
                    updateCustomList();
                    this._refreshCombo(settings, comboRow);
                });
                row.add_suffix(delBtn);
                customGroup.add(row);
                customRows.push(row);
            });

            // "New Profile" Button
            const addRow = new Adw.ActionRow({
                title: 'Create New Profile',
                subtitle: 'Configure brightness, contrast, and color',
                activatable: true
            });
            const addIcon = new Gtk.Image({ icon_name: 'list-add-symbolic' });
            addRow.add_prefix(addIcon);
            addRow.connect('activated', () => {
                this._openProfileCreator(window, settings, () => {
                    updateCustomList();
                    this._refreshCombo(settings, comboRow);
                });
            });
            customGroup.add(addRow);
            customRows.push(addRow);
        };

        // Init
        updateCustomList();
        this._refreshCombo(settings, comboRow);

        comboRow.connect('notify::selected', () => {
            const model = comboRow.get_model();
            if (!model) return;
            const item = model.get_item(comboRow.get_selected());
            if (item) settings.set_string('current-profile', item.get_string());
        });
    }

    _getCustomProfiles(settings) {
        try {
            return JSON.parse(settings.get_string('custom-profiles'));
        } catch (e) { return []; }
    }

    _refreshCombo(settings, comboRow) {
        const model = new Gtk.StringList();
        const custom = this._getCustomProfiles(settings);

        for (const key of Object.keys(DEFAULT_PROFILE_NAMES)) model.append(key);
        for (const p of custom) model.append(p.id);

        comboRow.set_model(model);

        const current = settings.get_string('current-profile');
        let found = false;
        for (let i = 0; i < model.get_n_items(); i++) {
            if (model.get_string(i) === current) {
                comboRow.set_selected(i);
                found = true;
                break;
            }
        }
        if (!found) comboRow.set_selected(0);
    }

    _openProfileCreator(parentWindow, settings, callback) {
        // --- 1. ENTER PREVIEW MODE ---
        settings.set_boolean('is-previewing', true);

        try {
            const dialog = new Gtk.Window({
                transient_for: parentWindow,
                modal: true,
                title: 'Create Custom Profile',
                default_width: 450,
                default_height: 600,
                resizable: false
            });

            // Handle Close Request (Ensure we exit preview mode)
            dialog.connect('close-request', () => {
                settings.set_boolean('is-previewing', false);
                return false; // Propagate close
            });

            const box = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL });
            const scrolled = new Gtk.ScrolledWindow({ hscrollbar_policy: Gtk.PolicyType.NEVER, vexpand: true });
            const content = new Gtk.Box({
                orientation: Gtk.Orientation.VERTICAL,
                spacing: 12,
                margin_top: 24, margin_bottom: 24, margin_start: 24, margin_end: 24
            });

            scrolled.set_child(content);
            box.append(scrolled);
            dialog.set_child(box);

            // --- Controls ---

            // Name
            const nameGroup = new Adw.PreferencesGroup();
            content.append(nameGroup);
            const nameEntry = new Adw.EntryRow({ title: 'Profile Name' });
            nameGroup.add(nameEntry);

            // Saturation
            const grayGroup = new Adw.PreferencesGroup({ title: 'Saturation' });
            content.append(grayGroup);
            const grayScale = Gtk.Scale.new_with_range(Gtk.Orientation.HORIZONTAL, 0.0, 1.0, 0.05);
            grayScale.set_value(1.0);
            grayScale.set_hexpand(true);
            const grayRow = new Adw.ActionRow({ title: 'Desaturation Level' });
            grayRow.add_suffix(grayScale);
            grayGroup.add(grayRow);

            // Exposure
            const bcGroup = new Adw.PreferencesGroup({ title: 'Exposure' });
            content.append(bcGroup);

            const brightScale = Gtk.Scale.new_with_range(Gtk.Orientation.HORIZONTAL, -1.0, 1.0, 0.05);
            brightScale.set_value(0.0);
            brightScale.set_hexpand(true);
            const brightRow = new Adw.ActionRow({ title: 'Brightness' });
            brightRow.add_suffix(brightScale);
            bcGroup.add(brightRow);

            const contrastScale = Gtk.Scale.new_with_range(Gtk.Orientation.HORIZONTAL, -1.0, 1.0, 0.05);
            contrastScale.set_value(0.0);
            contrastScale.set_hexpand(true);
            const contrastRow = new Adw.ActionRow({ title: 'Contrast' });
            contrastRow.add_suffix(contrastScale);
            bcGroup.add(contrastRow);

            // Tint
            const tintGroup = new Adw.PreferencesGroup({ title: 'Color Tint' });
            content.append(tintGroup);
            const tintSwitchRow = new Adw.SwitchRow({ title: 'Enable Color Tint' });
            tintGroup.add(tintSwitchRow);

            // --- CHANGED: Use Standard Gtk.ColorButton ---
            const colorBtn = new Gtk.ColorButton();
            const defRgba = new Gdk.RGBA();
            defRgba.parse('rgba(255, 220, 180, 1)');
            colorBtn.set_rgba(defRgba);
            colorBtn.set_valign(Gtk.Align.CENTER);

            const colorRow = new Adw.ActionRow({ title: 'Tint Color' });
            colorRow.add_suffix(colorBtn);
            tintGroup.add(colorRow);
            // ---------------------------------------------

            const alphaScale = Gtk.Scale.new_with_range(Gtk.Orientation.HORIZONTAL, 0, 255, 5);
            alphaScale.set_value(40);
            alphaScale.set_hexpand(true);
            const alphaRow = new Adw.ActionRow({ title: 'Tint Intensity' });
            alphaRow.add_suffix(alphaScale);
            tintGroup.add(alphaRow);

            // --- Action Bar ---
            const actionBar = new Gtk.ActionBar();
            box.append(actionBar);

            const cancelBtn = new Gtk.Button({ label: 'Cancel' });
            cancelBtn.connect('clicked', () => {
                dialog.close();
            });
            actionBar.pack_start(cancelBtn);

            const saveBtn = new Gtk.Button({ label: 'Save Profile' });
            saveBtn.add_css_class('suggested-action');
            saveBtn.set_sensitive(false);

            nameEntry.connect('notify::text', () => {
                saveBtn.set_sensitive(nameEntry.get_text().length > 0);
            });

            // --- Live Preview Logic ---

            const gatherData = () => {
                const tintEnabled = tintSwitchRow.get_active();
                let tintObj = null;
                if (tintEnabled) {
                    // --- CHANGED: Get color from ColorButton ---
                    const c = colorBtn.get_rgba();
                    tintObj = {
                        r: Math.round(c.red * 255),
                        g: Math.round(c.green * 255),
                        b: Math.round(c.blue * 255),
                        a: alphaScale.get_value()
                    };
                }
                return {
                    factor: grayScale.get_value(),
                    brightness: brightScale.get_value(),
                    contrast: contrastScale.get_value(),
                    tint: tintObj
                };
            };

            // Throttled update function
            let updateSourceId = 0;
            const updatePreview = () => {
                if (updateSourceId > 0) return;

                updateSourceId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 30, () => {
                    const data = gatherData();
                    settings.set_string('preview-profile', JSON.stringify(data));
                    updateSourceId = 0;
                    return GLib.SOURCE_REMOVE;
                });
            };

            const updateTintVis = () => {
                const active = tintSwitchRow.get_active();
                colorRow.set_sensitive(active);
                alphaRow.set_sensitive(active);
                updatePreview();
            };
            tintSwitchRow.connect('notify::active', updateTintVis);
            updateTintVis();

            // Connect Listeners
            grayScale.connect('value-changed', updatePreview);
            brightScale.connect('value-changed', updatePreview);
            contrastScale.connect('value-changed', updatePreview);
            alphaScale.connect('value-changed', updatePreview);
            // --- CHANGED: Listener for ColorButton ---
            colorBtn.connect('color-set', updatePreview);
            // -----------------------------------------

            saveBtn.connect('clicked', () => {
                const name = nameEntry.get_text();
                if (!name) return;

                const id = 'custom-' + Math.random().toString(36).substr(2, 9);
                const data = gatherData();

                const newProfile = {
                    id: id,
                    name: name,
                    type: 'custom',
                    factor: data.factor,
                    brightness: data.brightness,
                    contrast: data.contrast,
                    tint: data.tint
                };

                const custom = this._getCustomProfiles(settings);
                custom.push(newProfile);
                settings.set_string('custom-profiles', JSON.stringify(custom));

                settings.set_boolean('is-previewing', false);

                callback();
                dialog.destroy();
            });
            actionBar.pack_end(saveBtn);

            // Initial preview push
            updatePreview();

            dialog.present();

        } catch (e) {
            // Safety catch: if UI build fails, log error and Reset State so user isn't stuck
            console.error('Achroma Preferences Error:', e);
            settings.set_boolean('is-previewing', false);
        }
    }
}