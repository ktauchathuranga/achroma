'use strict';

import Clutter from 'gi://Clutter';
import GObject from 'gi://GObject';
import St from 'gi://St';
import GLib from 'gi://GLib';
import Shell from 'gi://Shell';

import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';

import { DEFAULT_PROFILES } from './profiles.js';

// Custom tint shader that properly blends with original colors
const TintEffect = GObject.registerClass(
    class TintEffect extends Shell.GLSLEffect {
        _init(params = {}) {
            super._init();
            this._tintColor = params.tint || { r: 255, g: 220, b: 180, a: 40 };
            this._updateUniforms();
        }

        vfunc_build_pipeline() {
            const fragmentShader = `
            uniform sampler2D tex;
            uniform vec4 tint_color;
            uniform float intensity;

            void main() {
                vec4 color = texture2D(tex, cogl_tex_coord_in[0].st);
                vec3 tinted = mix(color.rgb, tint_color.rgb, intensity);
                cogl_color_out = vec4(tinted, color.a);
            }
        `;
            this.add_glsl_snippet(Shell.SnippetHook.FRAGMENT, '', fragmentShader, false);
        }

        _updateUniforms() {
            const r = this._tintColor.r / 255.0;
            const g = this._tintColor.g / 255.0;
            const b = this._tintColor.b / 255.0;
            const intensity = this._tintColor.a / 255.0;

            this.set_uniform_float(this.get_uniform_location('tint_color'), 4, [r, g, b, 1.0]);
            this.set_uniform_float(this.get_uniform_location('intensity'), 1, [intensity]);
        }

        set tint(value) {
            this._tintColor = value;
            this._updateUniforms();
            this.queue_repaint();
        }

        get tint() {
            return this._tintColor;
        }
    });

const EFFECT_DESAT = 'achroma-effect-desat';
const EFFECT_BC = 'achroma-effect-bc';
const EFFECT_TINT = 'achroma-effect-tint';

