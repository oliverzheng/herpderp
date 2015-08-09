/* @flow */

import {
  Box,
  Constraint,
  DependentOperand,
  DependentOperandReplacement,
  Layout,
  cloneConstraint,
  getPropertyConstraint,
} from './layoutIntent';
import nullthrows from './nullthrows';
import invariant from 'invariant';
import {Repr} from './repr';

export type ComponentReplacement = {
  component: ?Component,
  boxesToReplace: Box[],
}

export type Pattern = (box: Box) => ?ComponentReplacement

export class Patterns {

  static hasBackground(box: Box): ?ComponentReplacement {
    if (box.style.background != null) {
      return {
        component: Component.cloneFromBox(box),
        boxesToReplace: [box],
      };
    }
    return null;
  }

  static isImage(box: Box): ?ComponentReplacement {
    if (box.style.image != null) {
      return {
        component: Component.cloneFromBox(box),
        boxesToReplace: [box],
      };
    }
    return null;
  }

  static uselessBox(box: Box): ?ComponentReplacement {
    var layout = box.getLayout();
    var props = layout.getPropertiesForBox(box);
    var hasDependentProps = props.some(
      prop =>
        layout.getPropertiesDirectlyDependentOn(
          getPropertyConstraint(prop)
        ).length > 0
    );
    if (hasDependentProps) {
      return null;
    }

    return {
      component: null,
      boxesToReplace: [box],
    };
  }

  static allPatterns: Pattern[];
}

Patterns.allPatterns = [
  Patterns.hasBackground,
  Patterns.isImage,
  Patterns.uselessBox,
];

export class Component extends Box {
  _childrenLayout: Layout;

  constructor() {
    super();
    this._childrenLayout = new Layout();
  }

  getChildrenLayout(): Layout {
    return this._childrenLayout;
  }

  getReplacementConstraint(
    constraint: Constraint,
    boxesToReplace: Box[]
  ): Constraint {
    // This is a really simple replacement. If any of the operands depend on any
    // properties of this component, then swap it out. This won't work for
    // slightly more complicated dependencies, like it depends on the prop of
    // a box among a bunch of boxes that this component replaced.
    if (boxesToReplace.length !== 1) {
      throw new Error('NYI');
    }
    var box = boxesToReplace[0];

    invariant(
      constraint instanceof DependentOperand,
      'Why else are you replacing this'
    );

    var replacementConstraints: DependentOperandReplacement[] = [];

    constraint.operands.forEach(operand => {
      var prop = this.getLayout().getPropertyForConstraint(operand);
      if (!prop || prop.box !== box) {
        return;
      }

      if (box.getX() === operand) {
        replacementConstraints.push({
          oldOperand: operand,
          newOperand: nullthrows(this.getX()),
        });
      } else if (box.getY() === operand) {
        replacementConstraints.push({
          oldOperand: operand,
          newOperand: nullthrows(this.getY()),
        });
      } else if (box.getW() === operand) {
        replacementConstraints.push({
          oldOperand: operand,
          newOperand: nullthrows(this.getW()),
        });
      } else if (box.getH() === operand) {
        replacementConstraints.push({
          oldOperand: operand,
          newOperand: nullthrows(this.getH()),
        });
      }
    });

    return constraint.cloneAndReplaceOperands(replacementConstraints);
  }

  toRepr(): Repr {
    return {
      self: `component#${this.getID()} (${this.constraintsToString()})`,
      children: [
        this._childrenLayout.toRepr(),
      ],
    };
  }

  static cloneFromBox(box: Box): Component {
    var component = new Component();
    box.getLayout().addBox(component);

    var x = box.getX();
    if (x) {
      component.setX(cloneConstraint(x));
    }

    var y = box.getY();
    if (y) {
      component.setY(cloneConstraint(y));
    }

    var w = box.getW();
    if (w) {
      component.setW(cloneConstraint(w));
    }

    var h = box.getH();
    if (h) {
      component.setH(cloneConstraint(h));
    }

    return component;
  }

}

/* Components TODO:
 *
 * horizontal nav
 * vertical nav
 * image
 * alignment
 * border
 * left-right, where one of them is fixed width
 * float clear (next element's y position starts at the max of the 2)
 */
