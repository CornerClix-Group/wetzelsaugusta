const AppLoadingScreen = () => (
  <div className="min-h-screen bg-primary flex flex-col items-center justify-center">
    <div className="animate-in fade-in zoom-in duration-500">
      <img
        src="/icon-512.png"
        alt="Wetzels of Augusta"
        width={96}
        height={96}
        className="rounded-2xl shadow-lg mb-6"
      />
    </div>
    <h1 className="text-xl font-bold text-primary-foreground mb-1">Wetzels of Augusta</h1>
    <p className="text-sm text-primary-foreground/50">Loading...</p>
    <div className="mt-6 h-1 w-32 rounded-full bg-primary-foreground/10 overflow-hidden">
      <div className="h-full w-1/2 rounded-full bg-secondary animate-pulse" />
    </div>
  </div>
);

export default AppLoadingScreen;
