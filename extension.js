'use strict';

import St from 'gi://St';
import Gio from 'gi://Gio';
import GObject from 'gi://GObject';
import Clutter from 'gi://Clutter';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';

const DESATURATE_EFFECT_NAME = 'monochrome-desaturate';

const MonochromeIndicator = GObject.registerClass(
class MonochromeIndicator extends PanelMenu.Button {
    _init() {
        super._init(0.0, 'Monochrome Toggle');

        this._isMonochrome = false;

        // Create the icon for the top bar
        this._icon = new St.Icon({
            icon_name: 'applications-graphics-symbolic',
            style_class: 'system-status-icon',
        });

        this. add_child(this._icon);

        // Connect click event
        this. connect('button-press-event', () => {
            this._toggleMonochrome();
            return Clutter.EVENT_STOP;
        });
    }

    _toggleMonochrome() {
        this._isMonochrome = !this._isMonochrome;

        if (this._isMonochrome) {
            this._enableMonochrome();
        } else {
            this._disableMonochrome();
        }
    }

    _enableMonochrome() {
        // Apply desaturate effect to the entire UI
        const start_actor = Main.uiGroup;

        if (! start_actor. get_effect(DESATURATE_EFFECT_NAME)) {
            const effect = new Clutter. DesaturateEffect({ factor: 1.0 });
            start_actor.add_effect_with_name(DESATURATE_EFFECT_NAME, effect);
        }

        // Update icon to indicate active state
        this._icon.icon_name = 'applications-graphics-symbolic';
        this._icon.add_style_class_name('monochrome-active');
    }

    _disableMonochrome() {
        const start_actor = Main.uiGroup;
        start_actor.remove_effect_by_name(DESATURATE_EFFECT_NAME);

        // Update icon to indicate inactive state
        this._icon.remove_style_class_name('monochrome-active');
    }

    destroy() {
        // Clean up:  remove effect when extension is disabled
        this._disableMonochrome();
        super.destroy();
    }
});

export default class MonochromeExtension {
    constructor() {
        this._indicator = null;
    }

    enable() {
        this._indicator = new MonochromeIndicator();
        Main.panel.addToStatusArea('monochrome-toggle', this._indicator);
    }

    disable() {
        if (this._indicator) {
            this._indicator.destroy();
            this._indicator = null;
        }
    }
}