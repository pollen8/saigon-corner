type BrandMarkProps = {
  logoHeight?: number;
};

export function BrandMark({ logoHeight = 64 }: BrandMarkProps) {
  return (
    <img
      src="/logo.png"
      alt="Saigon Corner — Vietnamese Street Food"
      style={{
        height: logoHeight,
        width: "auto",
        maxWidth: "min(100%, 420px)",
        display: "block",
        objectFit: "contain",
      }}
    />
  );
}