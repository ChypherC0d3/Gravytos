import { Link } from 'react-router-dom';
import { useEffect, useState, useCallback } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const installedHandler = () => setIsInstalled(true);

    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', installedHandler);

    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', installedHandler);
    };
  }, []);

  const install = useCallback(async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  }, [deferredPrompt]);

  return { canInstall: !!deferredPrompt, isInstalled, install };
}

const WindowsIcon = () => (
  <svg className="w-12 h-12 mx-auto mb-5 text-blue-400" viewBox="0 0 24 24" fill="currentColor">
    <path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.9-1.801" />
  </svg>
);

const AppleIcon = () => (
  <svg className="w-12 h-12 mx-auto mb-5 text-gray-300" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
  </svg>
);

const LinuxIcon = () => (
  <svg className="w-12 h-12 mx-auto mb-5 text-yellow-400" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12.504 0c-.155 0-.315.008-.48.021-4.226.333-3.105 4.807-3.17 6.298-.076 1.092-.3 1.953-1.05 3.02-.885 1.051-2.127 2.75-2.716 4.521-.278.832-.41 1.684-.287 2.489a.424.424 0 00-.11.135c-.26.268-.45.6-.663.839-.199.199-.485.267-.797.4-.313.136-.658.269-.864.68-.09.189-.136.394-.132.602 0 .199.027.4.055.536.058.399.116.728.04.97-.249.68-.28 1.145-.106 1.484.174.334.535.47.94.601.81.2 1.91.135 2.774.6.926.466 1.866.67 2.616.47.526-.116.97-.464 1.208-.946.587-.003 1.23-.269 2.26-.334.699-.058 1.574.267 2.577.2.025.134.063.198.114.333l.003.003c.391.778 1.113 1.368 1.884 1.43.868.074 1.741-.136 2.509-.496 1.603-.77 2.853-2.292 3.555-3.839.072-.158.109-.291.136-.457.045-.326.012-.636-.1-.946-.089-.243-.232-.477-.393-.674a3.427 3.427 0 01-.24-.36c-.098-.179-.163-.407-.142-.635.058-.49.209-.954.237-1.554a5.024 5.024 0 00-.394-2.245c-.19-.423-.432-.752-.617-1.065-.186-.307-.323-.551-.397-.855-.079-.347-.058-.817.063-1.412.138-.65.236-1.284.217-1.885-.019-.621-.143-1.201-.507-1.69a2.6 2.6 0 00-.372-.389c-.376-.338-.777-.508-1.167-.625a3.96 3.96 0 00-1.11-.181c-.697-.01-1.373.14-1.955.42a4.12 4.12 0 00-1.437.997c-.37.39-.645.857-.77 1.395-.126.534-.093 1.082.04 1.614.135.548.352 1.07.564 1.542.211.47.411.886.522 1.238.112.353.143.625.1.855a1.4 1.4 0 01-.16.445c-.076.126-.18.238-.277.363-.192.249-.389.525-.515.885-.127.36-.19.79-.132 1.324.023.244.068.5.138.771.079.305.146.576.198.858.1.513.143.96.04 1.27-.09.276-.27.462-.487.617-.228.16-.507.278-.818.39-.62.225-1.33.37-1.942.686-.617.313-1.137.8-1.388 1.52-.104.3-.152.627-.144.966a4.4 4.4 0 00.157 1.015c.058.17.108.283.096.399a.9.9 0 01-.088.252c-.1.188-.277.324-.396.5-.061.089-.1.148-.149.283-.048.135-.067.314-.029.528.036.212.124.464.294.73.34.534.904.876 1.478.99.592.116 1.17.054 1.67-.167.502-.224.898-.59 1.193-1.017a3.6 3.6 0 00.529-1.435c.027-.2.03-.377.01-.537a1.73 1.73 0 00-.116-.417c-.081-.185-.206-.357-.296-.5a.7.7 0 01-.1-.2.25.25 0 010-.135c.02-.062.073-.116.168-.173.19-.119.478-.174.8-.232.326-.061.694-.117 1.022-.252.169-.068.328-.157.486-.293a1.59 1.59 0 00.387-.524.974.974 0 00.1-.525 2.03 2.03 0 00-.14-.52c-.07-.188-.162-.356-.237-.505a3.24 3.24 0 01-.16-.375c-.037-.109-.064-.23-.05-.362.052-.486.333-.895.576-1.244.242-.351.478-.655.578-1.017a2.19 2.19 0 00.003-1.09 3.793 3.793 0 00-.347-.887c-.162-.3-.36-.6-.506-.884a2.5 2.5 0 01-.244-.591 1.3 1.3 0 01-.028-.608c.04-.188.124-.347.2-.5.077-.151.148-.293.183-.459a1.28 1.28 0 00-.027-.627 2.14 2.14 0 00-.272-.536c-.107-.157-.241-.302-.363-.429a3.05 3.05 0 01-.297-.359.78.78 0 01-.128-.361.61.61 0 01.05-.303c.055-.128.148-.242.236-.362.087-.118.176-.243.237-.394.06-.149.09-.332.05-.558a2.1 2.1 0 00-.26-.666 3.372 3.372 0 00-.566-.665c-.23-.205-.498-.38-.773-.506a2.97 2.97 0 00-.863-.245c-.305-.037-.582-.017-.835.04a2.48 2.48 0 00-.65.261c-.198.12-.369.262-.5.422a1.5 1.5 0 00-.293.505c-.065.187-.09.383-.085.577.005.194.04.387.094.571.052.183.123.36.197.527.074.167.15.318.215.462.068.143.119.272.149.39.03.121.035.219.013.297a.4.4 0 01-.084.167 1.15 1.15 0 01-.186.168c-.156.122-.367.244-.576.4a2.42 2.42 0 00-.537.494 1.3 1.3 0 00-.26.61 1.72 1.72 0 00.024.624c.05.198.134.383.217.556.167.346.34.66.415.977.037.156.057.308.038.468-.02.16-.077.32-.169.49l-.009.016c-.1.168-.229.309-.354.458a2.34 2.34 0 00-.305.503 1.62 1.62 0 00-.14.649c-.007.283.055.552.135.804.16.506.39.956.509 1.378.059.206.091.4.071.58-.02.178-.09.334-.242.472-.152.139-.378.244-.67.32a4.56 4.56 0 01-1.065.134c-.147.002-.34.012-.545.052a1.62 1.62 0 00-.573.218c-.178.117-.329.286-.394.528-.066.243-.027.52.073.79.1.271.263.544.444.793.362.498.817.913 1.157 1.205.34.293.565.462.498.515l-.003.003c-.053.053-.156.024-.367-.106-.21-.131-.512-.364-.888-.681a5.47 5.47 0 01-.648-.648c-.193-.223-.363-.473-.482-.746a1.89 1.89 0 01-.168-.855c.006-.319.107-.625.29-.887.181-.261.428-.465.695-.607.268-.142.547-.22.808-.259.261-.04.504-.04.698-.036a4.16 4.16 0 001.17-.152c.229-.068.385-.147.494-.239a.52.52 0 00.16-.298c.01-.117-.02-.256-.066-.418a6.46 6.46 0 01-.148-.51c.013-.095.03-.189.052-.283z" />
  </svg>
);

