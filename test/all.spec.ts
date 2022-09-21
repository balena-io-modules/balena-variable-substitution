import { expect } from 'chai';

import { interpolate, Options } from '../lib';

const cases: Array<[string, string, string]> = [
	['trivial substitution', '$VAR', 'value'],
	['trivial substitution', '${VAR}', 'value'],
	['trivial substitution', '$EMPTY', ''],
	['trivial substitution', '${EMPTY}', ''],
	['trivial substitution', '$UNDEFINED', ''],
	['trivial substitution', '${UNDEFINED}', ''],

	['multiple placeholders', 'some$VAR$VAR', 'somevaluevalue'],

	['nested placeholders', '${$VAR}', '${value}'],
	['nested placeholders', '$${$VAR}', '$${value}'],

	['normalizes non-string values', '$NULL', ''],
	['normalizes non-string values', '$UNDEFINED', ''],
	['normalizes non-string values', '$NUMBER', '5'],

	['ignores non-placeholders', '$', '$'],
	['ignores non-placeholders', '$$', '$$'],
	['ignores non-placeholders', 'somevalue$', 'somevalue$'],
	['ignores non-placeholders', 'somevalue$$', 'somevalue$$'],
	['ignores non-placeholders', 'some${value', 'some${value'],
	['ignores non-placeholders', 'some$${value', 'some$${value'],

	['ignores escaped', '$$VAR', '$VAR'],
	['ignores escaped', '$$$VAR', '$$VAR'],
	['ignores escaped', '$$$$VAR', '$$$VAR'],
	['ignores escaped', '$${VAR}', '${VAR}'],
	['ignores escaped', '$$${VAR}', '$${VAR}'],
	['ignores escaped', '$$$${VAR}', '$$${VAR}'],

	['ignores default if no braces', '$VAR-notadefault', 'value-notadefault'],
	['ignores default if no braces', '$VAR:-notadefault', 'value:-notadefault'],
	['ignores default if no braces', '$VAR?notanerror', 'value?notanerror'],
	['ignores default if no braces', '$VAR:?notanerror', 'value:?notanerror'],
	[
		'ignores default if no braces',
		'$VAR-notadefault 1_^C#$-r',
		'value-notadefault 1_^C#$-r',
	],
	[
		'ignores default if no braces',
		'$VAR:-notadefault 1_^C#$-r',
		'value:-notadefault 1_^C#$-r',
	],
	[
		'ignores default if no braces',
		'$VAR?notanerror 1_^C#$-r',
		'value?notanerror 1_^C#$-r',
	],
	[
		'ignores default if no braces',
		'$VAR:?notanerror 1_^C#$-r',
		'value:?notanerror 1_^C#$-r',
	],
	['ignores default if no braces', '$EMPTY-notadefault', '-notadefault'],
	['ignores default if no braces', '$EMPTY:-notadefault', ':-notadefault'],
	['ignores default if no braces', '$EMPTY?notanerror', '?notanerror'],
	['ignores default if no braces', '$EMPTY:?notanerror', ':?notanerror'],
	[
		'ignores default if no braces',
		'$EMPTY-notadefault 1_^C#$-r',
		'-notadefault 1_^C#$-r',
	],
	[
		'ignores default if no braces',
		'$EMPTY:-notadefault 1_^C#$-r',
		':-notadefault 1_^C#$-r',
	],
	[
		'ignores default if no braces',
		'$EMPTY?notanerror 1_^C#$-r',
		'?notanerror 1_^C#$-r',
	],
	[
		'ignores default if no braces',
		'$EMPTY:?notanerror 1_^C#$-r',
		':?notanerror 1_^C#$-r',
	],
	['ignores default if no braces', '$UNSET-notadefault', '-notadefault'],
	['ignores default if no braces', '$UNSET:-notadefault', ':-notadefault'],
	['ignores default if no braces', '$UNSET?notanerror', '?notanerror'],
	['ignores default if no braces', '$UNSET:?notanerror', ':?notanerror'],
	[
		'ignores default if no braces',
		'$UNSET-notadefault 1_^C#$-r',
		'-notadefault 1_^C#$-r',
	],
	[
		'ignores default if no braces',
		'$UNSET:-notadefault 1_^C#$-r',
		':-notadefault 1_^C#$-r',
	],
	[
		'ignores default if no braces',
		'$UNSET?notanerror 1_^C#$-r',
		'?notanerror 1_^C#$-r',
	],
	[
		'ignores default if no braces',
		'$UNSET:?notanerror 1_^C#$-r',
		':?notanerror 1_^C#$-r',
	],

	['`-` uses default if undefined', '${VAR-default}', 'value'],
	['`-` uses default if undefined', '${VAR-default 1_^C#$-r}', 'value'],
	['`-` uses default if undefined', '${EMPTY-default}', ''],
	['`-` uses default if undefined', '${EMPTY-default 1_^C#$-r}', ''],
	['`-` uses default if undefined', '${UNSET-default}', 'default'],
	[
		'`-` uses default if undefined',
		'${UNSET-default 1_^C#$-r}',
		'default 1_^C#$-r',
	],

	['`:-` uses default if undefined or empty', '${VAR:-default}', 'value'],
	[
		'`:-` uses default if undefined or empty',
		'${VAR:-default 1_^C#$-r}',
		'value',
	],
	['`:-` uses default if undefined or empty', '${EMPTY:-default}', 'default'],
	[
		'`:-` uses default if undefined or empty',
		'${EMPTY:-default 1_^C#$-r}',
		'default 1_^C#$-r',
	],
	['`:-` uses default if undefined or empty', '${UNSET:-default}', 'default'],
	[
		'`:-` uses default if undefined or empty',
		'${UNSET:-default 1_^C#$-r}',
		'default 1_^C#$-r',
	],

	['`?` throws if undefined', '${VAR?error}', 'value'],
	['`?` throws if undefined', '${VAR?error 1_^C#$-r}', 'value'],
	['`?` throws if undefined', '${EMPTY?error}', ''],
	['`?` throws if undefined', '${EMPTY?error 1_^C#$-r}', ''],
	// see `throwingCases` further below for more

	['`:?` throws if undefined or empty', '${VAR?error}', 'value'],
	['`:?` throws if undefined or empty', '${VAR?error 1_^C#$-r}', 'value'],
	// see `throwingCases` further below for more
];

