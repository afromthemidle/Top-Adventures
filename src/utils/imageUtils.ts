export function getAdventureImage(sport: string, imageUrl?: string): string {
  // If the user provided a valid HTTP image URL, or a base64 data URI, or a blob URI, we MUST use it! This is likely their uploaded image.
  if (imageUrl && imageUrl.trim() !== '') {
    if (imageUrl.startsWith('http') || imageUrl.startsWith('data:') || imageUrl.startsWith('blob:') || imageUrl.startsWith('/')) {
      return imageUrl;
    }
  }

  // Fallback to reliable local images based on the sport
  const s = (sport || '').toLowerCase();
  
  if (s.includes('canopy') || s.includes('zipline') || s.includes('tirolesa')) {
    return "/images/canopy_bibin_safe.png";
  }
  if (s.includes('parapente') || s.includes('paragliding')) {
    return "/images/paragliding_paute_joy.png";
  }
  if (s.includes('rafting') || s.includes('kayak') || s.includes('río') || s.includes('rio')) {
    return "/images/rafting.jpg";
  }
  if (s.includes('canyoning') || s.includes('barranquismo')) {
    return "/images/canyoning.jpg";
  }
  if (s.includes('escalada') || s.includes('climbing') || s.includes('roca') || s.includes('bouldering') || s.includes('cojitambo')) {
    return "/images/climbing.jpg";
  }
  if (s.includes('ciclismo') || s.includes('bici') || s.includes('mtb') || s.includes('cycling') || s.includes('cumbayá') || s.includes('cumbaya')) {
    return "/images/cycling.jpg";
  }
  if (s.includes('senderismo') || s.includes('trekking') || s.includes('caminata') || s.includes('hiking') || s.includes('trail') || s.includes('cajas')) {
    return "/images/hiking.jpg";
  }
  if (s.includes('cabalgata') || s.includes('caballo') || s.includes('horse')) {
    return "/images/horse_riding.jpg";
  }
  if (s.includes('buceo') || s.includes('snorkel') || s.includes('diving')) {
    return "/images/diving.jpg";
  }
  if (s.includes('surf')) {
    return "/images/surf.jpg";
  }
  if (s.includes('camping') || s.includes('campamento')) {
    return "/images/camping.jpg";
  }

  // Default mountain/nature landscape
  return "/images/nature_default.jpg";
}
