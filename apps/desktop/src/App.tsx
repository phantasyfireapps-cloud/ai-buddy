import { useMemo } from "react";
import { Avatar } from "./avatar/Avatar";
import { WindowMenu } from "./components/WindowMenu";
import { readEnv } from "./lib/env";
import { AppProvider, useApp, type Screen } from "./state/AppContext";
import { createServices } from "./state/services";
import { CreateBuddy } from "./screens/CreateBuddy";
import { Customise } from "./screens/Customise";
import { ForgotPassword } from "./screens/ForgotPassword";
import { Home } from "./screens/Home";
import { Settings } from "./screens/Settings";
import { SignIn } from "./screens/SignIn";
import { SignUp } from "./screens/SignUp";
import { VerifyEmail } from "./screens/VerifyEmail";
import { Welcome } from "./screens/Welcome";
import "./styles.css";

const SCREENS: Record<Exclude<Screen, "booting">, () => React.JSX.Element | null> = {
  welcome: Welcome,
  signUp: SignUp,
  verify: VerifyEmail,
  signIn: SignIn,
  forgot: ForgotPassword,
  create: CreateBuddy,
  home: Home,
  customise: Customise,
  settings: Settings,
};

function Shell() {
  const { screen, stageAvatarId, avatar, buddy } = useApp();
  const Current = screen === "booting" ? null : SCREENS[screen];
  const compactStage = screen === "create" || screen === "customise" || screen === "settings";
  return (
    <div className={`shell ${compactStage ? "compact-stage" : ""}`} data-screen={screen}>
      <WindowMenu />
      <div className="stage" onClick={() => avatar.play("smile", { durationMs: 1500 })}>
        <Avatar avatarId={stageAvatarId} controller={avatar} className="stage-avatar" title={buddy?.name ?? "AI Buddy"} />
      </div>
      <main className="content">{Current ? <Current /> : <p className="booting">Waking up…</p>}</main>
    </div>
  );
}

function ConfigError({ error }: { error: string }) {
  return (
    <div className="shell">
      <main className="content">
        <section className="panel">
          <h1>AI Buddy isn't configured</h1>
          <p>Copy <code>.env.example</code> to <code>.env.local</code> and fill in the Supabase settings, then restart.</p>
          <pre className="config-error">{error}</pre>
        </section>
      </main>
    </div>
  );
}

export default function App() {
  const env = useMemo(() => readEnv(), []);
  const services = useMemo(() => (env.ok ? createServices(env.env) : null), [env]);
  if (!env.ok || !services) return <ConfigError error={env.ok ? "Unknown error" : env.error} />;
  return (
    <AppProvider services={services}>
      <Shell />
    </AppProvider>
  );
}