const AchromaIndicator = GObject.registerClass(
    class AchromaIndicator extends PanelMenu.Button {
        _init(extensionObject) {
            super._init(0.0, 'Achroma Toggle');

            this._extensionObject = extensionObject;
            this._settings = extensionObject.getSettings();
            this._isActive = false; // Start safe

            this._icon = new St.Icon({
                icon_name: 'applications-graphics-symbolic',
                style_class: 'system-status-icon',
            });

            this.add_child(this._icon);
            this._buildMenu();

            // 1. Standard Profile Change
            this._settingsChangedId = this._settings.connect('changed::current-profile', () => {
                this._updateMenuState();
                // Only update if we are NOT previewing. 
                // If we are previewing, the preview logic handles the display.
                if (this._isActive && !this._settings.get_boolean('is-previewing')) {
                    this._refreshEffect();
                }
            });

            // 2. Custom Profile List Change
            this._customProfilesId = this._settings.connect('changed::custom-profiles', () => {
                this._buildMenu();
            });

            // 3. Live Preview Logic
            this._previewModeId = this._settings.connect('changed::is-previewing', () => {
                const isPreviewing = this._settings.get_boolean('is-previewing');
                if (isPreviewing) {
                    // Enter Preview Mode
                    this._applyPreview();
                } else {
                    // Exit Preview Mode -> Revert to state
                    this._disableEffect(); // Clear preview
                    if (this._isActive) {
                        this._refreshEffect(); // Restore active profile if it was on
                    }
                }
            });

            this._previewDataId = this._settings.connect('changed::preview-profile', () => {
                if (this._settings.get_boolean('is-previewing')) {
                    this._applyPreview();
                }
            });
        }

        _getAllProfiles() {
            const profiles = { ...DEFAULT_PROFILES };
            try {
                const customJson = this._settings.get_string('custom-profiles');
                const customList = JSON.parse(customJson);
                customList.forEach(p => {
                    if (p.id && p.name) profiles[p.id] = p;
                });
            } catch (e) { console.error(e); }
            return profiles;
        }

        _buildMenu() {
            this.menu.removeAll();

            // Toggle
            this._toggleItem = new PopupMenu.PopupSwitchMenuItem('Enable Effect', this._isActive);
            this._toggleItem.connect('toggled', (item, state) => {
                this._isActive = state;
                if (state) {
                    this._refreshEffect();
                    this._icon.add_style_class_name('achroma-active');
                } else {
                    this._disableEffect();
                    this._icon.remove_style_class_name('achroma-active');
                }
            });
            this.menu.addMenuItem(this._toggleItem);

            this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

            // Header
            const header = new PopupMenu.PopupMenuItem('Select Profile', { reactive: false });
            header.actor.add_style_class_name('popup-subtitle-menu-item');
            this.menu.addMenuItem(header);

            // Profiles
            const profiles = this._getAllProfiles();
            const currentProfileKey = this._settings.get_string('current-profile');
            this._profileItems = {};

            for (const [key, profile] of Object.entries(profiles)) {
                const item = new PopupMenu.PopupMenuItem(profile.name);
                if (key === currentProfileKey) item.setOrnament(PopupMenu.Ornament.DOT);

                item.connect('activate', () => {
                    this._settings.set_string('current-profile', key);
                    if (!this._isActive) this._toggleItem.setToggleState(true);
                });

                this._profileItems[key] = item;
                this.menu.addMenuItem(item);
            }

            this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
            const settingsItem = new PopupMenu.PopupMenuItem('Preferences');
            settingsItem.connect('activate', () => {
                this._extensionObject.openPreferences();
            });
            this.menu.addMenuItem(settingsItem);
        }

        _updateMenuState() {
            const currentProfileKey = this._settings.get_string('current-profile');
            for (const [key, item] of Object.entries(this._profileItems || {})) {
                item.setOrnament(key === currentProfileKey ? PopupMenu.Ornament.DOT : PopupMenu.Ornament.NONE);
            }
        }

        // --- Effect Application Logic ---

        _refreshEffect() {
            const profile = this._getCurrentProfile();
            this._applyEffectData(profile);
        }

        _applyPreview() {
            try {
                const raw = this._settings.get_string('preview-profile');
                const profile = JSON.parse(raw);
                this._applyEffectData(profile);
            } catch (e) {
                console.error('Achroma: Bad preview data', e);
            }
        }

        _getCurrentProfile() {
            const profileKey = this._settings.get_string('current-profile');
            const profiles = this._getAllProfiles();
            return profiles[profileKey] || profiles['grayscale'];
        }

        _applyEffectData(profile) {
            // Always clean first to ensure clean state
            this._disableEffect();

            const uiGroup = Main.uiGroup;

            // 1. Desaturation
            if (profile.factor !== undefined) {
                // Even if factor is 0, if the user requested it in preview, we apply it.
                // But optimization: factor 0 desaturate is essentially no-op, 
                // unless we want to ensure chain consistency.
                if (profile.factor > 0) {
                    const effect = new Clutter.DesaturateEffect({ factor: profile.factor });
                    uiGroup.add_effect_with_name(EFFECT_DESAT, effect);
                }
            }

            // 2. Brightness / Contrast
            const b = profile.brightness || 0;
            const c = profile.contrast || 0;
            if (Math.abs(b) > 0.001 || Math.abs(c) > 0.001) {
                const bcEffect = new Clutter.BrightnessContrastEffect();
                bcEffect.set_brightness(b);
                bcEffect.set_contrast(c);
                uiGroup.add_effect_with_name(EFFECT_BC, bcEffect);
            }

            // 3. Tint - Use custom shader for proper blending
            if (profile.tint && profile.tint.a > 0) {
                const tintEffect = new TintEffect({ tint: profile.tint });
                uiGroup.add_effect_with_name(EFFECT_TINT, tintEffect);
            }
        }

        _disableEffect() {
            const uiGroup = Main.uiGroup;
            uiGroup.remove_effect_by_name(EFFECT_DESAT);
            uiGroup.remove_effect_by_name(EFFECT_BC);
            uiGroup.remove_effect_by_name(EFFECT_TINT);
        }

        destroy() {
            if (this._settingsChangedId) this._settings.disconnect(this._settingsChangedId);
            if (this._customProfilesId) this._settings.disconnect(this._customProfilesId);
            if (this._previewModeId) this._settings.disconnect(this._previewModeId);
            if (this._previewDataId) this._settings.disconnect(this._previewDataId);

            // Ensure we leave in a clean state
            this._disableEffect();
            // Reset preview flag just in case
            this._settings.set_boolean('is-previewing', false);

            super.destroy();
        }
    });

export default class AchromaExtension extends Extension {
    enable() {
        this._indicator = new AchromaIndicator(this);
        Main.panel.addToStatusArea('achroma-toggle', this._indicator);
    }

    disable() {
        if (this._indicator) {
            this._indicator.destroy();
            this._indicator = null;
        }
    }
}