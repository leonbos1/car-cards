import { existsSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { depicts } from '../../scripts/image-match'
import manifest from './car-images.json'
import { CARS } from './cars'
import type { CarImage } from '../types'

const images = manifest as Record<string, CarImage>
const PUBLIC_CARS = path.resolve(__dirname, '..', '..', 'public', 'cars')

/** The Commons filename the photo actually came from. */
function sourceName(image: CarImage): string {
  const last = image.sourceUrl.split('/').pop() ?? ''
  return decodeURIComponent(last).replace(/^File:/, '').replace(/_/g, ' ')
}

describe('car images', () => {
  it('shows the car the card claims', () => {
    // A photo whose Commons filename names neither the marque nor the model is
    // not a photo of this car. This caught a Jacques-Louis David painting on an
    // Alfa Romeo, a geometry diagram on a Geely, and a Koenigsegg on a Bugatti.
    const wrong = CARS.filter((car) => {
      const image = images[car.id]
      return image && !depicts(sourceName(image), car)
    }).map((car) => `${car.id}: ${car.make} ${car.model} → ${sourceName(images[car.id])}`)

    expect(wrong).toEqual([])
  })

  it('has a file on disk for every manifest entry', () => {
    const missing = Object.entries(images)
      .filter(([, image]) => !existsSync(path.join(PUBLIC_CARS, image.file)))
      .map(([id]) => id)

    expect(missing).toEqual([])
  })

  it('credits every photo it uses', () => {
    const uncredited = Object.entries(images)
      .filter(([, image]) => !image.artist || !image.license || !image.sourceUrl)
      .map(([id]) => id)

    expect(uncredited).toEqual([])
  })

  it('keeps no entry for a car that left the roster', () => {
    const stale = Object.keys(images).filter((id) => !CARS.some((c) => c.id === id))
    expect(stale).toEqual([])
  })
})
