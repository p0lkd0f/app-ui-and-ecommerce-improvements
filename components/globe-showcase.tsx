'use client'

import { useEffect, useState } from 'react'
import { Globe } from '@/components/ui/globe'
import { Marquee } from '@/components/ui/marquee'

const platforms = [
  ['Shopify', '/integrations/shopify.png'],
  ['Meta', '/integrations/facebook.png'],
  ['Instagram', '/integrations/instagram.png'],
  ['WhatsApp', '/integrations/whatsapp.png'],
  ['TikTok', '/integrations/tiktok.png'],
  ['PrestaShop', '/integrations/prestashop.jpg'],
] as const

export function GlobeShowcase() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return <div aria-hidden="true" className="absolute inset-0 mx-auto aspect-square w-full max-w-150 top-14" />
  }

  return (
    <>
      <Marquee repeat={5} pauseOnHover className="globe-icon-rail absolute inset-x-0 top-10 z-20 [--duration:10s] [--gap:0.55rem]" aria-label="Commerce platforms">
        <div className="flex items-center gap-2">
          {platforms.map(([name, src]) => (
            <span key={name} title={name} className="globe-platform-icon">
              <img src={src} alt="" />
            </span>
          ))}
        </div>
      </Marquee>
      <Globe className="top-14" />
    </>
  )
}
