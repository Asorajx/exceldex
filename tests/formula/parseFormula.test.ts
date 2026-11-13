import { describe, expect, it } from 'vitest';
import { parseFormula } from '../../src/formula/parseFormula';

describe('parseFormula', () => {
  it('splits simple arguments', () => {
    expect(parseFormula('=XLOOKUP(F2, A2:A100, B2:B100, "Not found")')).toMatchObject({
      name: 'XLOOKUP',
      args: ['F2', 'A2:A100', 'B2:B100', '"Not found"']
    });
  });

  it('keeps nested calls together', () => {
    expect(parseFormula('=IFERROR(VLOOKUP(E2, A2:C100, 3, FALSE), "Not found")')?.args).toEqual([
      'VLOOKUP(E2, A2:C100, 3, FALSE)',
      '"Not found"'
    ]);
  });

  it('does not split on separators inside quoted text', () => {
    expect(parseFormula('=TEXTJOIN(", ", TRUE, A2:A10)')?.args).toEqual(['", "', 'TRUE', 'A2:A10']);
  });

  it('ignores anything after the closing parenthesis', () => {
    expect(parseFormula('=COUNTIF($A$2:$A$100, A2)>1')?.args).toEqual(['$A$2:$A$100', 'A2']);
  });

  it('accepts semicolon separators', () => {
    expect(parseFormula('=IF(B2>=50; "Pass"; "Fail")')?.args).toEqual(['B2>=50', '"Pass"', '"Fail"']);
  });

  it('trims spaces around arguments', () => {
    expect(parseFormula('=IF( B2>=50 , "Pass", "Fail")')?.args).toEqual(['B2>=50', '"Pass"', '"Fail"']);
  });

  it('returns null for text it cannot read', () => {
    expect(parseFormula('')).toBeNull();
    expect(parseFormula('=A1+B1')).toBeNull();
    expect(parseFormula('=SUM(A1:A3')).toBeNull();
    expect(parseFormula('=NOW()')).toBeNull();
  });
});
