// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CURRENT_SAVE_VERSION } from "../src/utils/migrations/types";

const {
  storeGetStateMock,
  storeSetStateMock,
  setAllowPersistMock,
  loggerErrorMock,
  loggerWarnMock,
  applyMigrationsMock,
  getMigrationsPathMock,
  validateSaveStructureMock,
  validateGameStateMock,
  sanitizeGameStateMock,
} = vi.hoisted(() => {
  return {
    storeGetStateMock: vi.fn(),
    storeSetStateMock: vi.fn(),
    setAllowPersistMock: vi.fn(),
    loggerErrorMock: vi.fn(),
    loggerWarnMock: vi.fn(),
    applyMigrationsMock: vi.fn(),
    getMigrationsPathMock: vi.fn(),
    validateSaveStructureMock: vi.fn(),
    validateGameStateMock: vi.fn(),
    sanitizeGameStateMock: vi.fn(),
  };
});

vi.mock("../src/store", () => {
  return {
    setAllowPersist: setAllowPersistMock,
    useGameStore: {
      getState: storeGetStateMock,
      setState: storeSetStateMock,
    },
  };
});

vi.mock("../src/utils/logger", () => {
  return {
    error: loggerErrorMock,
    warn: loggerWarnMock,
  };
});

vi.mock("../src/utils/migrations/registry", () => {
  return {
    applyMigrations: applyMigrationsMock,
    getMigrationsPath: getMigrationsPathMock,
  };
});

vi.mock("../src/utils/migrations/validation", () => {
  return {
    validateSaveStructure: validateSaveStructureMock,
    validateGameState: validateGameStateMock,
    sanitizeGameState: sanitizeGameStateMock,
  };
});

// Import after mocks are registered.
import { exportSave, importSave } from "../src/utils/saveUtils";

class MockFileReader {
  onload: ((e: ProgressEvent<FileReader>) => void) | null = null;
  onerror: ((e: ProgressEvent<FileReader>) => void) | null = null;
  static next: { kind: "load"; text: string } | { kind: "error" } = { kind: "error" };

  readAsText(_file: File) {
    if (MockFileReader.next.kind === "error") {
      this.onerror?.(new ProgressEvent("error") as ProgressEvent<FileReader>);
      return;
    }
    const ev = {
      target: { result: MockFileReader.next.text },
    } as unknown as ProgressEvent<FileReader>;
    this.onload?.(ev);
  }
}

class MockBlob {
  public readonly parts: unknown[];
  public readonly type: string | undefined;

  constructor(parts: unknown[], options?: { type?: string }) {
    this.parts = parts;
    this.type = options?.type;
  }
}

