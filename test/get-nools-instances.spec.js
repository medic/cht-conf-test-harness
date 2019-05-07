const { expect } = require('chai');
const rewire = require('rewire');
const getTasks = rewire('../src/get-nools-instances');

const calculateNow = getTasks.__get__('calculateNow');

describe('Get Tasks', () => {
  describe('Calculate Now', () => {
    it('defaults to actual now', () => {
      const actual = calculateNow();
      expect(actual.getTime()).to.be.lte(Date.now());
      expect(actual.getTime()).to.be.gte(Date.now() - 1000);
    });

    it('accepts date inputs', () => {
      const expected = new Date('2010-02-20');
      const actual = calculateNow(expected);
      expect(actual.toISOString()).to.eq(expected.toISOString());
    });

    it('accepts parseable inputs', () => {
      const expected = '2010-02-20';
      const actual = calculateNow(expected);
      expect(actual.toString()).to.include('Feb 20 2010');
    });

    it('accepts functions resolving to dates', () => {
      const expected = new Date('2010-02-21');
      const actual = calculateNow(() => expected);
      expect(actual.toString()).to.include(expected.toString());
    });

    it('accepts functions resolving to parseable inputs', () => {
      const expected = '2000-12-31';
      const actual = calculateNow(() => expected);
      expect(actual.toString()).to.include('Dec 31 2000');
    });
  });
});
