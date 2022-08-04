import {waitingTimeForTier2} from './time'

describe('time', () => {
  describe('waitingTimeForTier2', () => {
    it('returns 3000 usually', () => {
      expect(waitingTimeForTier2()).toBe(3000)
    })

    test('必ず3000を返す', () => {
      expect(waitingTimeForTier2()).toBe(3000)
    })
  })
})
