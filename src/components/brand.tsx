import Image from "next/image";
export function Brand({ dark = false }: { dark?: boolean }) {
  return (
    <span className={`brand-image ${dark ? "brand-white" : "brand-black"}`}>
      <Image
        src="/assets/logo.png"
        width={2172}
        height={724}
        unoptimized
        alt="ALABBAS"
        className="brand-source"
        loading={dark ? "lazy" : "eager"}
      />
    </span>
  );
}
