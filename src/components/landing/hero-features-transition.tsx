export function HeroFeaturesTransition() {
  return (
    <div className="relative z-10 w-full" aria-hidden>
      <div
        className="h-px w-full"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, rgba(249, 115, 22, 0.3) 30%, rgba(249, 115, 22, 0.6) 50%, rgba(249, 115, 22, 0.3) 70%, transparent 100%)",
          boxShadow:
            "0 0 40px rgba(249, 115, 22, 0.08), 0 0 80px rgba(249, 115, 22, 0.04)",
        }}
      />
    </div>
  );
}
