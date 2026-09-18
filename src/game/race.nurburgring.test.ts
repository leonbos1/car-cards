import { describe, expect, it } from 'vitest'
import { ALL_CARDS } from './pack'
import { fitness, type RaceEvent } from './race'

const CIRCUIT_EVENT: RaceEvent = {
  id: 'nurburgring-test',
  name: 'Nürburgring',
  discipline: 'circuit',
  prize: 1,
  grid: 20,
}

/**
 * Known Nürburgring lap times (Nordschleife, production cars):
 * Only benchmark cars that exist in our roster.
 * Real lap times establish the track performance hierarchy.
 */
const NURBURGRING_BENCHMARK: [make: string, model: string, year: number, lapTime: string][] = [
  ['Porsche', '918 Spyder', 2023, '6:57'],
  ['Porsche', '911 GT3 RS', 2023, '7:10'],
]

describe('circuit race vs nürburgring records', () => {
  it('ranks benchmark cars with realistic circuit fitness', () => {
    // Find cars in our roster matching the benchmarks
    const benchmarked = NURBURGRING_BENCHMARK
      .map(([make, model, year, _lapTime]) => {
        return ALL_CARDS.find((c) => c.make === make && c.model === model && c.year === year)
      })
      .filter((c): c is (typeof ALL_CARDS)[0] => c !== undefined)

    expect(benchmarked.length).toBeGreaterThanOrEqual(2)

    // Calculate fitness for each
    const withFitness = benchmarked.map((car) => ({
      car,
      fitness: fitness(car, CIRCUIT_EVENT),
      name: `${car.make} ${car.model} ${car.year}`,
    }))

    // Sort by fitness (descending) and log for inspection
    const sorted = [...withFitness].sort((a, b) => b.fitness - a.fitness)

    console.log('\nBenchmark cars ranked by circuit fitness:')
    sorted.forEach((item, idx) => {
      console.log(`${idx + 1}. ${item.name}: ${item.fitness.toFixed(2)}`)
    })

    // All benchmark cars should have high fitness (they're elite track cars)
    for (const item of sorted) {
      expect(item.fitness).toBeGreaterThan(0.5)
    }
  })

  it('gives all cars in the game a valid circuit fitness', () => {
    let invalidCount = 0
    const fitnesses: number[] = []

    for (const car of ALL_CARDS) {
      const f = fitness(car, CIRCUIT_EVENT)
      if (isNaN(f) || !isFinite(f) || f < 0 || f > 1) {
        invalidCount++
        console.warn(`Invalid fitness for ${car.make} ${car.model}: ${f}`)
      }
      fitnesses.push(f)
    }

    expect(invalidCount).toBe(0)
    expect(Math.max(...fitnesses)).toBeLessThanOrEqual(1)
    expect(Math.min(...fitnesses)).toBeGreaterThanOrEqual(0)
  })
})
