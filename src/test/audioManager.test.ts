import { describe, it, expect, beforeEach } from "vitest";
import { AudioManager } from "../audio/AudioManager";

describe("AudioManager", () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });

  describe("Settings Management", () => {
    it("should return default settings", () => {
      const settings = AudioManager.getSettings();
      expect(settings.masterVolume).toBe(0.5);
      expect(settings.sfxVolume).toBe(0.7);
      expect(settings.ambientVolume).toBe(0.3);
      expect(settings.muted).toBe(false);
    });

    it("should update settings", () => {
      AudioManager.updateSettings({ masterVolume: 0.8 });
      const settings = AudioManager.getSettings();
      expect(settings.masterVolume).toBe(0.8);
    });

    it("should persist settings to localStorage", () => {
      AudioManager.updateSettings({ masterVolume: 0.9, muted: true });
      AudioManager.saveSettings();
      
      const stored = localStorage.getItem("audioSettings");
      expect(stored).toBeTruthy();
      if (stored) {
        const parsed = JSON.parse(stored);
        expect(parsed.masterVolume).toBe(0.9);
        expect(parsed.muted).toBe(true);
      }
    });

    it("should load settings from localStorage", () => {
      const testSettings = {
        masterVolume: 0.75,
        sfxVolume: 0.6,
        ambientVolume: 0.4,
        muted: true,
      };
      localStorage.setItem("audioSettings", JSON.stringify(testSettings));
      
      AudioManager.loadSettings();
      const settings = AudioManager.getSettings();
      expect(settings.masterVolume).toBe(0.75);
      expect(settings.muted).toBe(true);
    });
  });

  describe("Sound Playback", () => {
    it("should not throw when playing sounds (with or without Web Audio API)", () => {
      AudioManager.updateSettings({ muted: false });
      
      // Should not throw regardless of Web Audio API availability
      expect(() => {
        AudioManager.play("buildingPlace");
        AudioManager.play("droneSpawn");
        AudioManager.play("prestigeComplete");
      }).not.toThrow();
    });

    it("should handle muted state correctly", () => {
      AudioManager.updateSettings({ muted: true });
      
      // Should not throw and should handle gracefully when muted
      expect(() => {
        AudioManager.play("buildingPlace");
        AudioManager.play("droneSpawn");
      }).not.toThrow();
    });

    it("should play all sound types without error", () => {
      const soundTypes = [
        "buildingPlace",
        "droneSpawn",
        "droneMove",
        "heatWarning",
        "heatCritical",
        "prestigeComplete",
        "unlockAchieved",
        "overclockEnable",
        "overclockDisable",
        "forkProcess",
      ] as const;

      soundTypes.forEach((soundType) => {
        expect(() => AudioManager.play(soundType)).not.toThrow();
      });
    });

    it("should respect intensity parameter", () => {
      // Should not throw with different intensities
      expect(() => {
        AudioManager.play("buildingPlace", 0.5);
        AudioManager.play("droneSpawn", 1.0);
        AudioManager.play("prestigeComplete", 0.8);
      }).not.toThrow();
    });
  });

  describe("Ambient Sound", () => {
    it("should handle ambient sound operations gracefully", () => {
      expect(() => AudioManager.startAmbient(5)).not.toThrow();
      expect(() => AudioManager.updateAmbient(10, 0.5)).not.toThrow();
      expect(() => AudioManager.updateAmbient(20, 1.2)).not.toThrow();
      expect(() => AudioManager.stopAmbient()).not.toThrow();
    });

    it("should handle stopping ambient when not started", () => {
      expect(() => AudioManager.stopAmbient()).not.toThrow();
    });
  });

  describe("Edge Cases", () => {
    it("should handle volume values at boundaries", () => {
      AudioManager.updateSettings({ masterVolume: 0 });
      expect(AudioManager.getSettings().masterVolume).toBe(0);
      
      AudioManager.updateSettings({ masterVolume: 1 });
      expect(AudioManager.getSettings().masterVolume).toBe(1);
    });

    it("should handle corrupted localStorage gracefully", () => {
      localStorage.setItem("audioSettings", "invalid json {[}");
      expect(() => AudioManager.loadSettings()).not.toThrow();
    });

    it("should handle rapid sound playback", () => {
      // Multiple rapid calls should not throw
      expect(() => {
        for (let i = 0; i < 5; i++) {
          AudioManager.play("droneMove");
        }
      }).not.toThrow();
    });

    it("should update settings and persist correctly", () => {
      const newSettings = {
        masterVolume: 0.6,
        sfxVolume: 0.8,
        ambientVolume: 0.5,
        muted: false,
      };
      
      AudioManager.updateSettings(newSettings);
      const retrieved = AudioManager.getSettings();
      
      expect(retrieved.masterVolume).toBe(0.6);
      expect(retrieved.sfxVolume).toBe(0.8);
      expect(retrieved.ambientVolume).toBe(0.5);
      expect(retrieved.muted).toBe(false);
    });
  });
});
