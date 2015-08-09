/* @flow */

import _ from 'underscore';
import invariant from 'invariant';
import {Repr} from './repr';

class HasUniqueID {
  _id: number;

  constructor() {
    if (this.constructor._nextID == null) {
      this.constructor._nextID = 0;
    }

    this._id = this.constructor._nextID++;
  }

  getID(): number {
    return this._id;
  }

  static _nextID: ?number;
}

export class Unit {
  _toString: string;

  constructor(toString: string) {
    this._toString = toString;
  }

  toString(): string {
    return this._toString;
  }

  static PX: Unit;
  static PCT: Unit;
}
Unit.PX = new Unit('px');
Unit.PCT = new Unit('%');

export class Length extends HasUniqueID {
  value: number;
  unit: Unit;

  constructor(value: number, unit: Unit) {
    super();
    this.value = value;
    this.unit = unit;
  }

  clone(): Length {
    return new Length(this.value, this.unit);
  }

  toString(): string {
    return (
      `${this.value.toString()}${this.unit.toString()}#${this.getID()}`
    );
  }

  static px(value: number): Length {
    return new Length(value, Unit.PX);
  }

  static pct(value: number): Length {
    return new Length(value, Unit.PCT);
  }
}

/* Unknown things in an HTML layout:
 * - Text width, height
 * - Image size
 * - Container height width as a result of text & image children
 * - Screen size
 */
export class UnknownLength extends HasUniqueID {
  clone(): UnknownLength {
    throw new Error('NYI');
  }

  toString(): string {
    return `unknown#${this.getID()}`;
  }
}

export class Operation {
  operator: string;
  prefix: ?string;

  constructor(operator: string, prefix: ?string = null) {
    this.operator = operator;
    this.prefix = prefix;
  }

  static EQUALS: Operation;
  static ADD: Operation;
  static SUBTRACT: Operation;
  static MULTIPLY: Operation;
  static DIVIDE: Operation;
  static MAX: Operation;
  static MIN: Operation;
}

Operation.EQUALS = new Operation('=');
Operation.ADD = new Operation('+');
Operation.SUBTRACT = new Operation('-');
Operation.MULTIPLY = new Operation('*');
Operation.DIVIDE = new Operation('/');
Operation.MAX = new Operation(',', 'max');
Operation.MIN = new Operation(',', 'min');

export type DependentOperandReplacement = {
  oldOperand: Constraint,
  newOperand: Constraint,
}

export class DependentOperand extends HasUniqueID {
  operation: Operation;
  operands: Constraint[];

  constructor(operation: Operation, operands: Constraint[]) {
    super();
    this.operation = operation;
    this.operands = operands;
  }

  shallowEquals(other: DependentOperand): bool {
    if (this.operation !== other.operation) {
      return false;
    }

    if (this.operands.length !== other.operands.length) {
      return false;
    }

    return this.operands.every((operand, i) => operand === other.operands[i]);
  }

  clone(): DependentOperand {
    return new DependentOperand(
      this.operation,
      this.operands.slice(0)
    );
  }

  cloneAndReplaceOperand(
    oldOperand: Constraint,
    newOperand: Constraint
  ): DependentOperand {
    return this.cloneAndReplaceOperands([{oldOperand, newOperand}]);
  }

  cloneAndReplaceOperands(
    replacements: DependentOperandReplacement[]
  ): DependentOperand {
    var clone = this.clone();
    replacements.forEach(r => {
      var index = clone.operands.indexOf(r.oldOperand);
      invariant(index !== -1, 'Old operand not found');

      clone.operands[index] = r.newOperand;
    });
    return clone;
  }

  toString(): string {
    var str = this.operands.map(
      operand => operand.toString()
    ).join(` ${this.operation.operator} `);

    return `dependent#${this.getID()}${this.operation.prefix || ''}(${str})`;
  }
}

// There should be no circular dependency
export type Constraint =
  number | Length | UnknownLength | DependentOperand;

export function isSimpleOperand(constraint: Constraint): bool {
  return (
    typeof constraint === 'number' ||
    constraint instanceof Length ||
    constraint instanceof UnknownLength
  );
}

export function cloneConstraint(constraint: Constraint): Constraint {
  if (typeof constraint === 'number') {
    // immutable
    return constraint;
  }

  return constraint.clone();
}

export function constraintDirectlyDependsOn(
  constraint: Constraint,
  dependent: Constraint
): bool {
  // Don't count it as a dependent if it's the same thing
  if (constraint === dependent) {
    return false;
  }
  if (isSimpleOperand(constraint)) {
    return false;
  }

  invariant(constraint instanceof DependentOperand, 'flow');
  return _.contains(constraint.operands, dependent);
}

