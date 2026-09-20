import { describe, expect, it } from 'vitest'
import { deriveOffroadSpecs } from './offroad'
import { ALL_CARDS } from './pack'

describe('offroad specs', () => {
  it('is deterministic for every car', () => {
    for (const car of ALL_CARDS) {
      const a = deriveOffroadSpecs(car)
      const b = deriveOffroadSpecs(car)
      expect(b, car.id).toEqual(a)
    }
  })

  it('produces a sane ground clearance and a well-formed tyre size for every car', () => {
    const tyrePattern = /^\d{3}\/\d{2} R\d{2}$/
    for (const car of ALL_CARDS) {
      const { groundClearanceMm, tyreSize, driveTrain } = deriveOffroadSpecs(car)
      expect(groundClearanceMm, car.id).toBeGreaterThanOrEqual(85)
      expect(groundClearanceMm, car.id).toBeLessThanOrEqual(260)
      expect(tyreSize, car.id).toMatch(tyrePattern)
      expect(['FWD', 'RWD', 'AWD', '4WD'], car.id).toContain(driveTrain)
    }
  })

  it('gives every SUV, truck and off-road nameplate four-wheel drive and taller ride height', () => {
    const offroaders = ALL_CARDS.filter((c) =>
      /jeep|wrangler|defender|land cruiser|range rover|hummer|silverado|f-150|raptor/i.test(
        `${c.make} ${c.model}`,
      ),
    )
    expect(offroaders.length).toBeGreaterThan(0)
    for (const car of offroaders) {
      const specs = deriveOffroadSpecs(car)
      expect(specs.driveTrain, car.id).toBe('4WD')
      expect(specs.groundClearanceMm, car.id).toBeGreaterThanOrEqual(170)
    }
  })

  it('keeps known all-wheel-drive nameplates off front- or rear-drive', () => {
    const awdKnown = ALL_CARDS.filter((c) =>
      ['vw-golf-r', 'nissan-gtr-r35', 'subaru-impreza-wrx-sti'].includes(c.id),
    )
    for (const car of awdKnown) {
      expect(deriveOffroadSpecs(car).driveTrain, car.id).toBe('AWD')
    }
  })
})
