# balena-variable-substitution

Tiny, shell-like, template syntax for variable substitution in strings.

## Examples

```typescript
import { interpolate } from '@balena/variable-substitution';

const values = {
  VAR: 'value',
  EMPTY: '',
};

interpolate('$VAR', values); // => 'value'
interpolate('${VAR}', values); // => 'value'

interpolate('$EMPTY', values); // => ''
interpolate('$UNSET', values); // => ''

interpolate('${EMPTY-default}', values); // => ''
interpolate('${EMPTY:-default}', values); // => 'default'

interpolate('${UNSET-default}', values); // => 'default'
interpolate('${UNSET:-default}', values); // => 'default'

interpolate('${EMPTY?err}', values); // => ''
interpolate('${EMPTY:?err}', values); // => throws error with message 'err'

interpolate('${UNSET?err}', values); // => throws error with message 'err'
interpolate('${UNSET:?err}', values); // => throws error with message 'err'

interpolate('$$ESCAPED', values); // => '$ESCAPED'
```

`interpolate` can also handle arrays and objects:

```typescript
import { interpolate } from '@balena/variable-substitution';

const values = {
  VAR: 'value',
  EMPTY: '',
};

interpolate(['$VAR'], values); // => ['value']
interpolate([5, ['$VAR']], values); // => [5, ['value']]

interpolate({ key: '$VAR' }, values); // => { key: 'value' }
interpolate({ key: [5, ['$VAR']] }, values); // => { key: [5, ['value']] }
```

You can specify that undefined and escaped variables should be preserved. This
is useful for performing multiple passes over the input with different sets of
values.

```typescript
import { interpolate } from '@balena/variable-substitution';

const values = {
  VAR: 'value',
  EMPTY: '',
};

interpolate('$UNSET', values, { preserveUndefined: true }); // => '$UNSET'
interpolate('${UNSET?err}', values, { preserveUndefined: true }); // => '${UNSET?err}'

interpolate('$$ESCAPED', values, , { preserveEscaped: true }); // => '$$ESCAPED'
```

You can register a callback to have invoked for each variable:

```typescript
import { interpolate } from '@balena/variable-substitution';

const values = {
  VAR: 'value',
  EMPTY: '',
};

interpolate('$VAR', values, {
  onMatchPlaceholder: (match) => console.log(match)
});
// => { placeholder: '$VAR', name: 'VAR', value: 'value', escaped: false }

interpolate('$UNSET', values, {
  onMatchPlaceholder: (match) => console.log(match)
});
// => { placeholder: '$UNSET', name: 'UNSET', escaped: false }

interpolate('${UNSET-default}', values, {
  onMatchPlaceholder: (match) => console.log(match)
});
// => { placeholder: '${UNSET-default}', name: 'UNSET', escaped: false,
// =>   operator: { kind: '-', fallback: 'default' } }
```

You can get an interpolator that is bound to a set of values and options,
pass it around and invoke it freely:

```typescript
import { makeInterpolator } from '@balena/variable-substitution';

const values = {
  VAR: 'value',
  EMPTY: '',
};
const intepolator = makeInterpolator(values, {
  onMatchPlaceholder: (match) => console.log(match)
});
interpolator('$VAR'); // => 'value'
```

## Installation

```sh
npm install --save @balena/variable-substitution
```

## License

This project is licensed under the Apache 2.0 license. See LICENSE.