describe("saveUtils: exportSave/importSave", () => {
  const originalCreateElement = document.createElement.bind(document);

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-12-31T12:00:00.000Z"));

    vi.stubGlobal("Blob", MockBlob as never);
    (URL as unknown as { createObjectURL?: unknown }).createObjectURL = vi.fn(() => "blob:mock");
    (URL as unknown as { revokeObjectURL?: unknown }).revokeObjectURL = vi.fn();

    storeGetStateMock.mockReset();
    storeSetStateMock.mockReset();
    setAllowPersistMock.mockReset();
    loggerErrorMock.mockReset();
    loggerWarnMock.mockReset();
    applyMigrationsMock.mockReset();
    getMigrationsPathMock.mockReset();
    validateSaveStructureMock.mockReset();
    validateGameStateMock.mockReset();
    sanitizeGameStateMock.mockReset();

    vi.stubGlobal("FileReader", MockFileReader as never);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    document.createElement = originalCreateElement;
  });

  it("exportSave creates a downloadable JSON blob without actions", async () => {
    storeGetStateMock.mockReturnValue({
      credits: 123,
      prestigeLevel: 2,
      upgrades: { drones: 1 },
      addCredits: () => {},
      incrementMinedBlocks: () => {},
      setTotalBlocks: () => {},
      buyUpgrade: () => {},
      resetPrestige: () => {},
      getUpgradeCost: () => 0,
    });

    const clickSpy = vi.fn();
    const created: { href: string; download: string }[] = [];

    vi.spyOn(document, "createElement").mockImplementation((tagName: string) => {
      if (tagName === "a") {
        const a = { href: "", download: "", click: clickSpy } as unknown as HTMLAnchorElement;
        created.push(a);
        return a;
      }
      return originalCreateElement(tagName);
    });

    exportSave();

    expect((URL as never as { createObjectURL: unknown }).createObjectURL).toHaveBeenCalledTimes(1);
    const blobArg = (URL as never as { createObjectURL: unknown }).createObjectURL as unknown as {
      mock: { calls: unknown[][] };
    };
    const blob = blobArg.mock.calls[0][0] as unknown as MockBlob;
    expect(blob.type).toBe("application/json");
    const parsed = JSON.parse(String(blob.parts[0])) as {
      version: number;
      date: string;
      data: Record<string, unknown>;
    };

    expect(parsed.version).toBe(CURRENT_SAVE_VERSION);
    expect(parsed.date).toBe("2025-12-31T12:00:00.000Z");
    expect(parsed.data).toMatchObject({ credits: 123, prestigeLevel: 2, upgrades: { drones: 1 } });
    expect(parsed.data).not.toHaveProperty("addCredits");
    expect(parsed.data).not.toHaveProperty("buyUpgrade");

    expect(created).toHaveLength(1);
    expect(created[0].href).toBe("blob:mock");
    expect(created[0].download).toBe("voxel-walker-save-2025-12-31.json");
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect((URL as never as { revokeObjectURL: unknown }).revokeObjectURL).toHaveBeenCalledWith(
      "blob:mock",
    );
  });

  it("importSave rejects when structure validation fails", async () => {
    MockFileReader.next = {
      kind: "load",
      text: JSON.stringify({ version: CURRENT_SAVE_VERSION, date: "x", data: {} }),
    };

    validateSaveStructureMock.mockReturnValue({
      valid: false,
      errors: ["missing data"],
      warnings: [],
    });

    await expect(importSave(new File(["x"], "save.json"))).rejects.toThrow("Invalid save file:");
    expect(loggerErrorMock).toHaveBeenCalled();
    expect(storeSetStateMock).not.toHaveBeenCalled();
  });

  it("importSave applies migrations, warns, sanitizes, and writes to store", async () => {
    const saveData = {
      version: Math.max(0, CURRENT_SAVE_VERSION - 1),
      date: "x",
      data: { credits: 1 },
    };
    MockFileReader.next = { kind: "load", text: JSON.stringify(saveData) };

    validateSaveStructureMock.mockReturnValue({
      valid: true,
      errors: [],
      warnings: ["structure warning"],
    });

    getMigrationsPathMock.mockReturnValue(["m1"]);
    applyMigrationsMock.mockReturnValue({ credits: 2 });

    validateGameStateMock.mockReturnValue({
      valid: true,
      errors: [],
      warnings: ["state warning"],
    });

    sanitizeGameStateMock.mockReturnValue({ credits: 999 });

    await expect(importSave(new File(["x"], "save.json"))).resolves.toBeUndefined();

    expect(loggerWarnMock).toHaveBeenCalledWith("structure warning");
    expect(loggerWarnMock).toHaveBeenCalledWith("state warning");
    expect(getMigrationsPathMock).toHaveBeenCalled();
    expect(applyMigrationsMock).toHaveBeenCalledWith(saveData.data, ["m1"]);
    expect(storeSetStateMock).toHaveBeenCalledWith({ credits: 999 });
  });

  it("importSave rejects when migration throws", async () => {
    const saveData = {
      version: Math.max(0, CURRENT_SAVE_VERSION - 1),
      date: "x",
      data: { credits: 1 },
    };
    MockFileReader.next = { kind: "load", text: JSON.stringify(saveData) };

    validateSaveStructureMock.mockReturnValue({
      valid: true,
      errors: [],
      warnings: [],
    });

    getMigrationsPathMock.mockReturnValue(["m1"]);
    applyMigrationsMock.mockImplementation(() => {
      throw new Error("boom");
    });

    await expect(importSave(new File(["x"], "save.json"))).rejects.toThrow("Failed to migrate");
    expect(loggerErrorMock).toHaveBeenCalled();
    expect(storeSetStateMock).not.toHaveBeenCalled();
  });

  it("importSave rejects when game state validation fails", async () => {
    MockFileReader.next = {
      kind: "load",
      text: JSON.stringify({ version: CURRENT_SAVE_VERSION, date: "x", data: { credits: 1 } }),
    };

    validateSaveStructureMock.mockReturnValue({
      valid: true,
      errors: [],
      warnings: [],
    });

    validateGameStateMock.mockReturnValue({
      valid: false,
      errors: ["bad credits"],
      warnings: [],
    });

    await expect(importSave(new File(["x"], "save.json"))).rejects.toThrow(
      "Invalid game state in save file:",
    );
    expect(loggerErrorMock).toHaveBeenCalled();
    expect(storeSetStateMock).not.toHaveBeenCalled();
  });

  it("importSave rejects on invalid JSON", async () => {
    MockFileReader.next = { kind: "load", text: "{ not json" };

    await expect(importSave(new File(["x"], "save.json"))).rejects.toThrow();
    expect(loggerErrorMock).toHaveBeenCalledWith("Failed to import save:", expect.any(String));
  });

  it("importSave rejects when FileReader errors", async () => {
    MockFileReader.next = { kind: "error" };

    await expect(importSave(new File(["x"], "save.json"))).rejects.toThrow("Failed to read save file");
    expect(loggerErrorMock).toHaveBeenCalledWith("Failed to read save file");
  });
});