const GlobeIcon = () => (
  <svg className="w-10 h-10 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5a17.92 17.92 0 01-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
  </svg>
);

const OS_CARDS = [
  {
    name: 'Windows',
    icon: WindowsIcon,
    requirement: 'Windows 10 or later',
    arch: 'x64 \u00B7 .msi installer',
    file: 'gravytos-0.1.0-x64.msi',
    verifyCmd: 'certutil -hashfile gravytos-0.1.0-x64.msi SHA256',
    gradient: 'from-blue-600 to-cyan-600',
    hoverBorder: 'hover:border-blue-500/50',
    shadowColor: 'hover:shadow-blue-500/10',
  },
  {
    name: 'macOS',
    icon: AppleIcon,
    requirement: 'macOS 12 Monterey or later',
    arch: 'Universal (Intel + Apple Silicon) \u00B7 .dmg',
    file: 'gravytos-0.1.0-universal.dmg',
    verifyCmd: 'shasum -a 256 gravytos-0.1.0-universal.dmg',
    gradient: 'from-gray-500 to-gray-600',
    hoverBorder: 'hover:border-gray-400/50',
    shadowColor: 'hover:shadow-gray-400/10',
  },
  {
    name: 'Linux',
    icon: LinuxIcon,
    requirement: 'Ubuntu 20.04+ / Fedora 36+',
    arch: 'x64 \u00B7 .AppImage',
    file: 'gravytos-0.1.0-x86_64.AppImage',
    verifyCmd: 'sha256sum gravytos-0.1.0-x86_64.AppImage',
    gradient: 'from-yellow-600 to-orange-600',
    hoverBorder: 'hover:border-yellow-500/50',
    shadowColor: 'hover:shadow-yellow-500/10',
  },
];

