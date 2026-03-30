const AppLoadingScreen = () => (
  <div className="min-h-screen bg-primary flex flex-col items-center justify-center px-6">
    <div className="flex flex-col items-center gap-5">
      <img
        src="/icon-512.png"
        alt="Wetzels of Augusta"
        width={72}
        height={72}
        className="rounded-[18px]"
      />
      <div className="text-center">
        <h1 className="text-lg font-semibold text-primary-foreground tracking-tight">
          Wetzels of Augusta
        </h1>
      </div>
      <div className="h-0.5 w-10 rounded-full bg-primary-foreground/20 overflow-hidden">
        <div
          className="h-full rounded-full bg-primary-foreground/60"
          style={{
            animation: "loading-bar 1.2s ease-in-out infinite",
            width: "40%",
          }}
        />
      </div>
    </div>
    <style>{`
      @keyframes loading-bar {
        0% { transform: translateX(-100%); }
        50% { transform: translateX(150%); }
        100% { transform: translateX(400%); }
      }
    `}</style>
  </div>
);

export default AppLoadingScreen;
