import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { Services } from "../state/services";
import { AppProvider } from "../state/AppContext";
import { MemoryStore } from "../lib/localStore";
import App from "../App";

function fakeServices(): Services {
  const client = {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
    },
  };
  return { client, auth: {}, buddies: {}, store: new MemoryStore() } as unknown as Services;
}

vi.mock("../state/services", () => ({ createServices: () => fakeServices() }));

describe("first launch", () => {
  it("shows the avatar and welcome options without needing camera or microphone", async () => {
    const getUserMedia = vi.fn();
    Object.defineProperty(navigator, "mediaDevices", { value: { getUserMedia }, configurable: true });
    vi.stubEnv("VITE_SUPABASE_URL", "http://127.0.0.1:54321");
    vi.stubEnv("VITE_SUPABASE_ANON_KEY", "x".repeat(40));

    render(<App />);
    expect(screen.getByTestId("buddy-avatar")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("button", { name: "Create Account" })).toBeInTheDocument());
    expect(screen.getByRole("button", { name: "Restore My Buddy" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Wi-Fi settings" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Window options" })).toBeInTheDocument();
    expect(getUserMedia).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: "Create Account" }));
    expect(screen.getByRole("heading", { name: "Create your account" })).toBeInTheDocument();
  });

  it("shows a configuration error when env is missing", () => {
    vi.stubEnv("VITE_SUPABASE_URL", "");
    render(<App />);
    expect(screen.getByText("AI Buddy isn't configured")).toBeInTheDocument();
    vi.unstubAllEnvs();
  });
});

// AppProvider is exported for custom harnesses.
void AppProvider;
