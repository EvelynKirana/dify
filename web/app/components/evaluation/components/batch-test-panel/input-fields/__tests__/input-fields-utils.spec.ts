import { buildTemplateCsvContent, getExampleValue } from '../input-fields-utils'

describe('input fields utils', () => {
  describe('buildTemplateCsvContent', () => {
    it('should build CSV content from API columns without injecting columns', () => {
      expect(buildTemplateCsvContent([
        'index',
        'query',
        'expected_output',
      ])).toBe('index,query,expected_output\n')
    })

    it('should escape CSV column names', () => {
      expect(buildTemplateCsvContent([
        'query,text',
        'answer "draft"',
      ])).toBe('"query,text","answer ""draft"""\n')
    })
  })

  describe('getExampleValue', () => {
    it('should use a row number example for index fields', () => {
      expect(getExampleValue({ name: 'index', type: 'number' }, 'True')).toBe('1')
    })
  })
})