export function constraintDependsOn(
  constraint: Constraint,
  dependent: Constraint
): bool {
  // Don't count it as a dependent if it's the same thing
  if (constraint === dependent) {
    return false;
  }
  if (isSimpleOperand(constraint)) {
    return false;
  }

  if (constraintDirectlyDependsOn(constraint, dependent)) {
    return true;
  }

  invariant(constraint instanceof DependentOperand, 'flow');
  return constraint.operands.some(
    (operand) => constraintDependsOn(operand, dependent)
  );
}

export function constraintToString(constraint: ?Constraint): string {
  if (constraint == null) {
    return 'null';
  }
  return constraint.toString();
}

export type Style = {
  background: ?string,
  fontSize: ?string,
  image: ?string,
}

export class Box extends HasUniqueID {
  _layout: Layout;
  _mutableLayout: MutableLayout;

  // Non-layout
  style: Style;

  constructor() {
    super();

    this.style = {
      background: null,
      fontSize: null,
      image: null,
    };
  }

  // Only layout should call this
  setLayout(
    layout: Layout,
    mutableLayout: MutableLayout
  ) {
    invariant(this._layout == null, 'Must not have a layout already');
    this._layout = layout;
    this._mutableLayout = mutableLayout;
  }

  getLayout(): Layout {
    return this._layout;
  }

  getConstraints(): Constraint[] {
    var constraints: Constraint[] = [];
    var x = this.getX();
    if (x) {
      constraints.push(x);
    }
    var y = this.getY();
    if (y) {
      constraints.push(y);
    }
    var w = this.getW();
    if (w) {
      constraints.push(w);
    }
    var h = this.getH();
    if (h) {
      constraints.push(h);
    }
    return constraints;
  }

  getX(): ?Constraint {
    var props = this._layout.getPropertiesForBox(this);
    for (var prop of props) {
      if (prop.x) {
        return prop.x;
      }
    }

    return null;
  }

  getY(): ?Constraint {
    var props = this._layout.getPropertiesForBox(this);
    for (var prop of props) {
      if (prop.y) {
        return prop.y;
      }
    }

    return null;
  }

  getW(): ?Constraint {
    var props = this._layout.getPropertiesForBox(this);
    for (var prop of props) {
      if (prop.w) {
        return prop.w;
      }
    }

    return null;
  }

  getH(): ?Constraint {
    var props = this._layout.getPropertiesForBox(this);
    for (var prop of props) {
      if (prop.h) {
        return prop.h;
      }
    }

    return null;
  }

  setW(w: ?Constraint): Box {
    var oldW = this.getW();
    if (oldW) {
      this._layout.replaceConstraint(oldW, w);
    } else if (w) {
      this._mutableLayout.addProperty({
        box: this,
        w: w,
      });
    }
    return this;
  }

  setH(h: ?Constraint): Box {
    var oldH = this.getH();
    if (oldH) {
      this._layout.replaceConstraint(oldH, h);
    } else if (h) {
      this._mutableLayout.addProperty({
        box: this,
        h: h,
      });
    }
    return this;
  }

  setX(x: ?Constraint): Box {
    var oldX = this.getX();
    if (oldX) {
      this._layout.replaceConstraint(oldX, x);
    } else if (x) {
      this._mutableLayout.addProperty({
        box: this,
        x: x,
      });
    }
    return this;
  }

  setY(y: ?Constraint): Box {
    var oldY = this.getY();
    if (oldY) {
      this._layout.replaceConstraint(oldY, y);
    } else if (y) {
      this._mutableLayout.addProperty({
        box: this,
        y: y,
      });
    }
    return this;
  }

  constraintsToString(): string {
    var x = constraintToString(this.getX());
    var y = constraintToString(this.getY());
    var w = constraintToString(this.getW());
    var h = constraintToString(this.getH());
    return `x: ${x}, y: ${y}, w: ${w}, h: ${h}`;
  }

  toRepr(): Repr {
    return {
      self: `box#${this.getID()} (${this.constraintsToString()})`,
      children: null,
    };
  }
}

export type Property =
  { box: Box, x: Constraint, } |
  { box: Box, y: Constraint, } |
  { box: Box, w: Constraint, } |
  { box: Box, h: Constraint, }

export function getPropertyConstraint(prop: Property): Constraint {
  if (prop.x) {
    return prop.x;
  }
  if (prop.y) {
    return prop.y;
  }
  if (prop.w) {
    return prop.w;
  }
  if (prop.h) {
    return prop.h;
  }
  invariant(false, 'flow');
}

