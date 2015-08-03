/* @flow */

import invariant from 'invariant';

export default function nullthrows<T>(arg: ?T): T {
  invariant(arg != null, 'Null error');
  return arg;
}