const throwingCases: Array<[string, string, string]> = [
	['`?` throws if undefined', '${UNSET?error}', 'error'],
	['`?` throws if undefined', '${UNSET?error 1_^C#$-r}', 'error 1_^C#$-r'],
	['`:?` throws if undefined or empty', '${EMPTY:?error}', 'error'],
	[
		'`:?` throws if undefined or empty',
		'${EMPTY:?error 1_^C#$-r}',
		'error 1_^C#$-r',
	],
	['`:?` throws if undefined or empty', '${UNSET:?error}', 'error'],
	[
		'`:?` throws if undefined or empty',
		'${UNSET:?error 1_^C#$-r}',
		'error 1_^C#$-r',
	],
];

const testInterpolation = (kv: any, opts?: Options) => {
	return interpolate(
		kv,
		{
			VAR: 'value',
			EMPTY: '',
			NULL: null,
			UNDEFINED: undefined,
			NUMBER: 5,
		} as any, // so that we can test edge cases and runtime values
		opts,
	);
};

function makeTests(inFn: (value) => any, outFn: (result) => any) {
	for (const test of cases) {
		const [name, value, result] = test;
		it(`${name}: ${value}`, (done) => {
			expect(testInterpolation(inFn(value))).to.deep.equal(outFn(result));
			done();
		});
	}

	for (const test of throwingCases) {
		const [name, value, err] = test;
		it(`${name}: ${value}`, (done) => {
			const f = () => {
				testInterpolation(inFn(value));
			};
			expect(f).to.throw(err);
			done();
		});
	}

	const makeComplex = (n, a, b): [string, string, string] => {
		return [
			n,
			`pre$$fix${a} in$$fix${a} suf$$fix`,
			`pre$fix${b} in$fix${b} suf$fix`,
		];
	};

	for (const test of cases) {
		const [name, value, result] = makeComplex(...test);
		it(`complex: ${name}: ${value}`, (done) => {
			expect(testInterpolation(inFn(value))).to.deep.equal(outFn(result));
			done();
		});
	}
}

describe('interpolation', () => {
	describe('of strings', () => {
		makeTests(
			(val) => val,
			(res) => res,
		);
	});

	describe('of arrays of mixed content', () => {
		makeTests(
			(val) => [val, val, 5],
			(res) => [res, res, 5],
		);
	});

	describe('of plain objects of mixed content', () => {
		makeTests(
			(val) => ({ p1: val, p2: val, p3: 5 }),
			(res) => ({ p1: res, p2: res, p3: 5 }),
		);
	});

	describe('of plain objects that contain nested values', () => {
		makeTests(
			(val) => ({ p1: { p2: val, p3: [val, 5] } }),
			(res) => ({ p1: { p2: res, p3: [res, 5] } }),
		);
	});

	describe('with options', () => {
		it('should preserve escaped', () => {
			expect(
				testInterpolation('$$VAR', { preserveEscaped: true }),
			).to.deep.equal('$$VAR');
		});

		it('should preserve undefined', () => {
			expect(
				testInterpolation('$NOT_A_VAR', { preserveUndefined: true }),
			).to.deep.equal('$NOT_A_VAR');
		});
	});
});