const SYSTEM_REQUIREMENTS = [
  { label: 'Operating System', windows: 'Windows 10+', macos: 'macOS 12+', linux: 'Ubuntu 20.04+' },
  { label: 'Processor', windows: 'x64 1 GHz+', macos: 'Intel / Apple Silicon', linux: 'x64 1 GHz+' },
  { label: 'RAM', windows: '4 GB', macos: '4 GB', linux: '4 GB' },
  { label: 'Storage', windows: '200 MB', macos: '200 MB', linux: '200 MB' },
];

export function Download() {
  const { canInstall, isInstalled, install } = usePwaInstall();

  return (
    <div className="min-h-screen dark">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-[hsl(220,30%,6%)]/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl gradient-hero flex items-center justify-center shadow-lg shadow-purple-500/20">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
              </svg>
            </div>
            <span className="text-lg font-light tracking-wide text-white">Gravytos</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link to="/download" className="text-sm font-light text-white/50 hover:text-white/80 transition-colors duration-300 tracking-wide hidden sm:block">
              Download
            </Link>
            <Link to="/dashboard" className="btn-bevel text-sm py-2 px-5">
              Launch App
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-36 pb-16 px-6 overflow-hidden">
        {/* Gradient orbs */}
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full opacity-15" style={{ background: 'radial-gradient(circle, hsla(270, 60%, 55%, 0.4) 0%, transparent 70%)' }} />
          <div className="absolute top-1/3 right-1/4 w-[400px] h-[400px] rounded-full opacity-10" style={{ background: 'radial-gradient(circle, hsla(221, 60%, 55%, 0.4) 0%, transparent 70%)' }} />
        </div>

        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-light tracking-widest text-white/50 uppercase mb-8">
            <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            Free &amp; Open Source
          </div>

          <h1 className="text-5xl md:text-7xl font-light tracking-wide mb-6">
            <span className="text-gradient">Download</span>{' '}
            <span className="text-white/90 font-extralight">Gravytos</span>
          </h1>
          <p className="text-lg md:text-xl font-light tracking-wide text-white/40 max-w-2xl mx-auto mb-4 leading-relaxed">
            Available for Windows, macOS, and Linux. Free and open-source.
          </p>
          <p className="text-sm font-light tracking-wide text-white/25">
            Current version: v0.1.0
          </p>
        </div>
      </section>

      {/* OS Download Cards */}
      <section className="max-w-5xl mx-auto px-6 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {OS_CARDS.map((os) => {
            const Icon = os.icon;
            return (
              <div
                key={os.name}
                className={`relative bg-white/[0.03] border border-white/10 rounded-2xl p-8 text-center ${os.hoverBorder} ${os.shadowColor} hover:shadow-2xl hover:bg-white/[0.05] transition-all duration-500 group`}
              >
                {/* Subtle top gradient line */}
                <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-24 h-px bg-gradient-to-r ${os.gradient} opacity-0 group-hover:opacity-60 transition-opacity duration-500`} />

                <Icon />
                <h3 className="text-xl font-light tracking-wide text-white/90 mb-2">{os.name}</h3>
                <p className="text-sm font-light text-white/40 mb-1">{os.requirement}</p>
                <p className="text-xs font-light text-white/25 mb-6">{os.arch}</p>

                <button className={`w-full py-3.5 rounded-xl bg-gradient-to-r ${os.gradient} text-white font-medium text-sm tracking-wide hover:opacity-90 hover:shadow-lg transition-all duration-300 cursor-pointer`}>
                  Download for {os.name}
                </button>

                <p className="text-[11px] font-light text-white/20 mt-4 font-mono">
                  SHA256: Coming soon
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* PWA Install */}
      <section className="max-w-4xl mx-auto px-6 pb-20">
        <div className="relative bg-gradient-to-br from-purple-500/[0.08] to-blue-500/[0.08] border border-purple-500/20 rounded-2xl p-10 text-center overflow-hidden">
          {/* Decorative gradient */}
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, hsla(270, 60%, 55%, 0.6) 0%, transparent 70%)' }} />

          <div className="relative z-10">
            <div className="mx-auto mb-5 w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-purple-500/20 flex items-center justify-center">
              <GlobeIcon />
            </div>
            <h2 className="text-2xl md:text-3xl font-light tracking-wide text-white/90 mb-3">
              Or use the Web App
            </h2>
            <p className="text-base font-light text-white/40 mb-2 tracking-wide">
              No download needed. Install directly from your browser.
            </p>
            <p className="text-sm font-light text-white/25 mb-8 tracking-wide">
              Works on Chrome, Edge, Brave, and Safari
            </p>

            {isInstalled ? (
              <div className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm font-medium">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
                Already Installed
              </div>
            ) : canInstall ? (
              <button
                onClick={install}
                className="inline-flex items-center gap-2 py-3.5 px-10 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white font-medium text-sm tracking-wide hover:opacity-90 hover:shadow-lg hover:shadow-purple-500/20 transition-all duration-300 cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                Install as Web App
              </button>
            ) : (
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-2 py-3.5 px-10 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white font-medium text-sm tracking-wide hover:opacity-90 hover:shadow-lg hover:shadow-purple-500/20 transition-all duration-300"
              >
                Open Web App
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Verification */}
      <section className="max-w-4xl mx-auto px-6 pb-20">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-light tracking-widest text-white/50 uppercase mb-4">
            Security
          </div>
          <h2 className="text-2xl md:text-3xl font-light tracking-wide text-white/90 mb-3">
            Verify Your Download
          </h2>
          <p className="text-base font-light text-white/40 tracking-wide">
            Always verify the integrity of your download using SHA256 checksums.
          </p>
        </div>

        <div className="bg-black/40 border border-white/5 rounded-2xl p-6 space-y-4">
          {OS_CARDS.map((os) => (
            <div key={os.name}>
              <p className="text-xs font-light text-white/30 mb-1.5 tracking-wide"># {os.name}</p>
              <div className="flex items-center gap-2 bg-white/[0.03] rounded-lg px-4 py-2.5 group">
                <code className="text-sm font-mono text-emerald-400/80 flex-1 break-all">
                  {os.verifyCmd}
                </code>
                <button
                  onClick={() => navigator.clipboard.writeText(os.verifyCmd)}
                  className="shrink-0 p-1.5 rounded-md hover:bg-white/10 text-white/30 hover:text-white/70 transition-colors cursor-pointer"
                  title="Copy command"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* System Requirements */}
      <section className="max-w-4xl mx-auto px-6 pb-20">
        <div className="text-center mb-8">
          <h2 className="text-2xl md:text-3xl font-light tracking-wide text-white/90 mb-3">
            System Requirements
          </h2>
          <p className="text-base font-light text-white/40 tracking-wide">
            Minimum specifications for each platform.
          </p>
        </div>

        <div className="bg-white/[0.02] border border-white/5 rounded-2xl overflow-hidden">
          {/* Table Header */}
          <div className="grid grid-cols-4 border-b border-white/5">
            <div className="px-6 py-4 text-xs font-light text-white/30 tracking-widest uppercase" />
            <div className="px-6 py-4 text-xs font-light text-white/30 tracking-widest uppercase text-center">Windows</div>
            <div className="px-6 py-4 text-xs font-light text-white/30 tracking-widest uppercase text-center">macOS</div>
            <div className="px-6 py-4 text-xs font-light text-white/30 tracking-widest uppercase text-center">Linux</div>
          </div>
          {/* Table Rows */}
          {SYSTEM_REQUIREMENTS.map((row, i) => (
            <div
              key={row.label}
              className={`grid grid-cols-4 ${i < SYSTEM_REQUIREMENTS.length - 1 ? 'border-b border-white/5' : ''}`}
            >
              <div className="px-6 py-4 text-sm font-light text-white/50 tracking-wide">{row.label}</div>
              <div className="px-6 py-4 text-sm font-light text-white/70 text-center">{row.windows}</div>
              <div className="px-6 py-4 text-sm font-light text-white/70 text-center">{row.macos}</div>
              <div className="px-6 py-4 text-sm font-light text-white/70 text-center">{row.linux}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <Link to="/" className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg gradient-hero flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
                </svg>
              </div>
              <span className="text-sm font-light tracking-wide text-white/50">Gravytos v0.1.0</span>
            </Link>
            <nav className="flex items-center gap-6">
              <Link to="/download" className="text-xs font-light text-white/30 hover:text-white/60 transition-colors tracking-wide">Download</Link>
              <Link to="/dashboard" className="text-xs font-light text-white/30 hover:text-white/60 transition-colors tracking-wide">Dashboard</Link>
            </nav>
            <p className="text-xs font-light text-white/20 tracking-wide">Privacy is not a feature. It&apos;s a right.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
