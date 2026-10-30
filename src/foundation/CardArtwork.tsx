import type { ReactNode } from "react";
import type { ChronicleCard } from "./foundationTypes";

/**
 * Lightweight original heraldic emblems.
 * Each existing card receives its own motif instead of sharing a rook/star placeholder.
 * This is presentation only; combat data and card definitions are not changed.
 */
type Motif =
  | "sword" | "shield" | "bow" | "staff" | "sun" | "banner"
  | "cloud" | "knight" | "ship" | "spear" | "scout" | "horse"
  | "fort" | "mask" | "horn" | "crest" | "crossbow" | "scroll"
  | "bell" | "wing" | "crown" | "axe" | "moon" | "hourglass";

const MOTIFS: Record<string, Motif> = {
  U001: "sword",
  U002: "shield",
  U003: "bow",
  U004: "staff",
  S001: "sun",
  S002: "banner",
  S003: "cloud",
  L001: "knight",
  M001: "ship",
  U005: "spear",
  U006: "scout",
  R001: "horse",
  R002: "fort",
  R003: "mask",
  R004: "horn",
  H001: "crest",
  H002: "crossbow",
  H003: "scroll",
  H004: "bell",
  H005: "wing",
  L002: "crown",
  L003: "axe",
  M002: "moon",
  T001: "hourglass",
};

