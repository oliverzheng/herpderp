/* @flow */

import {
  Box,
  Constraint,
  cloneConstraint,
  getPropertyConstraint,
} from './layoutIntent';
import invariant from 'invariant';

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

  getReplacementConstraint(constraint: Constraint): Constraint {
    invariant(false, 'testing');
  }

  toString(): string {
    return `component (${this.constraintsToString()})`;
  }

  static cloneFromBox(box: Box): Component {
    var component = new Component();
    box.getLayout().addBox(component);

    var w = box.getW();
    if (w) {
      component.setW(cloneConstraint(w));
    }

    var h = box.getH();
    if (h) {
      component.setH(cloneConstraint(h));
    }

    var x = box.getX();
    if (x) {
      component.setX(cloneConstraint(x));
    }

    var y = box.getY();
    if (y) {
      component.setY(cloneConstraint(y));
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
