/* @flow */

export type Repr = {
  self: ?string;
  children: ?Repr[];
}

type FlattenedRepr = {
  str: string;
  level: number;
}

function flattenRepr(repr: Repr): FlattenedRepr[] {
  var flattened: FlattenedRepr[] = [];
  if (repr.self) {
    flattened.push(
      {
        str: repr.self,
        level: 0,
      }
    );
  }
  if (repr.children) {
    repr.children.forEach(child => {
      var children = flattenRepr(child);
      if (repr.self) {
        // Only indent if this repr has a node for itself. Otherwise, collapse
        // to the next hierarchy.
        children.forEach(flat => flat.level++);
      }
      flattened.push(...children);
    });
  }

  return flattened;
}

export function reprToString(repr: Repr): string {
  var flattened = flattenRepr(repr);
  return flattened.map(
    flat => (new Array(flat.level + 2)).join('-') + ' ' + flat.str
  ).join('\n');
}
