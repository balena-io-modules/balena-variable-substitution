import { TypedError } from 'typed-error';

export class ValueError extends TypedError {}

export class SyntaxError extends TypedError {
	constructor(message: string) {
		super(`Invalid interpolation syntax; ${message}`);
	}
}

/**
 * A map of values to keys that can be referred to by placeholders.
 */
export type Environment = { [name: string]: string };

/**
 * Placeholder syntax supports operators that control the interpolation behavior
 * when value is undefined or empty.
 *
 * The behavior is encoded into the `Operator.kind` attribute. `Operator.fallback`
 * contains either the default value or the error message and should be used
 * accordingly.
 *
 * The following operators control interpolation behavior when value is
 * `undefined`:
 *
 * - `-`: replace the placeholder with a default value.
 * - `?`: throw a `ValueError` with a message.
 *
 * The following operators control interpolation behavior when value is
 * `undefined` or the empty string `''`:
 *
 * - `:-`: replace the placeholder with a default value.
 * - `:?`: throw a `ValueError` with a message.
 */
export interface Operator {
	kind: string;
	fallback: string;
}

export interface Match {
	/**
	 * The full matched placeholder, exactly as declared.
	 */
	placeholder: string;

	/**
	 * The placeholder name; refers to a key within the given environment.
	 */
	name: string;

	/**
	 * The placeholder value in the given environment; will be `undefined` if
	 * no key with that name exists, or it exists and evaluates to `null` or
	 * `undefined`.
	 */
	value?: string;

	/**
	 * The placeholder operator, if any.
	 */
	operator?: Operator;

	/**
	 * `true` if this match is escaped and should not be processed.
	 */
	escaped: boolean;
}

export interface Options {
	/**
	 * Whether to ignore escaped placeholders and pass them through verbatim.
	 *
	 * This allows for multiple passes over the same input with different values.
	 * You will likely need to set `preserveUndefined` to `true` as well.
	 *
	 * Defaults to `false`.
	 */
	preserveEscaped?: boolean;

	/**
	 * Whether to ignore placeholders that reference keys not defined in the given
	 * environment and pass them through verbatim.
	 *
	 * This allows for multiple passes over the same input with different values.
	 * You will likely need to set `preserveEscaped` to `true` as well.
	 *
	 * Defaults to `false`.
	 */
	preserveUndefined?: boolean;

	/**
	 * A callback that will be invoked once for each placeholder.
	 */
	onMatchPlaceholder?: (match: Match) => void;
}

function noop() {
	// noop
}

type InternalOptions = Required<Options>;

const defaultOptions: InternalOptions = {
	preserveEscaped: false,
	preserveUndefined: false,
	onMatchPlaceholder: noop,
};

export type Interpolator = <T extends unknown>(obj: T) => T;

export function makeInterpolator(
	env: Environment,
	options?: Options,
): Interpolator {
	const opts: InternalOptions = {
		...defaultOptions,
		...options,
	};
	return (obj) => interpolate0(obj, env, opts);
}

export function interpolate<T extends unknown>(
	obj: T,
	env: Environment,
	options?: Options,
): T {
	return makeInterpolator(env, options)(obj);
}

function isString(a: any): a is string {
	return typeof a === 'string';
}

function isArray(a: any): a is any[] {
	return Array.isArray(a);
}

function isObject(a: any): a is { [key: string]: any } {
	return (
		a != null && typeof a === 'object' && a.toString() === '[object Object]'
	);
}

function interpolate0<T extends unknown>(
	obj: T,
	env: Environment,
	opts: InternalOptions,
): T {
	if (isString(obj)) {
		return interpolateString(obj, env, opts) as T;
	}
	if (isArray(obj)) {
		return obj.map((value) => interpolate0(value, env, opts)) as T;
	}
	if (isObject(obj)) {
		return Object.fromEntries(
			Object.entries(obj).map(([key, value]) => [
				key,
				interpolate0(value, env, opts),
			]),
		) as T;
	}
	return obj;
}

function interpolateString(
	str: string,
	env: Environment,
	opts: InternalOptions,
): string {
	// see tests for what sort of strings this regex matches against
	const regex = /(\$+)?\$(?:(\w+)|{(\w+)(?:([:\-\?]+)([^}]+))?})/g;

	return str.replace(regex, (match, ...groups: Array<string | undefined>) => {
		const [escaped, name1, name2, kind, fallback] = groups;

		if (name1 == null && name2 == null) {
			return match; // not a placeholder
		}

		const name = (name1 || name2)!; // can't be both null
		const rawValue = env[name] == null ? undefined : env[name]; // normalize null/undefined
		const value = (rawValue || '').toString(); // force string for substitute

		const isUndefined = rawValue == null;
		const isEmpty = value === '';
		const isEscaped = escaped != null;

		let operator: Operator | undefined;
		if (kind != null) {
			if (fallback == null) {
				throw new SyntaxError(`fallback not specified: '${match}'`);
			}
			operator = { kind, fallback };
		}

		opts.onMatchPlaceholder({
			placeholder: match,
			name,
			value: rawValue,
			operator,
			escaped: isEscaped,
		});

		if (isEscaped) {
			if (opts.preserveEscaped) {
				return match;
			}
			return match.substring(1);
		}

		if (isUndefined && opts.preserveUndefined) {
			return match;
		}

		if (operator == null) {
			return value;
		}

		switch (operator.kind) {
			case '-':
				if (isUndefined) {
					return operator.fallback;
				}
				return value;

			case '?':
				if (isUndefined) {
					throw new ValueError(operator.fallback);
				}
				return value;

			case ':-':
				if (isUndefined || isEmpty) {
					return operator.fallback;
				}
				return value;

			case ':?':
				if (isUndefined || isEmpty) {
					throw new ValueError(operator.fallback);
				}
				return value;

			default:
				throw new SyntaxError(`unknown operator: '${operator.kind}'`);
		}
	});
}
