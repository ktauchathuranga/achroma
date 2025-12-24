'use strict';

import St from 'gi://St';
import Gio from 'gi://Gio';
import GObject from 'gi://GObject';
import Clutter from 'gi://Clutter';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';

const EFFECT_NAME = 'achroma-effect';

const PROFILES = {
    'grayscale': {
        name:  'Grayscale',
        factor: 1.0,
        type: 'desaturate'
    },
    'soft':  {
        name: 'Soft',
        factor: 0.7,
        type: 'desaturate'
    },
    'high-contrast': {
        name:  'High Contrast',
        factor: 1.0,
        brightness: 0.1,
        contrast: 0.2,
        type: 'desaturate-contrast'
    },
    'low-brightness': {
        name: 'Low Brightness',
        factor:  1.0,
        brightness: -0.2,
        type: 'desaturate-brightness'
    },
    'sepia': {
        name: 'Sepia',
        factor: 0.8,
        type: 'sepia'
    }
};

const AchromaIndicator = GObject.registerClass(
class AchromaIndicator extends PanelMenu.Button {
    _init(settings) {
        super._init(0.0, 'Achroma Toggle');

        this._settings = settings;
        this._isActive = false;

        // Create the icon for the top bar
        this._icon = new St.Icon({
            icon_name:  'applications-graphics-symbolic',
            style_class: 'system-status-icon',
        });

        this.add_child(this._icon);

        // Connect click event - left click only for toggle
        this.connect('button-press-event', (actor, event) => {
            if (event.get_button() === 1) {
                this._toggleEffect();
                return Clutter.EVENT_STOP;
            }
            return Clutter.EVENT_PROPAGATE;
        });

        // Listen for settings changes
        this._settingsChangedId = this._settings.connect('changed:: current-profile', () => {
            if (this._isActive) {
                this._disableEffect();
                this._enableEffect();
            }
        });
    }

    _getCurrentProfile() {
        const profileKey = this._settings.get_string('current-profile');
        return PROFILES[profileKey] || PROFILES['grayscale'];
    }

    _toggleEffect() {
        this._isActive = !this._isActive;

        if (this._isActive) {
            this._enableEffect();
        } else {
            this._disableEffect();
        }
    }

    _enableEffect() {
        const profile = this._getCurrentProfile();
        const uiGroup = Main.uiGroup;

        // Remove any existing effect
        uiGroup.remove_effect_by_name(EFFECT_NAME);
        uiGroup.remove_effect_by_name(EFFECT_NAME + '-bc');
        uiGroup.remove_effect_by_name(EFFECT_NAME + '-color');

        // Apply effect based on profile type
        switch (profile.type) {
            case 'desaturate':
                this._applyDesaturate(uiGroup, profile.factor);
                break;

            case 'desaturate-contrast':
                this._applyDesaturateContrast(uiGroup, profile);
                break;

            case 'desaturate-brightness':
                this._applyDesaturateBrightness(uiGroup, profile);
                break;

            case 'sepia':
                this._applySepia(uiGroup, profile);
                break;

            default:
                this._applyDesaturate(uiGroup, 1.0);
        }

        // Update icon style
        this._icon.add_style_class_name('achroma-active');
    }

    _applyDesaturate(actor, factor) {
        const effect = new Clutter.DesaturateEffect({factor: factor});
        actor.add_effect_with_name(EFFECT_NAME, effect);
    }

    _applyDesaturateContrast(actor, profile) {
        const effect = new Clutter.DesaturateEffect({factor: profile.factor});
        actor.add_effect_with_name(EFFECT_NAME, effect);

        const bcEffect = new Clutter.BrightnessContrastEffect();
        bcEffect.set_brightness(profile.brightness || 0);
        bcEffect.set_contrast(profile.contrast || 0);
        actor.add_effect_with_name(EFFECT_NAME + '-bc', bcEffect);
    }

    _applyDesaturateBrightness(actor, profile) {
        const effect = new Clutter.DesaturateEffect({factor: profile.factor});
        actor.add_effect_with_name(EFFECT_NAME, effect);

        const bcEffect = new Clutter.BrightnessContrastEffect();
        bcEffect.set_brightness(profile.brightness || 0);
        actor.add_effect_with_name(EFFECT_NAME + '-bc', bcEffect);
    }

    _applySepia(actor, profile) {
        const effect = new Clutter.DesaturateEffect({factor: profile.factor});
        actor.add_effect_with_name(EFFECT_NAME, effect);

        const colorEffect = new Clutter.ColorizeEffect({
            tint: new Clutter.Color({
                red: 255,
                green: 220,
                blue: 180,
                alpha: 40
            })
        });
        actor.add_effect_with_name(EFFECT_NAME + '-color', colorEffect);
    }

    _disableEffect() {
        const uiGroup = Main.uiGroup;

        uiGroup.remove_effect_by_name(EFFECT_NAME);
        uiGroup.remove_effect_by_name(EFFECT_NAME + '-bc');
        uiGroup.remove_effect_by_name(EFFECT_NAME + '-color');

        this._icon.remove_style_class_name('achroma-active');
    }

    destroy() {
        if (this._settingsChangedId) {
            this._settings.disconnect(this._settingsChangedId);
            this._settingsChangedId = null;
        }
        this._disableEffect();
        super.destroy();
    }
});

export default class AchromaExtension {
    constructor(metadata) {
        this._metadata = metadata;
        this._indicator = null;
        this._settings = null;
    }

    enable() {
        this._settings = this.getSettings();
        this._indicator = new AchromaIndicator(this._settings);
        Main.panel.addToStatusArea('achroma-toggle', this._indicator);
    }

    disable() {
        if (this._indicator) {
            this._indicator.destroy();
            this._indicator = null;
        }
        this._settings = null;
    }

    getSettings() {
        const schema = 'org.gnome.shell.extensions.achroma';
        const schemaDir = this._metadata.dir.get_child('schemas');

        let schemaSource;
        if (schemaDir.query_exists(null)) {
            schemaSource = Gio.SettingsSchemaSource.new_from_directory(
                schemaDir.get_path(),
                Gio.SettingsSchemaSource.get_default(),
                false
            );
        } else {
            schemaSource = Gio.SettingsSchemaSource.get_default();
        }

        const schemaObj = schemaSource.lookup(schema, true);
        if (!schemaObj) {
            throw new Error(`Schema ${schema} not found`);
        }

        return new Gio.Settings({settings_schema: schemaObj});
    }
}
