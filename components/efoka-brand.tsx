export function EfokaBrand({ compact = false, dark = false }: { compact?: boolean; dark?: boolean }) {
  return <span className={`${compact ? 'text-[17px]' : 'text-xl'} font-semibold tracking-[-0.055em] ${dark ? 'text-[#10251e]' : 'text-white'}`} aria-label="EfoKa.ma">EfoKa<span className={dark ? 'text-[#2c7650]' : 'text-[#c6f06e]'}>.ma</span></span>
}
