/* @flow */

import _ from 'underscore'
import invariant from 'invariant'

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

export class Length {
  value: number;
  unit: Unit;

  constructor(value: number, unit: Unit) {
    this.value = value;
    this.unit = unit;
  }

  clone(): Length {
    return new Length(this.value, this.unit);
  }

  toString(): string {
    return this.value.toString() + this.unit.toString();
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
export class UnknownLength {
  clone(): UnknownLength {
    throw new Error('NYI');
  }

  toString(): string {
    return 'unknown';
  }
}

export class Operation {
  operator: string;
  prefix: ?string;

  constructor(operator: string, prefix: ?string = null) {
    this.operator = operator;
    this.prefix = prefix;
  }

  static ADD: Operation;
  static SUBTRACT: Operation;
  static MULTIPLY: Operation;
  static DIVIDE: Operation;
  static MAX: Operation;
  static MIN: Operation;
}

Operation.ADD = new Operation('+');
Operation.SUBTRACT = new Operation('-');
Operation.MULTIPLY = new Operation('*');
Operation.DIVIDE = new Operation('/');
Operation.MAX = new Operation(',', 'max');
Operation.MIN = new Operation(',', 'min');

export class DependentOperand {
  operation: Operation;
  operands: Constraint[];

  constructor(operation: Operation, operands: Constraint[]) {
    this.operation = operation;
    this.operands = operands;
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
    var index = this.operands.indexOf(oldOperand);
    invariant(index !== -1, 'Old operand not found');

    var clone = this.clone();
    this.clone.operands[index] = newOperand;
    return clone;
  }

  toString(): string {
    var str = this.operands.map(
      operand => {
        if (operand instanceof DependentOperand && operand.prefix == null) {
          return `(${operand.toString()})`;
        }
        return operand.toString();
      }
    ).join(this.operation.operator);

    if (this.operation.prefix) {
      str = `${this.operation.prefix}(${str})`;
    }

    return str;
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

export function constraintDirectlyDependsOn(constraint: Constraint, dependent: Constraint): bool {
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

export function constraintDependsOn(constraint: Constraint, dependent: Constraint): bool {
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
  return constraint.operands.some((operand) => constraintDependsOn(operand, dependent));
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


export class Box {
  _layout: Layout;
  _mutableLayout: MutableLayout;

  // Layout
  _w: ?Constraint;
  _h: ?Constraint;
  _x: ?Constraint;
  _y: ?Constraint;

  // Non-layout
  style: Style;

  constructor() {
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

    this.setW(this._w);
    this.setH(this._h);
    this.setX(this._x);
    this.setY(this._y);
  }

  getLayout(): Layout {
    return this._layout;
  }

  getConstraints(): Constraint[] {
    var constraints: Constraint[] = [];
    if (this._w) {
      constraints.push(this._w);
    }
    if (this._h) {
      constraints.push(this._h);
    }
    if (this._x) {
      constraints.push(this._x);
    }
    if (this._y) {
      constraints.push(this._y);
    }
    return constraints;
  }

  getW(): ?Constraint {
    return this._w;
  }

  getH(): ?Constraint {
    return this._h;
  }

  getX(): ?Constraint {
    return this._x;
  }

  getY(): ?Constraint {
    return this._y;
  }

  setW(w: ?Constraint): self {
    if (this._w) {
      this._layout.replaceConstraint(this._w, w);
    } else if (w) {
      this._mutableLayout.addProperty({
        box: this,
        w: w,
      });
    }
    this._w = w;
    return this;
  }

  setH(h: ?Constraint): self {
    if (this._h) {
      this._layout.replaceConstraint(this._h, h);
    } else if (h) {
      this._mutableLayout.addProperty({
        box: this,
        h: h,
      });
    }
    this._h = h;
    return this;
  }

  setX(x: ?Constraint): self {
    if (this._x) {
      this._layout.replaceConstraint(this._x, x);
    } else if (x) {
      this._mutableLayout.addProperty({
        box: this,
        x: x,
      });
    }
    this._x = x;
    return this;
  }

  setY(y: ?Constraint): self {
    if (this._y) {
      this._layout.replaceConstraint(this._y, y);
    } else if (y) {
      this._mutableLayout.addProperty({
        box: this,
        y: y,
      });
    }
    this._y = y;
    return this;
  }

  constraintsToString(): string {
    var w = constraintToString(this._w);
    var h = constraintToString(this._h);
    var x = constraintToString(this._x);
    var y = constraintToString(this._y);
    return `w: ${w}, h: ${h}, x: ${x}, y: ${y}`;
  }

  toString(): string {
    return `box (${this.constraintsToString()})`;
  }
}

export type Property =
  { box: Box, w: Constraint, } |
  { box: Box, h: Constraint, } |
  { box: Box, x: Constraint, } |
  { box: Box, y: Constraint, }

export function getPropertyConstraint(prop: Property): Constraint {
  if (prop.w) {
    return prop.w;
  }
  if (prop.h) {
    return prop.h;
  }
  if (prop.x) {
    return prop.x;
  }
  if (prop.y) {
    return prop.y;
  }
  invariant(false, 'flow');
}

function clonePropertyWithNewConstraint(
  prop: Property,
  constraint: Constraint
): Property {
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
  invariant(false, 'flow');
}

type MutableLayout = {
  addProperty: (prop: Property) => void,
  replaceConstraint: (oldConstraint: Constraint, newConstraint: ?Constraint) => void,
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
        replaceConstraint: this.replaceConstraint.bind(this)
      }
    );
    this._boxes.push(box);
  }

  removeBox(box: Box) {
    var index = this._boxes.indexOf(box);
    invariant(index !== -1, 'Box already not in layout');

    this.getPropertiesForBox(box).forEach(
      prop =>
        invariant(
          this.getPropertiesDirectlyDependentOn(
            getPropertyConstraint(prop)
          ).length === 0,
          'Other props depend on this box\'s props'
        )
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
      prop => constraintDirectlyDependsOn(getPropertyConstraint(prop), constraint)
    );
  }

  toString(): string {
    return this._boxes.map(box => box.toString()).join('\n');
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
      prop =>
        prop.box.getW() === constraint ||
        prop.box.getH() === constraint ||
        prop.box.getX() === constraint ||
        prop.box.getY() === constraint
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
            dependentConstraint.cloneAndReplaceOperand(oldConstraint, newConstraint)
          )
        }
      );
    }

    this._removeConstraint(oldConstraint);
  }
}
