const rodThemes = {
    Bamboo: (components) => `
    ===[Your Dao Rod]===
    • Reel : ${components.reel}
    • Line : ${components.line}
    • Grip : ${components.grip}
    `,
    
    
    Ironwood: (components) => `
    🪓 IRONWOOD ROD
    ╞══════════════╡
    🔁 Mast: ${components.mast}
    🌀 Reel: ${components.reel}
    🧶 Line: ${components.line}
    🖐 Grip: ${components.grip}
    `,
    
  
    // New DOS-era inspired themes
    ClassicDOS: (components) => `
    ╔══════════════════════╗
    ║ FISHING ROD SPECS    ║
    ╟──────────────────────╢
    ║ Mast: ${components.mast.padEnd(14)} ║
    ║ Reel: ${components.reel.padEnd(14)} ║
    ║ Line: ${components.line.padEnd(14)} ║
    ║ Grip: ${components.grip.padEnd(14)} ║
    ╚══════════════════════╝
    `,
  
    RetroPC: (components) => `
    ┌──────────────────────┐
    │▒▒▒ FISHING ROD ▒▒▒    │
    ├──────────────────────┤
    │• MAST: ${components.mast.padEnd(14)}│
    │• REEL: ${components.reel.padEnd(14)}│
    │• LINE: ${components.line.padEnd(14)}│
    │• GRIP: ${components.grip.padEnd(14)}│
    └──────────────────────┘
    `,
  
    ASCIIArt: (components) => `
      /\\_/\\ 
     ( o.o ) 
      > ^ < 
    FISHING ROD
    ===========
    [Mast] ${components.mast}
    [Reel] ${components.reel}
    [Line] ${components.line}
    [Grip] ${components.grip}
    `,
  
    VintageTerminal: (components) => `
    .:°•. FISHING ROD .•°:.
    ----------------------
    ╭─ MAST ────► ${components.mast}
    ├─ REEL ────► ${components.reel}
    ├─ LINE ────► ${components.line}
    ╰─ GRIP ────► ${components.grip}
    `,
  
    PixelPerfect: (components) => `
    ▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
    █ FISHING ROD  v1.0 █
    ▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀
    ▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
    ■ Mast: ${components.mast}
    ■ Reel: ${components.reel}
    ■ Line: ${components.line}
    ■ Grip: ${components.grip}
    ▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
    `,
  
    BBSStyle: (components) => `
    ╔════════════════════╗
    ║ *FISHING ROD*      ║
    ║                    ║
    ║ Mast -> ${components.mast.padEnd(14)} ║
    ║ Reel -> ${components.reel.padEnd(14)} ║
    ║ Line -> ${components.line.padEnd(14)} ║
    ║ Grip -> ${components.grip.padEnd(14)} ║
    ║                    ║
    ╚════════════════════╝
    `,
  
    ANSIBorder: (components) => `
    █▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀█
    █  FISHING ROD     █
    █                  █
    █ ♦ Mast: ${components.mast.padEnd(14)} █
    █ ♦ Reel: ${components.reel.padEnd(14)} █
    █ ♦ Line: ${components.line.padEnd(14)} █
    █ ♦ Grip: ${components.grip.padEnd(14)} █
    █▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄█
    `,
  
    DOSPrompt: (components) => `
    C:\\FISHING> rod --specs
    --------------------------
    Mast  | ${components.mast.padEnd(14)}
    Reel  | ${components.reel.padEnd(14)}
    Line  | ${components.line.padEnd(14)}
    Grip  | ${components.grip.padEnd(14)}
    --------------------------
    `,
  
    Roguelike: (components) => `
    )--------(
    | ROD   ☻|
    |--------|
    | mast:${components.mast.padStart(8).padEnd(14)}|
    | reel:${components.reel.padStart(8).padEnd(14)}|
    | line:${components.line.padStart(8).padEnd(14)}|
    | grip:${components.grip.padStart(8).padEnd(14)}|
    )--------(
    `,
  
    // Enhanced original themes
    Dragonbone: (components) => `
    ░▒▓ DRAGONBONE ROD ▓▒░
    ╔════════════════════╗
    ║ 🐉 MAST » ${components.mast.padEnd(14)} ║
    ║ ♻ REEL » ${components.reel.padEnd(14)} ║
    ║ 🟣 LINE » ${components.line.padEnd(14)} ║
    ║ ✦ GRIP » ${components.grip.padEnd(14)} ║
    ╚════════════════════╝
    ▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
    `,
  
    Obsidian: (components) => `
    █▓▒░ OBSIDIAN ROD ░▒▓█
    ┌────────────────────┐
    │ 🪨 ${components.mast.padEnd(14)} │
    │ ⚙︎  ${components.reel.padEnd(14)} │
    │ 🧵 ${components.line.padEnd(14)} │
    │ ✋ ${components.grip.padEnd(14)} │
    └────────────────────┘
    ▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀
    `,
    MatrixGreen: (components) => `
  █▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀█
  █ ⌠ CYBER ROD ⌡      █
  █                    █
  █ ♦ MAST » ${components.mast.padEnd(14)} █
  █ ♦ REEL » ${components.reel.padEnd(14)} █
  █ ♦ LINE » ${components.line.padEnd(14)} █
  █ ♦ GRIP » ${components.grip.padEnd(14)} █
  █▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄█
  `,

  C64Basic: (components) => `
  10 PRINT "**** FISHING ROD ****"
  20 PRINT "Mast: ${components.mast}"
  30 PRINT "REEL: ${components.reel}"
  40 PRINT "LINE: ${components.line}"
  50 PRINT "GRIP: ${components.grip}"
  60 END
  `,

  MSDOSSplash: (components) => `
  ┌───────────────────────────┐
  │ Microsoft Fishing Rod 1.0 │
  ├───────────────────────────┤
  │ Mast: ${components.mast.padEnd(20)} │
  │ Reel: ${components.reel.padEnd(20)} │
  │ Line: ${components.line.padEnd(20)} │
  │ Grip: ${components.grip.padEnd(20)} │
  └───────────────────────────┘
  C:\>_
  `,

  ZXSpectrum: (components) => `
  ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒
  ▒       ROD 1982       ▒
  ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒
  ▒ MAST: ${components.mast.padEnd(15)} ▒
  ▒ REEL: ${components.reel.padEnd(15)} ▒
  ▒ LINE: ${components.line.padEnd(15)} ▒
  ▒ GRIP: ${components.grip.padEnd(15)} ▒
  ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒
  `,

  AmigaWorkbench: (components) => `
  ╔════════════════════════╗
  ║  🎣 FISHING ROD INFO   ║
  ╠════════════════════════╣
  ║                        ║
  ║  Mast: ${components.mast.padEnd(18)}  ║
  ║  Reel: ${components.reel.padEnd(18)}  ║
  ║  Line: ${components.line.padEnd(18)}  ║
  ║  Grip: ${components.grip.padEnd(18)}  ║
  ║                        ║
  ╚════════════════════════╝
  `,

  // --- JOKE THEME: ERROR ROD ---
  BSODRod: (components) => `
  ╔════════════════════════════════╗
  ║   *** SYSTEM ROD FAILURE ***   ║
  ╟────────────────────────────────╢
  ║ MAST_ERROR: ${components.mast.padEnd(18)} ║
  ║ REEL_FAULT: ${components.reel.padEnd(18)} ║
  ║ LINE_ERROR: ${components.line.padEnd(18)} ║
  ║ GRIP_CRASH: ${components.grip.padEnd(18)} ║
  ║                                ║
  ║ PRESS ANY KEY TO REBOOT ROD    ║
  ╚════════════════════════════════╝
  `,
  };
  
  function getRodArt(mastType, components) {
    const theme = rodThemes[mastType] || rodThemes['ClassicDOS'];
    return theme(components);
  }
  
  module.exports = { getRodArt, rodThemes };