function motifPath(motif: Motif): ReactNode {
  switch (motif) {
    case "sword": return <>
      <path d="M60 16v66M49 77h22M60 82v19" />
      <path d="M51 18 60 7 69 18 66 64 60 72 54 64Z" fill="currentColor" fillOpacity=".18" />
      <path d="m42 80 18-3 18 3" /><circle cx="60" cy="89" r="5"/>
    </>;
    case "shield": return <>
      <path d="M60 13 92 25v28c0 23-12 37-32 49C40 90 28 76 28 53V25Z" fill="currentColor" fillOpacity=".12" />
      <path d="M60 22v65M37 52h46"/><path d="M40 34 60 26l20 8" />
    </>;
    case "bow": return <>
      <path d="M45 13C12 31 12 84 45 104M45 13 45 104M17 59h76M79 48l15 11-15 11" />
      <path d="M33 31q13 26 0 56" strokeOpacity=".35" />
    </>;
    case "staff": return <>
      <path d="M58 33v68M44 38q-13-12 0-23l17 4 15-5q12 12-1 25l-17 7Z" fill="currentColor" fillOpacity=".12"/>
      <path d="M58 30 46 21l12-11 12 11Z" /><path d="M45 83h27"/>
    </>;
    case "sun": return <>
      <circle cx="60" cy="57" r="20" fill="currentColor" fillOpacity=".15" />
      <path d="M60 9v18M60 87v18M12 57h18M90 57h18M27 24l13 13M80 77l13 13M93 24 80 37M40 77 27 90" />
      <path d="M47 57h26M60 44v26" />
    </>;
    case "banner": return <>
      <path d="M36 104V18M36 23q18-10 34 2 14 11 24 2v43q-10 9-24-2-16-11-34-2" fill="currentColor" fillOpacity=".15" />
      <path d="m51 46 11-7 11 7-4 12H55Z" /><path d="M24 104h25"/>
    </>;
    case "cloud": return <>
      <path d="M28 71c-17 0-19-27-2-31q0-24 25-23c17-13 39 1 37 17 18-2 27 26 11 37Z" fill="currentColor" fillOpacity=".12"/>
      <path d="m35 49 14 16-12 22m43-43-18 24 18 19" /><path d="M50 94h34" />
    </>;
    case "knight": return <>
      <path d="M28 101V46l17-9 12-19 24 11 12 30-11 42Z" fill="currentColor" fillOpacity=".12"/>
      <path d="M46 37v-15l20-12 13 13M31 51h58M46 67h29M43 80l17 15 17-15" />
      <path d="M60 55v41" />
    </>;
    case "ship": return <>
      <path d="M15 74h91L91 98H34Z" fill="currentColor" fillOpacity=".14"/>
      <path d="M60 12v65M59 18 25 68h35ZM64 24l27 42H64Z" />
      <path d="M20 104q10 8 20 0t20 0 20 0 20 0" />
      <circle cx="60" cy="8" r="4"/>
    </>;
    case "spear": return <>
      <path d="M60 27v78M60 7 46 36l14 13 14-13Z" fill="currentColor" fillOpacity=".16"/>
      <path d="M35 84 60 92l25-8M43 99h34" />
    </>;
    case "scout": return <>
      <circle cx="57" cy="56" r="27" fill="currentColor" fillOpacity=".12"/>
      <path d="M57 28v56M29 56h56M38 75 79 35M74 79l20 20" />
      <path d="M55 43l14 14-14 14-14-14Z" />
    </>;
    case "horse": return <>
      <path d="m35 96 9-38-13-16 22-24 18-4 8 14-7 14 16 20-3 34Z" fill="currentColor" fillOpacity=".14"/>
      <path d="m53 18 11 21 19 10M43 72h37M28 96h68"/>
      <circle cx="64" cy="30" r="2" fill="currentColor"/>
    </>;
    case "fort": return <>
      <path d="M29 101V40h11V26h13v14h15V26h13v14h11v61Z" fill="currentColor" fillOpacity=".13"/>
      <path d="M28 55h64M46 100V76q14-14 28 0v24M21 101h78" />
    </>;
    case "mask": return <>
      <path d="M26 29q35-17 68 0l-5 43-29 30-29-30Z" fill="currentColor" fillOpacity=".13"/>
      <path d="m33 53 22 10m32-10L65 63M46 84q14 11 28 0"/>
      <path d="M54 28v17M66 28v17" />
    </>;
    case "horn": return <>
      <path d="m22 56 66-30-13 38-45 12Z" fill="currentColor" fillOpacity=".15"/>
      <path d="M30 76v25M42 73v22M13 55h15M92 27q18 21 0 42M103 16q26 33 0 64"/>
    </>;
    case "crest": return <>
      <path d="M60 16 92 30v32q0 27-32 40Q28 89 28 62V30Z" fill="currentColor" fillOpacity=".12"/>
      <path d="M60 31v52M44 57h32M36 19l9-10 15 13 15-13 9 10" />
      <path d="M44 91h32" />
    </>;
    case "crossbow": return <>
      <path d="M24 42q36-26 72 0M24 42q36 25 72 0M24 42h72M60 29v76" />
      <path d="m49 81 11 23 11-23M53 50h14" fill="currentColor" fillOpacity=".1"/>
    </>;
    case "scroll": return <>
      <path d="M34 21h54v71H34q-10-1-10-12t10-12V21q-10 0-10-10h44q10 0 10 10" fill="currentColor" fillOpacity=".12"/>
      <path d="M43 44h31M43 57h26M43 71h21M32 92h56" />
    </>;
    case "bell": return <>
      <path d="M28 88h64q-12-13-12-33 0-25-20-28-20 3-20 28 0 20-12 33Z" fill="currentColor" fillOpacity=".16"/>
      <path d="M60 17v10M50 89q0 19 10 19t10-19M43 53h34" />
    </>;
    case "wing": return <>
      <path d="M60 80Q22 18 9 28q0 35 51 60Q111 63 111 28 98 18 60 80Z" fill="currentColor" fillOpacity=".12"/>
      <path d="M19 38q17 18 41 42 24-24 41-42M34 66l26 23 26-23M60 76v28" />
    </>;
    case "crown": return <>
      <path d="M17 37 37 57 60 18l23 39 20-20-10 50H27Z" fill="currentColor" fillOpacity=".22"/>
      <path d="M27 88h66v13H27Z" /><circle cx="60" cy="70" r="7" />
      <path d="M22 29 17 37M98 29l5 8M60 9v9" />
    </>;
    case "axe": return <>
      <path d="M60 22v83M60 31 85 17l18 28-18 28-25-14" fill="currentColor" fillOpacity=".15"/>
      <path d="M60 31 35 17 17 45l18 28 25-14M45 39h30M45 57h30" />
    </>;
    case "moon": return <>
      <path d="M77 14Q39 17 39 56q0 39 38 43-17 9-37 0Q8 83 12 51 17 13 55 8q12-2 22 6Z" fill="currentColor" fillOpacity=".14" />
      <path d="M83 31v19M73 40h20M88 69v14M80 76h16" />
      <circle cx="65" cy="56" r="8" />
    </>;
    case "hourglass": return <>
      <path d="M29 12h62M29 105h62M38 14q0 26 22 43Q38 74 38 103M82 14q0 26-22 43 22 17 22 46" />
      <path d="M44 31q16 11 32 0M44 89q16-13 32 0" fill="none"/>
      <circle cx="60" cy="56" r="5" fill="currentColor" />
    </>;
  }
}

export default function CardArtwork({ card }: { card: ChronicleCard }) {
  const motif = MOTIFS[card.id] ?? (card.type === "마법" ? "sun" : "shield");

  return (
    <div className={`artwork artwork-${card.type === "마법" ? "spell" : "unit"}`} aria-hidden="true">
      <div className="artwork-halo" />
      <svg className="artwork-ornament" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="60" cy="60" r="51" stroke="currentColor" strokeOpacity=".21" strokeWidth="1" />
        <circle cx="60" cy="60" r="46" stroke="currentColor" strokeOpacity=".13" strokeDasharray="3 6" />
        <path d="M60 1v11M60 108v11M1 60h11M108 60h11" stroke="currentColor" strokeOpacity=".36" strokeWidth="2" />
      </svg>
      <svg className="artwork-motif" viewBox="0 0 120 115" fill="none"
        stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"
        xmlns="http://www.w3.org/2000/svg">
        {motifPath(motif)}
      </svg>
      <span className="artwork-glitter glitter-one">✧</span>
      <span className="artwork-glitter glitter-two">·</span>
    </div>
  );
}