function clonePropertyWithNewConstraint(
  prop: Property,
  constraint: Constraint
): Property {
  if (prop.x) {
    return {
      box: prop.box,
      x: constraint,
    };
  }
  if (prop.y) {
    return {
      box: prop.box,
      y: constraint,
    };
  }
  if (prop.w) {
    return {
      box: prop.box,
      w: constraint,
    };
  }
  if (prop.h) {
    return {
      box: prop.box,
      h: constraint,
    };
  }
  invariant(false, 'flow');
}

type MutableLayout = {
  addProperty: (prop: Property) => void,
  replaceConstraint:
    (oldConstraint: Constraint, newConstraint: ?Constraint) => void,
}

export class Layout {
  _properties: Property[];
  _boxes: Box[];

  constructor() {
    this._properties = [];
    this._boxes = [];
  }

  getBoxes(): Box[] {
    return this._boxes;
  }

  addBox(box: Box) {
    invariant(!_.contains(this._boxes, box), 'Box already in layout');
    box.setLayout(
      this,
      {
        addProperty: this._addProperty.bind(this),
        replaceConstraint: this.replaceConstraint.bind(this),
      }
    );
    this._boxes.push(box);
  }

  removeBox(box: Box) {
    var index = this._boxes.indexOf(box);
    invariant(index !== -1, 'Box already not in layout');

    this.getPropertiesForBox(box).forEach(
      prop => {
        invariant(
          this.getPropertiesDirectlyDependentOn(
            getPropertyConstraint(prop)
          ).length === 0,
          'Other props depend on this box\'s props'
        );
      }
    );

    this._boxes.splice(index, 1);
  }

  getPropertiesForBox(box: Box): Property[] {
    return this._properties.filter(prop => prop.box === box);
  }

  getPropertyForConstraint(constraint: Constraint): ?Property {
    return this._properties.find(
      prop =>
        prop.box.getW() === constraint ||
        prop.box.getH() === constraint ||
        prop.box.getX() === constraint ||
        prop.box.getY() === constraint
    );
  }

  getBoxForConstraint(constraint: Constraint): ?Box {
    var prop = this.getPropertyForConstraint(constraint);
    if (!prop) {
      return null;
    }

    return prop.box;
  }

  getPropertiesDirectlyDependentOn(constraint: Constraint): Property[] {
    return this._properties.filter(
      prop =>
        constraintDirectlyDependsOn(getPropertyConstraint(prop), constraint)
    );
  }

  toRepr(): Repr {
    return {
      self: null,
      children: this._boxes.map(box => box.toRepr()),
    };
  }

  _addProperty(prop: Property) {
    // TODO don't keep track of numbers

    invariant(_.contains(this._boxes, prop.box), 'Box for prop not in layout');

    var constraint = getPropertyConstraint(prop);
    invariant(
      this.getPropertyForConstraint(constraint) == null,
      'Constraint already exists in layout'
    );

    this._properties.push(prop);
  }

  _removeConstraint(constraint: Constraint) {
    var index = this._properties.findIndex(
      prop => getPropertyConstraint(prop) === constraint
    );
    invariant(index !== -1, 'Constraint not in layout for removal');

    this._properties.splice(index, 1);
  }

  replaceConstraint(oldConstraint: Constraint, newConstraint: ?Constraint) {
    // TODO make replacement of numbers work

    var dependentProps = this.getPropertiesDirectlyDependentOn(oldConstraint);
    if (dependentProps.length !== 0) {
      invariant(
        newConstraint != null,
        'Must have constraint since there are dependent constraints'
      );
    }

    // Don't use _addProperty, since that checks to make sure a box doesn't have
    // more than 1 constraint for the same property.
    var oldProp = this._properties.find(
      prop => getPropertyConstraint(prop) === oldConstraint
    );
    invariant(oldProp != null, 'Constraint must be in layout already');

    if (newConstraint) {
      var newProp = clonePropertyWithNewConstraint(oldProp, newConstraint);

      // Add the new property into our graph. At this point, the old one still
      // exists. We'll clone the whole tree before deleting anything.
      this._properties.push(newProp);

      dependentProps.forEach(
        prop => {
          var dependentConstraint = getPropertyConstraint(prop);
          invariant(dependentConstraint instanceof DependentOperand, 'flow');
          invariant(newConstraint, 'flow');
          this.replaceConstraint(
            dependentConstraint,
            dependentConstraint.cloneAndReplaceOperand(
              oldConstraint,
              newConstraint
            )
          );
        }
      );
    }

    this._removeConstraint(oldConstraint);
  }
}
