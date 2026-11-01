import { useId, type CSSProperties } from "react";
import type { Appearance } from "./avatars";
import type { AvatarState } from "./AvatarController";
import "./avatar.css";

interface Props {
  appearance: Appearance;
  state: AvatarState;
  idleAmplitude?: number;
  title?: string;
}

function Hair({ a }: { a: Appearance }) {
  const c = a.hair;
  switch (a.hairStyle) {
    case "long":
      return (
        <g>
          <path d="M118 190 Q112 90 200 82 Q288 90 282 190 L292 330 Q250 300 250 240 L150 240 Q150 300 108 330 Z" fill={c} />
          <path d="M140 150 Q170 100 240 112 Q215 140 140 160 Z" fill={c} />
        </g>
      );
    case "curly":
      return (
        <g fill={c}>
          {[130, 160, 200, 240, 270].map((x, i) => (
            <circle key={x} cx={x} cy={i % 2 ? 100 : 112} r={30} />
          ))}
          <circle cx={122} cy={150} r={22} />
          <circle cx={278} cy={150} r={22} />
        </g>
      );
    case "mohawk":
      return <path d="M176 120 L184 52 L200 74 L210 40 L222 76 L236 56 L226 124 Z" fill={c} />;
    case "bob":
      return <path d="M116 210 Q104 92 200 86 Q296 92 284 210 L262 214 Q266 140 200 132 Q134 140 138 214 Z" fill={c} />;
    case "neat":
      return <path d="M126 160 Q126 94 200 90 Q274 94 274 160 Q250 120 200 122 Q150 120 126 160 Z" fill={c} />;
    case "beard":
      return (
        <g fill={c}>
          <path d="M128 168 Q130 100 200 96 Q270 100 272 168 Q240 136 200 138 Q160 136 128 168 Z" />
          <path d="M126 200 Q130 330 200 340 Q270 330 274 200 Q262 262 200 268 Q138 262 126 200 Z" />
        </g>
      );
    default:
      return <path d="M126 168 Q122 92 200 88 Q278 92 274 168 Q258 124 200 122 Q142 124 126 168 Z" fill={c} />;
  }
}

function Accessory({ a }: { a: Appearance }) {
  switch (a.accessory) {
    case "santa-hat":
      return (
        <g className="avatar-hat">
          <path d="M122 130 Q170 30 268 60 Q300 74 312 130 Z" fill="#c62828" />
          <rect x={112} y={118} width={176} height={28} rx={14} fill="#fafafa" />
          <circle cx={312} cy={132} r={18} fill="#fafafa" />
        </g>
      );
    case "bandana":
      return (
        <g>
          <path d="M126 140 Q200 104 274 140 L274 160 Q200 128 126 160 Z" fill="#e63946" />
          <circle cx={170} cy={142} r={3} fill="#fff" />
          <circle cx={230} cy={142} r={3} fill="#fff" />
        </g>
      );
    case "glasses":
      return (
        <g fill="none" stroke="#5c4033" strokeWidth={4}>
          <circle cx={168} cy={196} r={22} />
          <circle cx={232} cy={196} r={22} />
          <path d="M190 196 L210 196" />
        </g>
      );
    default:
      return null;
  }
}

function Neckwear({ a }: { a: Appearance }) {
  switch (a.accessory) {
    case "bow-tie":
    case "bow-tie-spotty": {
      const fill = a.accessory === "bow-tie" ? "#111" : "#d62828";
      return (
        <g>
          <path d="M200 318 L168 302 L168 334 Z M200 318 L232 302 L232 334 Z" fill={fill} />
          <circle cx={200} cy={318} r={7} fill={fill} />
          {a.accessory === "bow-tie-spotty" &&
            [176, 186, 214, 224].map((x, i) => <circle key={x} cx={x} cy={i % 2 ? 324 : 312} r={3} fill="#fff" />)}
        </g>
      );
    }
    case "choker":
      return <rect x={176} y={286} width={48} height={8} rx={4} fill="#111" />;
    default:
      return null;
  }
}

function Mouth({ a, state }: { a: Appearance; state: AvatarState }) {
  const lip = a.lips ?? "#8a3b3b";
  if (state.speaking) return <ellipse className="avatar-mouth-speak" cx={200} cy={256} rx={20} ry={12} fill={lip} />;
  switch (state.expression) {
    case "smile":
      return <path d="M164 246 Q200 288 236 246 Q200 266 164 246 Z" fill={lip} />;
    case "listen":
      return <ellipse cx={200} cy={256} rx={9} ry={8} fill={lip} />;
    case "think":
      return <path d="M180 258 Q200 252 222 248" stroke={lip} strokeWidth={5} fill="none" strokeLinecap="round" />;
    default:
      return <path d="M172 250 Q200 270 228 250" stroke={lip} strokeWidth={5} fill="none" strokeLinecap="round" />;
  }
}

