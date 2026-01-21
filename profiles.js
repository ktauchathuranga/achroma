'use strict';

/**
 * Shared profile definitions for Achroma extension
 */

export const DEFAULT_PROFILES = {
    'grayscale': { name: 'Grayscale', factor: 1.0, type: 'preset' },
    'soft': { name: 'Soft', factor: 0.7, type: 'preset' },
    'high-contrast': { name: 'High Contrast', factor: 1.0, brightness: 0.1, contrast: 0.2, type: 'preset' },
    'low-brightness': { name: 'Low Brightness', factor: 1.0, brightness: -0.2, type: 'preset' },
    'sepia': { name: 'Sepia', factor: 0.8, tint: { r: 255, g: 220, b: 180, a: 40 }, type: 'preset' }
};

export const DEFAULT_PROFILE_NAMES = {
    'grayscale': 'Grayscale',
    'soft': 'Soft',
    'high-contrast': 'High Contrast',
    'low-brightness': 'Low Brightness',
    'sepia': 'Sepia'
};