export function SvgAvatar({ appearance: a, state, idleAmplitude = 1, title = "Buddy" }: Props) {
  const clipId = useId();
  const browLift = state.expression === "listen" ? -6 : 0;
  const thinkBrow = state.expression === "think" ? -8 : 0;
  const style = { "--idle-amp": idleAmplitude } as CSSProperties;
  const headClass = ["avatar-head", state.expression === "listen" && "avatar-head-listen", state.expression === "think" && "avatar-head-think"]
    .filter(Boolean)
    .join(" ");

  return (
    <svg className="avatar-svg" viewBox="0 0 400 400" role="img" aria-label={title} style={style} data-expression={state.expression}>
      <defs>
        <clipPath id={clipId}>
          <circle cx={200} cy={200} r={196} />
        </clipPath>
      </defs>
      <circle cx={200} cy={200} r={196} fill={a.background} />
      <g className="avatar-body" clipPath={`url(#${clipId})`}>
        <path d="M70 400 Q80 300 200 296 Q320 300 330 400 Z" fill={a.outfit} />
        <rect x={180} y={262} width={40} height={40} fill={a.skin} />
        <Neckwear a={a} />
      </g>
      <g className="avatar-idle">
        <g className={headClass}>
          {a.hairStyle === "long" && <Hair a={a} />}
          <ellipse cx={200} cy={200} rx={76} ry={88} fill={a.skin} />
          <ellipse cx={124} cy={206} rx={10} ry={16} fill={a.skin} />
          <ellipse cx={276} cy={206} rx={10} ry={16} fill={a.skin} />
          {a.hairStyle !== "long" && <Hair a={a} />}
          {a.cheeks && (
            <g fill={a.cheeks} opacity={0.6}>
              <circle cx={150} cy={232} r={14} />
              <circle cx={250} cy={232} r={14} />
            </g>
          )}
          <g stroke="#3a2a20" strokeWidth={5} strokeLinecap="round">
            <path d={`M150 ${168 + browLift} Q168 ${160 + browLift} 184 ${168 + browLift}`} fill="none" />
            <path d={`M216 ${168 + browLift + thinkBrow} Q232 ${160 + browLift + thinkBrow} 250 ${168 + browLift + thinkBrow}`} fill="none" />
          </g>
          <g className="avatar-eyes" data-closed={state.eyesClosed}>
            {state.eyesClosed ? (
              <g stroke="#3a2a20" strokeWidth={4} strokeLinecap="round">
                <path d="M156 198 Q168 204 180 198" fill="none" />
                <path d="M220 198 Q232 204 244 198" fill="none" />
              </g>
            ) : (
              <g>
                {[168, 232].map((x) => (
                  <g key={x}>
                    <ellipse cx={x} cy={196} rx={13} ry={state.expression === "smile" ? 10 : 14} fill="#fff" />
                    <circle cx={x + (state.expression === "think" ? 4 : 0)} cy={state.expression === "think" ? 191 : 197} r={8} fill={a.eyes} />
                    <circle cx={x + 3} cy={193} r={2.5} fill="#fff" />
                    {a.eyeliner && <path d={`M${x - 15} 192 Q${x} 180 ${x + 18} 190`} stroke="#000" strokeWidth={3} fill="none" />}
                  </g>
                ))}
              </g>
            )}
          </g>
          <path d="M200 206 Q194 226 200 230" stroke="#00000033" strokeWidth={4} fill="none" strokeLinecap="round" />
          {a.moustache && <path d="M170 240 Q200 226 230 240 Q200 236 170 240 Z" fill={a.hair} />}
          <Mouth a={a} state={state} />
          <Accessory a={a} />
        </g>
      </g>
      {state.waving && (
        <g className="avatar-wave">
          <rect x={300} y={270} width={26} height={70} rx={13} fill={a.outfit} />
          <circle cx={313} cy={262} r={20} fill={a.skin} />
        </g>
      )}
      {state.expression === "think" && (
        <g className="avatar-thought" fill="#ffffffcc" stroke="#00000022">
          <circle cx={300} cy={120} r={8} />
          <circle cx={322} cy={94} r={12} />
          <circle cx={350} cy={62} r={18} />
        </g>
      )}
    </svg>
  );
}
